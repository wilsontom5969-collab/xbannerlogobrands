import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const env = process.env;
    const body = await request.json();
    
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

    // 1. Strict Request Validation
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !slotId) {
      return new Response(JSON.stringify({ error: 'Missing payment details' }), { status: 400 });
    }

    // Protect against massive payloads (limit Base64 to roughly 2MB -> ~2.8MB in base64 string length)
    if (logoBase64 && logoBase64.length > 2.8 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Logo size exceeds 2MB limit' }), { status: 413 });
    }

    const secret = env.RAZORPAY_KEY_SECRET;
    const keyId = env.RAZORPAY_KEY_ID;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !keyId || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    // 2. Verify HMAC Signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(text));
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch');
      return new Response(JSON.stringify({ error: 'Invalid payment signature. Payment rejected.' }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Replay Protection (Idempotency)
    const { data: dbOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (orderFetchError || !dbOrder) {
      console.error('Order not found in DB:', orderFetchError);
      return new Response(JSON.stringify({ error: 'Order not found in system' }), { status: 404 });
    }

    if (dbOrder.status === 'verified') {
      return new Response(JSON.stringify({ error: 'This payment has already been processed.' }), { status: 400 });
    }

    // 4. Server-Side Razorpay Order Fetch
    const auth = btoa(`${keyId}:${secret}`);
    const razorpayResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!razorpayResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to verify order with Razorpay' }), { status: 500 });
    }

    const rzpOrder = await razorpayResponse.json();

    // 5. Order ↔ Slot Binding Verification
    if (!rzpOrder.receipt.startsWith(`slot_${slotId}_`)) {
      console.error(`Slot mismatch: Order receipt ${rzpOrder.receipt} does not match requested slot ${slotId}`);
      return new Response(JSON.stringify({ error: 'Payment slot mismatch detected' }), { status: 400 });
    }

    if (rzpOrder.status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Order is not in paid status' }), { status: 400 });
    }

    const actualAmount = rzpOrder.amount; // The authoritative bid amount

    // 6. Slot Logic & Minimum Outbid Enforcement
    const { data: existingSlot, error: fetchError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (fetchError || !existingSlot) {
      return new Response(JSON.stringify({ error: 'Slot not found.' }), { status: 404 });
    }

    if (existingSlot.status === 'live' && slotId === 'big-3') {
       return new Response(JSON.stringify({ error: 'This slot is permanently locked.' }), { status: 400 });
    }
    
    if (existingSlot.status === 'live' && existingSlot.size === 'micro') {
       return new Response(JSON.stringify({ error: 'This fixed-price slot has already been purchased.' }), { status: 400 });
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
         return new Response(JSON.stringify({ error: `Bid too low. Minimum required is ${minOutbid / 100} INR.` }), { status: 400 });
       }
    } else {
       // Slot is available
       if (actualAmount < existingSlot.current_bid) {
         return new Response(JSON.stringify({ error: 'Bid amount is below the starting price.' }), { status: 400 });
       }
    }

    // 7. Upload Logo (if provided)
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
        console.error('Logo upload error:', err);
        return new Response(JSON.stringify({ error: 'Invalid image format or upload failed.' }), { status: 500 });
      }
    }
    
    // 8. Atomic Database Update (Race condition prevention)
    // We only update if the current bid is strictly less than or equal to our authoritative amount
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
      console.error('Atomic update failed. Race condition or error:', updateError);
      return new Response(JSON.stringify({ error: 'Slot update failed. Someone may have placed a higher bid simultaneously.' }), { status: 409 });
    }

    // 9. Mark Order as Verified (Commit Idempotency)
    await supabase
      .from('orders')
      .update({ status: 'verified', user_data: JSON.stringify({ brandName, website, xHandle }) })
      .eq('razorpay_order_id', razorpay_order_id);

    return new Response(JSON.stringify({ success: true, message: 'Payment verified securely!' }), { status: 200 });

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error during verification' }), { status: 500 });
  }
}
