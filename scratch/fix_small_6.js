import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const devVars = fs.readFileSync('.dev.vars', 'utf-8');
const env = {};
devVars.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    if (key && !key.startsWith('#')) {
      env[key] = parts.slice(1).join('=').trim();
    }
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function fix() {
  const { data, error } = await supabase
    .from('slots')
    .insert([{ id: 'small-6', size: 'small', current_bid: 699900, status: 'available' }]);
    
  if (error) {
    console.error("Error inserting small-6:", error.message);
  } else {
    console.log("Successfully added small-6 to the database!");
  }
}

fix();
