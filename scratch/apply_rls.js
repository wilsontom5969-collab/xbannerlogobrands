import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ombxawdmgtoqycwkjiws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Will output SQL instead.");
}

async function run() {
  console.log("Since we don't have a direct Postgres connection or rpc('exec_sql'), please run this in the Supabase SQL Editor:");
  
  const sql = `
-- 1. Enable RLS
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Public can read slots" ON slots;

-- 3. Create Policy for slots: Allow ANYONE to SELECT (read)
CREATE POLICY "Public can read slots" ON slots FOR SELECT USING (true);

-- 4. Add webhook idempotency column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS webhook_event_id TEXT UNIQUE;
  `;
  
  console.log("\n--- COPY AND PASTE THIS SQL ---");
  console.log(sql);
  console.log("-------------------------------");
}

run();
