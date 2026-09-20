import { useState, useEffect } from 'react';

export default function SlotTable({ slots, onCheckout, onRefresh }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = new Date();
      setNow(currentTime);
      
      // Removed the stale DB status trigger check to prevent infinite onRefresh loops.
      // The UI now dynamically transitions states using `now`.
    }, 1000);
    return () => clearInterval(timer);
  }, [slots, onRefresh]);

  const formatCountdown = (targetDate) => {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return '00d 00h 00m 00s';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const getSlotPrice = (size) => {
    if (size === 'big') return 19999;
    if (size === 'small') return 6999;
    return 2999;
  };

  const [showAllSlots, setShowAllSlots] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {[...slots]
        .sort((a, b) => getSlotPrice(b.size) - getSlotPrice(a.size))
        .slice(0, showAllSlots ? slots.length : 4)
        .map(slot => {
        const fixedPrice = getSlotPrice(slot.size);
        const priceStr = `₹${fixedPrice.toLocaleString()}`;
        
        let activeBooking = null;
        let scheduledBookings = [];
        
        (slot.bookings || []).forEach(b => {
          if (b.status === 'cancelled') return;
          const start = new Date(b.starts_at);
          const end = new Date(b.ends_at);
          
          if (now >= start && now < end) {
            if (!activeBooking || new Date(activeBooking.ends_at) < end) {
              activeBooking = b;
            }
          } else if (now < start) {
            scheduledBookings.push(b);
          }
        });

        scheduledBookings.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
        const nextBooking = scheduledBookings[0];
        const numFutureBookings = scheduledBookings.length;

        const isAvailableNow = !activeBooking && !nextBooking;
        const startsImmediately = !activeBooking;

        return (
          <div key={slot.id} style={{ 
            background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)', 
            padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' 
          }}>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: '0.5rem', letterSpacing: '-0.035em' }}>
                {slot.id.charAt(0).toUpperCase() + slot.id.slice(1)}
              </div>
              
               {activeBooking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                   {activeBooking.logo_url && (
                      <img src={activeBooking.logo_url} alt={activeBooking.holder_name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} />
                   )}
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <div style={{ fontWeight: 500, fontSize: '1rem' }}>{activeBooking.holder_name}</div>
                     {activeBooking.website_url && (
                       <a href={activeBooking.website_url.startsWith('http') ? activeBooking.website_url : `https://${activeBooking.website_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#536471', textDecoration: 'none' }}>
                         {activeBooking.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                       </a>
                     )}
                   </div>
                </div>
              )}
            </div>

            <div style={{ flex: '2 1 300px', fontSize: '0.9rem' }}>
              {isAvailableNow ? (
                <div>
                  <div style={{ color: '#00ba7c', fontWeight: 700, fontSize: '1.1rem', marginBottom: 0, lineHeight: 1.1 }}>Available Now</div>
                  <div style={{ color: '#536471' }}>Starts <strong style={{ color: 'black' }}>Immediately</strong></div>
                </div>
              ) : (
                <>
                  {activeBooking && (
                    <div>
                      <div style={{ color: '#536471', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Currently Showing</div>
                      <div style={{ fontWeight: 500, fontSize: '1rem' }}>{activeBooking.holder_name}</div>
                      {activeBooking.website_url && (
                        <a href={activeBooking.website_url.startsWith('http') ? activeBooking.website_url : `https://${activeBooking.website_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#536471', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
                          {activeBooking.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      )}
                      {!activeBooking.website_url && <div style={{ marginBottom: '0.5rem' }}></div>}
                      <div style={{ color: '#536471', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Time Left</div>
                      <div style={{ fontWeight: 500, fontSize: '1.1rem', color: 'var(--color-accent)', marginBottom: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCountdown(new Date(activeBooking.ends_at))}
                      </div>
                      <div style={{ color: '#536471' }}>Ends <strong style={{ color: 'black' }}>{formatDate(activeBooking.ends_at)}</strong></div>
                    </div>
                  )}

                  {!activeBooking && scheduledBookings.slice(0, 2).map((booking, index) => (
                    <div key={booking.id} style={{ marginTop: index > 0 ? '1.5rem' : 0 }}>
                      <div style={{ color: '#536471', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Next Up</div>
                      <div style={{ fontWeight: 500, fontSize: '1rem' }}>{booking.holder_name}</div>
                      {booking.website_url && (
                        <a href={booking.website_url.startsWith('http') ? booking.website_url : `https://${booking.website_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#536471', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
                          {booking.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      )}
                      {!booking.website_url && <div style={{ marginBottom: '0.5rem' }}></div>}
                      
                      {index === 0 ? (
                        <>
                          <div style={{ color: '#536471', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Starts In</div>
                          <div style={{ fontWeight: 500, fontSize: '1.1rem', color: 'var(--color-accent)', marginBottom: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCountdown(new Date(booking.starts_at))}
                          </div>
                          <div style={{ color: '#536471' }}>Starts <strong style={{ color: 'black' }}>{formatDate(booking.starts_at)}</strong></div>
                        </>
                      ) : (
                        <div style={{ color: '#536471' }}>Starts <strong style={{ color: 'black' }}>{formatDate(booking.starts_at)}</strong></div>
                      )}
                    </div>
                  ))}

                  {!activeBooking && scheduledBookings.length > 2 && (
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#536471', fontWeight: 500 }}>
                      +{scheduledBookings.length - 2} upcoming placement{scheduledBookings.length - 2 !== 1 ? 's' : ''} scheduled
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ flex: '1 1 200px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#536471', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>3-Day Placement</div>
                <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>{priceStr}</div>
              </div>
              <button 
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => onCheckout(slot)}
              >
                {startsImmediately ? 'Book Now' : 'Join Queue'}
              </button>
              {activeBooking && (
                <button 
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                  onClick={() => {
                    const targetUrl = activeBooking.website_url;
                    if (targetUrl) {
                      window.open(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  Visit Active Site ↗
                </button>
              )}
            </div>

            {activeBooking && scheduledBookings.length > 0 && (
              <div style={{ width: '100%', borderTop: '1px dashed var(--color-border)', marginTop: '0.5rem', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                <div style={{ flex: '1 1 200px' }}></div>
                <div style={{ flex: '2 1 300px', fontSize: '0.9rem' }}>
                  {scheduledBookings.slice(0, 2).map((booking, index) => (
                    <div key={booking.id} style={{ marginTop: index > 0 ? '1.5rem' : 0 }}>
                      <div style={{ color: '#536471', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Next Up</div>
                      <div style={{ fontWeight: 500, fontSize: '1rem' }}>{booking.holder_name}</div>
                      {booking.website_url && (
                        <a href={booking.website_url.startsWith('http') ? booking.website_url : `https://${booking.website_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#536471', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
                          {booking.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      )}
                      {!booking.website_url && <div style={{ marginBottom: '0.5rem' }}></div>}
                      <div style={{ color: '#536471' }}>Starts <strong style={{ color: 'black' }}>{formatDate(booking.starts_at)}</strong></div>
                    </div>
                  ))}
                  {scheduledBookings.length > 2 && (
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#536471', fontWeight: 500 }}>
                      +{scheduledBookings.length - 2} upcoming placement{scheduledBookings.length - 2 !== 1 ? 's' : ''} scheduled
                    </div>
                  )}
                </div>
                <div style={{ flex: '1 1 200px' }}></div>
              </div>
            )}
          </div>
        );
      })}

      {!showAllSlots && slots.length > 4 && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button 
            className="btn btn-outline"
            onClick={() => setShowAllSlots(true)}
            style={{ 
              padding: '0.75rem 2.5rem', fontWeight: 600, borderRadius: '999px', 
              fontSize: '1rem', background: 'white', color: '#536471' 
            }}
          >
            Read More ↓
          </button>
        </div>
      )}
    </div>
  );
}
