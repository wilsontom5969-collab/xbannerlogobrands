import fetch from 'node-fetch';

async function testLiveApi() {
  console.log("Testing live /api/create-order...");
  
  const orderRes = await fetch('https://xbannerlogobrands.vercel.app/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId: 'small-1', amount: 800000 })
  });
  
  console.log("Status:", orderRes.status);
  const text = await orderRes.text();
  console.log("Response:", text);
}

testLiveApi();
