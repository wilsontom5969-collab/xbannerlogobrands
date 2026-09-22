import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombxawdmgtoqycwkjiws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYnhhd2RtZ3RvcXljd2tqaXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTEzMDg1MiwiZXhwIjoyMTA0NzA2ODUyfQ.8UKR-yL--oiXcb9utmN14fnhX6WFNhdGGQVp37wvhwk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  await supabase.from('slot_bookings').update({ logo_url: '/cornerstone.png' }).in('id', ['f5df98ba-b90f-4780-900f-09b2057b0ebe', '8b993c31-4419-4332-bbfb-f996f560b202']);
  await supabase.from('slots').update({ logo_url: '/cornerstone.png', holder_name: 'Cornerstone Design and Media' }).eq('id', 'big-3');
  console.log('Fixed: set to /cornerstone.png');
}
run();
