import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const vars = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});
const supabase = createClient(vars.VITE_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function clearBookings() {
  const { data: bookings, error } = await supabase.from('slot_bookings').select('*');
  if (error) {
    console.error('Failed to fetch bookings:', error);
    return;
  }

  for (const b of bookings) {
    if (b.slot_id === 'big-3') continue;

    const { error: delError } = await supabase
      .from('slot_bookings')
      .delete()
      .eq('id', b.id);

    if (delError) {
      console.error(`Failed to delete booking for ${b.slot_id}:`, delError);
    } else {
      console.log(`Deleted booking for ${b.slot_id} successfully.`);
    }
  }
}
clearBookings();
