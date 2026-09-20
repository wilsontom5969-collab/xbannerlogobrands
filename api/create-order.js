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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const env = process.env;
    const { slotId, amount, brandName, website, xHandle, logoBase64 } = req.body;

    if (!slotId || !amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid slot ID or payment amount' });
    }

    const razorpayKeyId = env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!razorpayKeyId || !razorpayKeySecret || !supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Calculate Fixed Price based on slot size securely
    const { data: slot, error: slotError } = await supabase.from('slots').select('*').eq('id', slotId).single();
    if (slotError || !slot) return res.status(404).json({ error: 'Slot not found' });

    let fixedPrice = 0;
    if (slot.size === 'big') {
      fixedPrice = 1999900; // ₹19,999
    } else if (slot.size === 'small') {
      fixedPrice = 699900; // ₹6,999
    } else if (slot.size === 'micro') {
      fixedPrice = 299900; // ₹2,999
    } else {
      return res.status(400).json({ error: 'Invalid slot size' });
    }

    const finalAmount = fixedPrice;

    // 2. Upload Logo securely
    let uploadedLogoUrl = null;
    if (logoBase64) {
      try {
        const buffer = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0));
        if (buffer.length > 2.8 * 1024 * 1024) return res.status(413).json({ error: 'Logo size exceeds 2MB limit' });

        const actualMime = getMimeTypeFromBuffer(buffer);
        if (!actualMime) return res.status(400).json({ error: 'Invalid image format. Only PNG, JPG, GIF allowed.' });

        const fileExt = actualMime.split('/')[1];
        const fileName = `${slotId}-pending-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, buffer, { contentType: actualMime, upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
        uploadedLogoUrl = publicUrl;
      } catch (err) {
        return res.status(500).json({ error: 'Image processing or upload failed.' });
      }
    }

    // 3. Create Razorpay Order
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: finalAmount, // in paise
        currency: 'INR',
        receipt: `receipt_${slotId}_${Date.now()}`
      })
    });

    const rzpData = await rzpResponse.json();
    if (!rzpResponse.ok) {
      console.error('Razorpay Order Error:', rzpData);
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    const txnid = rzpData.id;

    // 4. Save order and user_data securely
    const userData = JSON.stringify({ brandName, website, xHandle, logo_url: uploadedLogoUrl });
    const { error: insertError } = await supabase
      .from('orders')
      .insert({
        id: crypto.randomUUID(),
        razorpay_order_id: txnid,
        amount: finalAmount,
        status: 'created',
        slot_id: slotId,
        user_data: userData
      });

    if (insertError) {
      console.error('Error saving order to Supabase:', insertError);
      return res.status(500).json({ error: 'Failed to register order securely' });
    }

    return res.status(200).json({
      order_id: txnid,
      amount: finalAmount,
      key: razorpayKeyId
    });

  } catch (error) {
    console.error('Server error processing order:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
