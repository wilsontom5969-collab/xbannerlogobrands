import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const env = process.env;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date().toISOString();

    // 1. Mark expired bookings as completed
    await supabase.from('slot_bookings')
      .update({ status: 'completed' })
      .in('status', ['active', 'scheduled'])
      .lt('ends_at', now);

    // 2. Fetch all slots and their active/scheduled bookings
    const { data: slots, error: slotsError } = await supabase.from('slots').select('*');
    if (slotsError) throw slotsError;

    const { data: bookings, error: bookingsError } = await supabase
      .from('slot_bookings')
      .select('*')
      .in('status', ['active', 'scheduled'])
      .order('starts_at', { ascending: true });
    
    if (bookingsError) throw bookingsError;

    // Attach bookings to slots
    const slotsWithBookings = slots.map(slot => {
      const slotBookings = bookings.filter(b => b.slot_id === slot.id);
      return {
        ...slot,
        bookings: slotBookings
      };
    });

    return res.status(200).json({ data: slotsWithBookings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
