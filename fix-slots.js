import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const vars = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});
const supabase = createClient(vars.VITE_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data, error } = await supabase
    .from('slots')
    .update({ 
      status: 'available',
      holder_name: null,
      logo_url: null,
      website_url: null,
      x_handle: null,
      current_bid: null
    })
    .in('id', ['big-1', 'big-2']);

  console.log('Update error:', error);
  
  const { data: updated, error: fetchErr } = await supabase.from('slots').select('*').in('id', ['big-1', 'big-2']);
  console.log('Fixed slots:', JSON.stringify(updated, null, 2));
}
fix();
