import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .dev.vars manually
const vars = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabaseUrl = vars.VITE_SUPABASE_URL;
const supabaseKey = vars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('book_slot', {
      p_booking_id: 'test-uuid-1234',
      p_slot_id: 'micro-1',
      p_order_id: 'test-order-1234',
      p_holder_name: 'Test',
      p_logo_url: 'http://test.com/logo.png',
      p_website_url: 'http://test.com',
      p_x_handle: 'test',
      p_amount_paid: 299900
    });
  console.log('Result:', data);
  console.log('Error:', error);
}
test();
