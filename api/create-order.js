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
    
    // Parse the incoming JSON request from the frontend
    const body = await request.json();
    const { slotId, amount } = body;

    // Validate the incoming data
    if (!slotId || !amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid slot ID or bid amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Securely retrieve keys from server-side environment variables
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing credentials in server environment variables.');
      return new Response(JSON.stringify({ error: 'Payment gateway configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct the Basic Auth header required by Razorpay API
    const auth = btoa(`${keyId}:${keySecret}`);
    const receiptId = `slot_${slotId}_${Date.now()}`;
    
    // Create the order via Razorpay REST API
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount, // Razorpay expects amount in paise (e.g., 50000 = 500 INR)
        currency: 'INR',
        receipt: receiptId // Unique receipt ID for tracking and slot binding
      })
    });

    const orderText = await razorpayResponse.text();
    let orderData;
    try {
      orderData = JSON.parse(orderText);
    } catch (e) {
      console.error('Razorpay non-JSON response:', orderText);
      return new Response(JSON.stringify({ error: 'Razorpay returned non-JSON', status: razorpayResponse.status, details: orderText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle Razorpay API errors
    if (!razorpayResponse.ok) {
      console.error('Razorpay Error:', orderData);
      return new Response(JSON.stringify({ error: 'Failed to create Razorpay order' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save the order to Supabase for idempotency and tracking
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
      return new Response(JSON.stringify({ error: 'Failed to register order securely' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Successfully created order! Return the essential details to the frontend
    return new Response(JSON.stringify({
      order_id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error processing order:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
