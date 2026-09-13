export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { slotId, amount, brandName, website, handle } = data;

    // Here we would normally validate against D1 to ensure the bid is high enough
    // For now, we mock the Razorpay Order creation
    
    const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(7);

    // Save order to DB as 'created'
    if (context.env.DB) {
      await context.env.DB.prepare(
        `INSERT INTO orders (id, razorpay_order_id, amount, status, slot_id, user_data) 
         VALUES (?, ?, ?, 'created', ?, ?)`
      ).bind(
        crypto.randomUUID(), mockOrderId, amount, slotId, JSON.stringify({brandName, website, handle})
      ).run();
    }

    return new Response(JSON.stringify({
      orderId: mockOrderId,
      amount: amount,
      currency: "INR"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
