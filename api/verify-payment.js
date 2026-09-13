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
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      slotId,
      brandName,
      website,
      xHandle,
      logoBase64,
      logoMime
    } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !slotId) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    if (logoBase64 && logoBase64.length > 2.8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Logo size exceeds 2MB limit' });
    }

    const secret = env.RAZORPAY_KEY_SECRET;
    const keyId = env.RAZORPAY_KEY_ID;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !keyId || !supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await webcrypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await webcrypto.subtle.sign('HMAC', cryptoKey, encoder.encode(text));
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
      return res.status(400).json({ error: 'This payment has already been processed.' });
    }

    const auth = btoa(`${keyId}:${secret}`);
    const razorpayResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'User-Agent': 'Node-Fetch/1.0'
      }
    });

    if (!razorpayResponse.ok) {
      return res.status(500).json({ error: 'Failed to verify order with Razorpay' });
    }

    const rzpOrder = await razorpayResponse.json();

    if (!rzpOrder.receipt.startsWith(`slot_${slotId}_`)) {
      return res.status(400).json({ error: 'Payment slot mismatch detected' });
    }

    if (rzpOrder.status !== 'paid') {
      return res.status(400).json({ error: 'Order is not in paid status' });
    }

    const actualAmount = rzpOrder.amount;

    const { data: existingSlot, error: fetchError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (fetchError || !existingSlot) {
      return res.status(404).json({ error: 'Slot not found.' });
    }

    if (existingSlot.status === 'live' && slotId === 'big-3') {
       return res.status(400).json({ error: 'This slot is permanently locked.' });
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

    let uploadedLogoUrl = null;
    if (logoBase64 && logoMime) {
      try {
        const buffer = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0));
        const fileExt = logoMime.split('/')[1] || 'png';
        const fileName = `${slotId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, buffer, { contentType: logoMime, upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
        uploadedLogoUrl = publicUrl;
      } catch (err) {
        return res.status(500).json({ error: 'Invalid image format or upload failed.' });
      }
    }
    
    const { data: updatedSlot, error: updateError } = await supabase
      .from('slots')
      .update({
        status: 'live',
        holder_name: brandName,
        website_url: website,
        x_handle: xHandle || null,
        current_bid: actualAmount,
        logo_url: uploadedLogoUrl || existingSlot.logo_url || null
      })
      .eq('id', slotId)
      .lte('current_bid', actualAmount)
      .select();

    if (updateError || !updatedSlot || updatedSlot.length === 0) {
      return res.status(409).json({ error: 'Slot update failed. Someone may have placed a higher bid simultaneously.' });
    }

    await supabase
      .from('orders')
      .update({ status: 'verified', user_data: JSON.stringify({ brandName, website, xHandle }) })
      .eq('razorpay_order_id', razorpay_order_id);

    return res.status(200).json({ success: true, message: 'Payment verified securely!' });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error during verification' });
  }
}
