import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombxawdmgtoqycwkjiws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYnhhd2RtZ3RvcXljd2tqaXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTEzMDg1MiwiZXhwIjoyMTA0NzA2ODUyfQ.8UKR-yL--oiXcb9utmN14fnhX6WFNhdGGQVp37wvhwk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('slots')
    .update({ logo_url: '/logo.png', holder_name: 'Cornerstone Design and Media' })
    .eq('id', 'big-3')
    .select();
    
  if (error) console.error(error);
  else console.log('Updated slots table using SERVICE KEY', data);
}
run();
