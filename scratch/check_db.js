import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const devVars = fs.readFileSync('.dev.vars', 'utf-8');
const env = {};
devVars.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    if (key && !key.startsWith('#')) {
      env[key] = parts.slice(1).join('=').trim();
    }
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function check() {
  const { data, error } = await supabase.from('orders').select('id').limit(1);
  if (error) {
    console.log("Error querying orders:", error.message);
  } else {
    console.log("Orders table exists!");
  }
}
check();
