import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const vars = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});
const supabaseUrl = vars.VITE_SUPABASE_URL;
const supabaseKey = vars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(3);
  console.log('Recent orders:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}
check();
