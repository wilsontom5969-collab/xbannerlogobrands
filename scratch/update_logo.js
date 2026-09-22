import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombxawdmgtoqycwkjiws.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jcjSz3k5rM7PjZp7kBhAWA_8ltqT6RG';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: bookings, error } = await supabase.from('slot_bookings').select('*');
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  const fvckBooking = bookings.find(b => 
    (b.brand_name && b.brand_name.toLowerCase().includes('fvck')) || 
    (b.logo_url && b.logo_url.toLowerCase().includes('fvck'))
  );
  
  if (fvckBooking) {
    console.log('Found booking:', fvckBooking.id);
    const { data: updateData, error: updateError } = await supabase
      .from('slot_bookings')
      .update({ logo_url: '/cornerstone.png', brand_name: 'Cornerstone Media' })
      .eq('id', fvckBooking.id)
      .select();
      
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('Updated successfully:', updateData);
    }
  } else {
    console.log('No FVCKRICHDAD booking found. All bookings:', bookings);
  }
}
run();
