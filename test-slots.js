import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const vars = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});
const supabase = createClient(vars.VITE_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('slots').select('*').in('id', ['big-1', 'big-2', 'big-3']);
  console.log('Slots:', JSON.stringify(data, null, 2));
}
check();
