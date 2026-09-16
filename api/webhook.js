import { createClient } from '@supabase/supabase-js';
import { webcrypto } from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const env = process.env;
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing webhook configuration in environment variables.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature' });
    }

    // Read raw body for signature verification
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');

    // Verify Signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const cryptoKey = await webcrypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await webcrypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody));
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody);
    
    // Process the event
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const orderData = event.payload.payment?.entity || event.payload.order?.entity;
      const razorpay_order_id = orderData?.order_id;

      if (!razorpay_order_id) {
        return res.status(400).json({ error: 'Order ID not found in payload' });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Check current order status
      const { data: dbOrder, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('razorpay_order_id', razorpay_order_id)
        .single();

      if (orderFetchError || !dbOrder) {
        // Order not found. Might be from a different environment, ignore.
        return res.status(200).json({ success: true, message: 'Order not found, ignored.' });
      }

      // Idempotency: Ignore if already handled by verify-payment or previous webhook
      if (dbOrder.status === 'verified' || dbOrder.status === 'webhook_paid') {
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      // Update the order status to webhook_paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'webhook_paid' })
        .eq('razorpay_order_id', razorpay_order_id);

      if (updateError) {
        console.error('Webhook: Failed to update order status:', updateError);
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    }

    // Ignore other events
    return res.status(200).json({ success: true, message: 'Event ignored' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error processing webhook' });
  }
}
