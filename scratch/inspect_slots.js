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
  const { data, error } = await supabase.from('slots').select('*');

  if (error) {
    console.error('Error fetching slots:', error);
  } else {
    console.log('Current slots:');
    console.table(data);
  }
}

main();
