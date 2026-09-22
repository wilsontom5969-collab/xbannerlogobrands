import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombxawdmgtoqycwkjiws.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jcjSz3k5rM7PjZp7kBhAWA_8ltqT6RG';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: bookings } = await supabase.from('slot_bookings').select('*');
  console.log(bookings);
}
run();
