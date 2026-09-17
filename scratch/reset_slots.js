import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function main() {
  const envFile = fs.readFileSync('.dev.vars', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0 && !key.startsWith('#')) {
      env[key.trim()] = values.join('=').trim();
    }
  });

  const supabaseUrl = env['VITE_SUPABASE_URL'];
  const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const resetData = {
    status: 'available',
    holder_name: null,
    logo_url: null,
    website_url: null,
    x_handle: null,
    protection_expiry: null,
    slot_expiry: null
  };

  console.log('Resetting micro slots...');
  await supabase.from('slots').update({ ...resetData, current_bid: 299900 }).eq('size', 'micro');

  console.log('Resetting small slots...');
  await supabase.from('slots').update({ ...resetData, current_bid: 699900 }).eq('size', 'small');

  console.log('Resetting big slots...');
  await supabase.from('slots').update({ ...resetData, current_bid: 1999900 }).eq('size', 'big');

  const { data, error } = await supabase.from('slots').select('*');
  if (error) {
    console.error('Error fetching final slots:', error);
  } else {
    console.log('Final slots state:');
    console.table(data);
  }
}

main();
