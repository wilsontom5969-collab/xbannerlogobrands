import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombxawdmgtoqycwkjiws.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jcjSz3k5rM7PjZp7kBhAWA_8ltqT6RG';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('slots')
    .update({ logo_url: '/logo.png' })
    .eq('id', 'big-3')
    .select();
    
  if (error) console.error(error);
  else console.log('Updated slots table logo_url to /logo.png', data);
}
run();
