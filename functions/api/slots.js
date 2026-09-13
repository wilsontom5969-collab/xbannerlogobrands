export async function onRequestGet(context) {
  try {
    // context.env.DB is the D1 database binding
    if (!context.env.DB) {
      // Return mock data for local dev if D1 is not bound
      return new Response(JSON.stringify([
        { id: 'big-1', size: 'big', current_bid: 1999900, status: 'available' },
        { id: 'big-2', size: 'big', current_bid: 1999900, status: 'available' },
        { id: 'big-3', size: 'big', current_bid: 2500000, status: 'live', holder_name: 'Acme Corp', logo_url: 'https://ui-avatars.com/api/?name=Acme&background=0D8ABC&color=fff&size=128' },
        { id: 'small-1', size: 'small', current_bid: 699900, status: 'available' },
        { id: 'small-2', size: 'small', current_bid: 699900, status: 'available' },
        { id: 'small-3', size: 'small', current_bid: 699900, status: 'live', holder_name: 'TechFlow', logo_url: 'https://ui-avatars.com/api/?name=Tech+Flow&background=27ae60&color=fff&size=128' },
        { id: 'small-4', size: 'small', current_bid: 699900, status: 'available' },
        { id: 'small-5', size: 'small', current_bid: 699900, status: 'available' },
        { id: 'micro-1', size: 'micro', current_bid: 299900, status: 'live', holder_name: 'Startup X', logo_url: 'https://ui-avatars.com/api/?name=X&background=e74c3c&color=fff&size=128' },
        { id: 'micro-2', size: 'micro', current_bid: 299900, status: 'available' }
      ]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { results } = await context.env.DB.prepare('SELECT * FROM slots').all();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
