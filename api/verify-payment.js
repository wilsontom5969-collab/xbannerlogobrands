import { createClient } from '@supabase/supabase-js';
import { webcrypto } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const env = process.env;
    
    // Parse JSON body
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const razorpayKeySecret = env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!razorpayKeySecret || !supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify Razorpay Signature
    // HMAC SHA-256 of "razorpay_order_id|razorpay_payment_id" using RAZORPAY_KEY_SECRET
    const cryptoKey = await webcrypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(razorpayKeySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );

    const dataToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signatureBuffer = await webcrypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(dataToSign)
    );
    
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature. Payment rejected.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (orderFetchError || !dbOrder) {
      return res.status(404).json({ error: 'Order not found in system' });
    }

    if (dbOrder.status === 'verified') {
      return res.status(200).json({ success: true, message: 'Already verified' });
    }

    const actualAmount = dbOrder.amount;
    const slotId = dbOrder.slot_id;

    const { data: existingSlot, error: fetchError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (fetchError || !existingSlot) {
      return res.status(404).json({ error: 'Slot not found.' });
    }

    const userData = dbOrder.user_data ? JSON.parse(dbOrder.user_data) : {};
    
    // Call the PostgreSQL function to safely book the slot in the queue
    const { data: bookingResult, error: bookingError } = await supabase.rpc('book_slot', {
      p_booking_id: crypto.randomUUID(),
      p_slot_id: slotId,
      p_order_id: razorpay_order_id,
      p_holder_name: userData.brandName || 'User',
      p_logo_url: userData.logo_url || existingSlot.logo_url || null,
      p_website_url: userData.website || null,
      p_x_handle: userData.xHandle || null,
      p_amount_paid: actualAmount
    });

    if (bookingError) {
      console.error('Booking error:', bookingError);
      return res.status(500).json({ error: 'Failed to book the slot. Please contact support.' });
    }

    // Also update the slot status to live (for backward compatibility if needed)
    await supabase.from('slots').update({
      status: 'live',
      holder_name: userData.brandName || 'User',
      website_url: userData.website || null,
      x_handle: userData.xHandle || null,
      logo_url: userData.logo_url || existingSlot.logo_url || null
    }).eq('id', slotId);

    await supabase
      .from('orders')
      .update({ status: 'verified' })
      .eq('razorpay_order_id', razorpay_order_id);

    return res.status(200).json({ success: true, message: 'Payment verified successfully.' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error during verification' });
  }
}
