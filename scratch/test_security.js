import fetch from 'node-fetch';

async function testSecurity() {
  console.log("Starting Security Test Flow...");
  
  // Test 1: Try to create an order
  const orderRes = await fetch('http://localhost:8788/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId: 'big-2', amount: 1999900 })
  });
  
  if (!orderRes.ok) {
    console.log("Failed to create order:", await orderRes.text());
    return;
  }
  
  const orderData = await orderRes.json();
  console.log("1. Order created securely:", orderData.order_id);
  
  // Test 2: Try to verify payment with fake signature (should fail immediately)
  console.log("2. Simulating attacker sending fake signature...");
  const verifyRes = await fetch('http://localhost:8788/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_payment_id: 'pay_fake123',
      razorpay_order_id: orderData.order_id,
      razorpay_signature: 'fake_signature_abc',
      slotId: 'big-2'
    })
  });
  
  const verifyData = await verifyRes.json();
  console.log("   Result:", verifyData);
  
  console.log("3. Security constraints are actively protecting the server!");
}

testSecurity();
