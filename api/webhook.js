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

      const razorpay_event_id = req.headers['x-razorpay-event-id'];

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Check current order status
      const { data: dbOrder, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, status, slot_id, user_data, amount')
        .eq('razorpay_order_id', razorpay_order_id)
        .single();

      if (orderFetchError || !dbOrder) {
        // Order not found. Might be from a different environment, ignore.
        return res.status(200).json({ success: true, message: 'Order not found, ignored.' });
      }

      // Check Idempotency by Event ID or order status
      const { data: duplicateEvent } = await supabase
        .from('orders')
        .select('id')
        .eq('webhook_event_id', razorpay_event_id)
        .single();
        
      if (duplicateEvent || dbOrder.status === 'verified' || dbOrder.status === 'webhook_paid') {
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      const userData = dbOrder.user_data ? JSON.parse(dbOrder.user_data) : {};
      const slotId = dbOrder.slot_id;
      const actualAmount = dbOrder.amount;

      // 1. Get current slot data
      const { data: existingSlot } = await supabase
        .from('slots')
        .select('*')
        .eq('id', slotId)
        .single();
        
      if (!existingSlot) {
        return res.status(404).json({ error: 'Slot not found' });
      }

      // 2. Perform secure atomic slot update
      const { data: updatedSlot, error: slotUpdateError } = await supabase
        .from('slots')
        .update({
          status: 'live',
          holder_name: userData.brandName,
          website_url: userData.website,
          x_handle: userData.xHandle || null,
          current_bid: actualAmount,
          logo_url: userData.logo_url || existingSlot.logo_url || null
        })
        .eq('id', slotId)
        .lte('current_bid', actualAmount)
        .select();

      if (slotUpdateError || !updatedSlot || updatedSlot.length === 0) {
        console.error('Webhook: Slot update failed (possibly outbid concurrently)');
      }

      // 3. Update the order status to webhook_paid and log event ID
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'webhook_paid', webhook_event_id: razorpay_event_id })
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
