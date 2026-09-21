import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const vars = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});
const supabase = createClient(vars.VITE_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function clearSlots() {
  const { data: slots, error } = await supabase.from('slots').select('*');
  if (error) {
    console.error('Failed to fetch slots:', error);
    return;
  }

  for (const slot of slots) {
    if (slot.id === 'big-3') continue;

    let basePrice = 299900;
    if (slot.size === 'big') basePrice = 1999900;
    if (slot.size === 'small') basePrice = 699900;

    const { error: updateError } = await supabase
      .from('slots')
      .update({
        status: 'available',
        holder_name: null,
        logo_url: null,
        website_url: null,
        x_handle: null,
        current_bid: basePrice,
        protection_expiry: null,
        slot_expiry: null
      })
      .eq('id', slot.id);

    if (updateError) {
      console.error(`Failed to update ${slot.id}:`, updateError);
    } else {
      console.log(`Reset ${slot.id} successfully.`);
    }
  }
}
clearSlots();
