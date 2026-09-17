import { createClient } from '@supabase/supabase-js';
import { webcrypto } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const env = process.env;
    const body = req.body;
    
    const {
      txnid,
      status,
      hash,
      amount,
      mihpayid,
      email = '',
      firstname = '',
      productinfo = '',
      key
    } = body;

    if (!txnid || !status || !hash || !amount) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const salt = env.PAYU_SALT;
    const keyId = env.PAYU_MERCHANT_KEY;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!salt || !keyId || !supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Reverse hash formula: SALT|status|||||||||||email|firstname|productinfo|amount|txnid|key
    const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${keyId}`;
    
    const encoder = new TextEncoder();
    const hashBuffer = await webcrypto.subtle.digest('SHA-512', encoder.encode(hashString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== hash) {
      return res.status(400).json({ error: 'Invalid payment signature. Payment rejected.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', txnid)
      .single();

    if (orderFetchError || !dbOrder) {
      return res.status(404).json({ error: 'Order not found in system' });
    }

    if (dbOrder.status === 'verified') {
      return res.redirect(302, '/?payment_success=true');
    }

    if (status !== 'success') {
      return res.redirect(302, '/?payment_failed=true');
    }

    const actualAmount = parseFloat(amount);
    const slotId = dbOrder.slot_id;

    const { data: existingSlot, error: fetchError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (fetchError || !existingSlot) {
      return res.status(404).json({ error: 'Slot not found.' });
    }


    
    if (existingSlot.status === 'live' && existingSlot.size === 'micro') {
       return res.status(400).json({ error: 'This fixed-price slot has already been purchased.' });
    }

    if (existingSlot.status === 'live') {
       let minOutbid = existingSlot.current_bid;
       if (existingSlot.size === 'big') {
         minOutbid = Math.ceil(existingSlot.current_bid * 1.10);
       } else if (existingSlot.size === 'small') {
         minOutbid = existingSlot.current_bid + 100;
       }
       
       if (minOutbid <= existingSlot.current_bid) {
         minOutbid = existingSlot.current_bid + 100;
       }

       if (actualAmount < minOutbid) {
         return res.status(400).json({ error: `Bid too low. Minimum required is ${minOutbid / 100} INR.` });
       }
    } else {
       if (actualAmount < existingSlot.current_bid) {
         return res.status(400).json({ error: 'Bid amount is below the starting price.' });
       }
    }

    const userData = dbOrder.user_data ? JSON.parse(dbOrder.user_data) : {};
    
    const { data: updatedSlot, error: updateError } = await supabase
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

    if (updateError || !updatedSlot || updatedSlot.length === 0) {
      return res.status(409).json({ error: 'Slot update failed. Someone may have placed a higher bid simultaneously.' });
    }

    await supabase
      .from('orders')
      .update({ status: 'verified' })
      .eq('razorpay_order_id', txnid);

    return res.redirect(302, '/?payment_success=true');

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error during verification' });
  }
}
