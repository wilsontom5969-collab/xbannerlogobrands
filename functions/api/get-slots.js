import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const supabaseUrl = context.env.VITE_SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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

    return new Response(JSON.stringify({ data: slotsWithBookings }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
