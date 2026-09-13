import fetch from 'node-fetch';

async function testSmallBidding() {
  console.log("=== TESTING SMALL SLOT COMPETITIVE BIDDING ===");
  
  // Create order for a small slot with EXACTLY the current price + 100 paise (1 INR)
  const currentBid = 699900;
  const newBid = currentBid + 100; // 7000 INR
  
  const orderRes = await fetch('http://localhost:8788/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId: 'small-1', amount: newBid })
  });
  
  if (!orderRes.ok) {
    console.error("Order creation failed:", await orderRes.text());
    return;
  }
  
  const orderData = await orderRes.json();
  console.log(`1. Order created for small-1 at ₹${newBid / 100}:`, orderData.order_id);

  console.log("\n2. Simulating backend verification (will fail because we can't truly pay it, but we can verify it doesn't fail for 'fixed price' anymore!)...");
  
  const verifyRes = await fetch('http://localhost:8788/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_payment_id: 'pay_fake123',
      razorpay_order_id: orderData.order_id,
      razorpay_signature: 'fake_sig',
      slotId: 'small-1'
    })
  });
  
  const verifyData = await verifyRes.json();
  console.log("   Result:", verifyData);
  
  if (verifyData.error === 'Invalid payment signature. Payment rejected.') {
    console.log("\n✅ SUCCESS: The backend processed the small slot and reached signature validation instead of rejecting it as a 'fixed price' slot!");
  } else {
    console.error("\n❌ FAILED: The backend returned an unexpected error.");
  }
}

testSmallBidding();
