import { createClient } from '@supabase/supabase-js';

// Helper to determine image type from magic bytes
function getMimeTypeFromBuffer(buffer) {
  if (buffer.length < 4) return null;
  const header = buffer.slice(0, 4);
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return 'image/png';
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return 'image/jpeg';
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) return 'image/gif';
  return null;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { slotId, amount, brandName, website, xHandle, logoBase64 } = body;

    if (!slotId || !amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid slot ID or bid amount' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const keyId = env.PAYU_MERCHANT_KEY;
    const keySecret = env.PAYU_SALT;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Payment gateway configuration error');
      return new Response(JSON.stringify({ error: 'Payment gateway configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Calculate Fixed Price based on slot size securely
    const { data: slot, error: slotError } = await supabase.from('slots').select('*').eq('id', slotId).single();
    if (slotError || !slot) return new Response(JSON.stringify({ error: 'Slot not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    let fixedPrice = 0;
    if (slot.size === 'big') {
      fixedPrice = 1999900; // ₹19,999
    } else if (slot.size === 'small') {
      fixedPrice = 699900; // ₹6,999
    } else if (slot.size === 'micro') {
      fixedPrice = 299900; // ₹2,999
    } else {
      return new Response(JSON.stringify({ error: 'Invalid slot size' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const finalAmount = fixedPrice;

    // 2. Upload Logo securely
    let uploadedLogoUrl = null;
    if (logoBase64) {
      try {
        const buffer = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0));
        if (buffer.length > 2.8 * 1024 * 1024) return new Response(JSON.stringify({ error: 'Logo size exceeds 2MB limit' }), { status: 413, headers: { 'Content-Type': 'application/json' } });

        const actualMime = getMimeTypeFromBuffer(buffer);
        if (!actualMime) return new Response(JSON.stringify({ error: 'Invalid image format. Only PNG, JPG, GIF allowed.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

        const fileExt = actualMime.split('/')[1];
        const fileName = `${slotId}-pending-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, buffer, { contentType: actualMime, upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
        uploadedLogoUrl = publicUrl;
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Image processing or upload failed.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 3. Create PayU Transaction ID and Hash
    const txnid = 'txn_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const productinfo = `Slot_${slotId}`;
    const firstname = brandName || 'User';
    const email = 'customer@letthebannercook.com'; 
    
    // PayU Hash Formula: sha512(key|txnid|amount|productinfo|firstname|email|||||||||||SALT)
    const hashString = `${keyId}|${txnid}|${finalAmount}|${productinfo}|${firstname}|${email}|||||||||||${keySecret}`;
    
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-512', encoder.encode(hashString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const orderData = {
      id: txnid,
      amount: finalAmount
    };

    // 4. Save order and user_data securely
    const userData = JSON.stringify({ brandName, website, xHandle, logo_url: uploadedLogoUrl });
    const { error: insertError } = await supabase
      .from('orders')
      .insert({
        id: crypto.randomUUID(),
        razorpay_order_id: orderData.id,
        amount: orderData.amount,
        status: 'created',
        slot_id: slotId,
        user_data: userData
      });

    if (insertError) {
      console.error('Error saving order to Supabase:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to register order securely' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      order_id: orderData.id,
      amount: orderData.amount,
      hash: hash,
      key: keyId,
      productinfo,
      firstname,
      email
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error processing order:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
