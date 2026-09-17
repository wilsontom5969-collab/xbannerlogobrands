import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const devVars = fs.readFileSync('.dev.vars', 'utf-8');
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};

const parseEnv = (content) => {
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      if (key && !key.startsWith('#')) {
        env[key] = parts.slice(1).join('=').trim();
      }
    }
  });
};
parseEnv(devVars);
parseEnv(envFile);

const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const adminClient = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  console.log("=== RLS VERIFICATION ===");
  
  // 1. Slots Table
  console.log("\nTesting 'slots' table with ANON key:");
  const { error: slotReadErr } = await anonClient.from('slots').select('id').limit(1);
  console.log("SELECT slots:", slotReadErr ? `BLOCKED (${slotReadErr.message})` : "ALLOWED (Expected)");

  const { error: slotInsertErr } = await anonClient.from('slots').insert({ id: 'test-slot', size: 'micro', current_bid: 100 });
  console.log("INSERT slots:", slotInsertErr ? `BLOCKED (${slotInsertErr.message})` : "ALLOWED (DANGER!)");

  const { data: updateData, error: slotUpdateErr } = await anonClient.from('slots').update({ current_bid: 1000 }).eq('id', 'big-1').select();
  const updateSuccess = updateData && updateData.length > 0;
  console.log("UPDATE slots:", slotUpdateErr ? `BLOCKED (${slotUpdateErr.message})` : (updateSuccess ? "ALLOWED (DANGER!)" : "BLOCKED (0 rows affected)"));

  const { data: deleteData, error: slotDeleteErr } = await anonClient.from('slots').delete().eq('id', 'big-1').select();
  const deleteSuccess = deleteData && deleteData.length > 0;
  console.log("DELETE slots:", slotDeleteErr ? `BLOCKED (${slotDeleteErr.message})` : (deleteSuccess ? "ALLOWED (DANGER!)" : "BLOCKED (0 rows affected)"));

  // 2. Orders Table
  console.log("\nTesting 'orders' table with ANON key:");
  const { data: orderData, error: orderReadErr } = await anonClient.from('orders').select('id').limit(1);
  const orderReadSuccess = orderData && orderData.length > 0;
  console.log("SELECT orders:", orderReadErr ? `BLOCKED (${orderReadErr.message})` : (orderReadSuccess ? "ALLOWED (DANGER!)" : "BLOCKED (0 rows visible)"));
  
  const { error: orderInsertErr } = await anonClient.from('orders').insert({ id: 'test', razorpay_order_id: 'test', amount: 100, slot_id: 'test' });
  console.log("INSERT orders:", orderInsertErr ? `BLOCKED (${orderInsertErr.message})` : "ALLOWED (DANGER!)");

  // 3. Bids Table
  console.log("\nTesting 'bids' table with ANON key:");
  const { error: bidInsertErr } = await anonClient.from('bids').insert({ id: 'test', slot_id: 'test', amount: 100, order_id: 'test' });
  console.log("INSERT bids:", bidInsertErr ? `BLOCKED (${bidInsertErr.message})` : "ALLOWED (DANGER!)");

  // 4. Verify webhook_event_id column with Admin Key
  console.log("\n=== SCHEMA VERIFICATION ===");
  const { error: schemaErr } = await adminClient.from('orders').select('webhook_event_id').limit(1);
  if (schemaErr) {
    if (schemaErr.message.includes('Could not find the column')) {
      console.log("webhook_event_id column: MISSING");
    } else {
      console.log("webhook_event_id column: ERROR -", schemaErr.message);
    }
  } else {
    console.log("webhook_event_id column: EXISTS (Expected)");
  }
}

verify();
