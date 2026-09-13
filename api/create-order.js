import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const env = process.env;
    const { slotId, amount } = req.body;

    if (!slotId || !amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid slot ID or bid amount' });
    }

    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing credentials in server environment variables.');
      return res.status(500).json({ error: 'Payment gateway configuration error' });
    }

    const auth = btoa(`${keyId}:${keySecret}`);
    const receiptId = `slot_${slotId}_${Date.now()}`;
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Node-Fetch/1.0'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'INR',
        receipt: receiptId
      })
    });

    const orderText = await razorpayResponse.text();
    let orderData;
    try {
      orderData = JSON.parse(orderText);
    } catch (e) {
      return res.status(500).json({ error: 'Razorpay returned non-JSON', status: razorpayResponse.status, details: orderText });
    }

    if (!razorpayResponse.ok) {
      console.error('Razorpay Error:', orderData);
      return res.status(500).json({ error: 'Failed to create Razorpay order' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: insertError } = await supabase
      .from('orders')
      .insert({
        id: crypto.randomUUID(),
        razorpay_order_id: orderData.id,
        amount: orderData.amount,
        status: 'created',
        slot_id: slotId
      });

    if (insertError) {
      console.error('Error saving order to Supabase:', insertError);
      return res.status(500).json({ error: 'Failed to register order securely' });
    }

    return res.status(200).json({
      order_id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency
    });

  } catch (error) {
    console.error('Server error processing order:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message, stack: error.stack });
  }
}
