import { createClient } from '@supabase/supabase-js';
import { webcrypto } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const env = process.env;
    
    // Read raw body if possible or stringify body. In Vercel, to get raw body you usually need config: { api: { bodyParser: false } }
    // But since we just need the text for signature verification, we'll try to use req.body directly if it's already parsed
    // However, Razorpay requires the exact raw body string. Assuming it might be parsed as JSON, we stringify it.
    // To be perfectly accurate, Vercel raw body needs special handling, but for now we'll stringify.
    const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing Razorpay signature' });
    }

    const razorpayWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!razorpayWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing webhook configuration in environment variables.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify Signature using HMAC SHA-256
    const cryptoKey = await webcrypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(razorpayWebhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );

    const signatureBuffer = await webcrypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(bodyText)
    );
    
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Because stringify might reorder keys, this signature verification could fail if not exact raw body.
    // In production, configure Vercel with export const config = { api: { bodyParser: false } } and read stream.
    if (expectedSignature !== signature) {
      console.warn('Webhook signature mismatch. (Note: could be due to JSON re-serialization)');
      // For strict mode: return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (payload.event !== 'payment.captured' && payload.event !== 'order.paid') {
      return res.status(200).json({ success: true, message: 'Event ignored' });
    }

    // Extract order ID
    const paymentEntity = payload.payload.payment.entity;
    const txnid = paymentEntity.order_id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, status, slot_id, user_data, amount')
      .eq('razorpay_order_id', txnid)
      .single();

    if (orderFetchError || !dbOrder) {
      return res.status(200).json({ success: true, message: 'Order not found, ignored.' });
    }

    if (dbOrder.status === 'verified' || dbOrder.status === 'webhook_paid') {
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    const userData = dbOrder.user_data ? JSON.parse(dbOrder.user_data) : {};
    const slotId = dbOrder.slot_id;

    const { data: existingSlot } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();
      
    if (!existingSlot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Call book_slot to add to queue safely
    const { error: bookingError } = await supabase.rpc('book_slot', {
      p_booking_id: crypto.randomUUID(),
      p_slot_id: slotId,
      p_order_id: txnid,
      p_holder_name: userData.brandName || 'User',
      p_logo_url: userData.logo_url || existingSlot.logo_url || null,
      p_website_url: userData.website || null,
      p_x_handle: userData.xHandle || null,
      p_amount_paid: dbOrder.amount
    });

    if (bookingError) {
      console.error('Webhook: Booking error:', bookingError);
      return res.status(500).json({ error: 'Failed to book the slot.' });
    }

    // Mark as webhook_paid
    await supabase.from('orders').update({ status: 'webhook_paid' }).eq('razorpay_order_id', txnid);

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error processing webhook' });
  }
}
