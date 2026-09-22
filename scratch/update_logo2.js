import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombxawdmgtoqycwkjiws.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jcjSz3k5rM7PjZp7kBhAWA_8ltqT6RG';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: updateData, error: updateError } = await supabase
    .from('slot_bookings')
    .update({ logo_url: '/cornerstone.png' })
    .in('id', ['f5df98ba-b90f-4780-900f-09b2057b0ebe', '8b993c31-4419-4332-bbfb-f996f560b202'])
    .select();
    
  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Updated successfully:', updateData);
  }
}
run();
