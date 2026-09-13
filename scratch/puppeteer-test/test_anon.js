const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ombxawdmgtoqycwkjiws.supabase.co', 'sb_publishable_jcjSz3k5rM7PjZp7kBhAWA_8ltqT6RG');

async function test() {
  const { data, error } = await supabase.from('slots').select('*');
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
}
test();
