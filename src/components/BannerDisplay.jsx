import { useState } from 'react';

// Note: These percentages are relative to the ENTIRE uploaded image (banner + profile area)
// You may need to tweak these slightly to perfectly align with the drawn boxes on your screenshot
const SLOT_LAYOUT = [
  // 2 MICRO SLOTS (Top Left)
  { id: 'micro-1', type: 'micro', left: '4%', top: '7%', width: '12%', height: '12%' },
  { id: 'micro-2', type: 'micro', left: '18%', top: '7%', width: '12%', height: '12%' },
  // 3 BIG SLOTS (Center stacked)
  { id: 'big-1', type: 'big', left: '36%', top: '7%', width: '24%', height: '12%' },
  { id: 'big-2', type: 'big', left: '36%', top: '21%', width: '24%', height: '12%' },
  { id: 'big-3', type: 'big', left: '36%', top: '35%', width: '24%', height: '12%' },
  // 6 SMALL SLOTS (Right side, 3 rows x 2 cols)
  { id: 'small-1', type: 'small', left: '66%', top: '7%', width: '14%', height: '12%' },
  { id: 'small-2', type: 'small', left: '82%', top: '7%', width: '14%', height: '12%' },
  { id: 'small-3', type: 'small', left: '66%', top: '21%', width: '14%', height: '12%' },
  { id: 'small-4', type: 'small', left: '82%', top: '21%', width: '14%', height: '12%' },
  { id: 'small-5', type: 'small', left: '66%', top: '35%', width: '14%', height: '12%' },
  { id: 'small-6', type: 'small', left: '82%', top: '35%', width: '14%', height: '12%' },
];

export default function BannerDisplay({ slots, onCheckout }) {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [mobileActionSlot, setMobileActionSlot] = useState(null);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      backgroundColor: '#dbdcde' // Match user's requested light gray background
    }}>
      
      {/* Background Image provided by user */}
      <img 
        src="/banner-screenshot.png" 
        alt="X Profile Context" 
        style={{ width: '100%', height: 'auto', display: 'block' }} 
      />

      {SLOT_LAYOUT.map((layout) => {
        const slotData = slots.find(s => s.id === layout.id) || {};
        const isHovered = hoveredSlot === layout.id;
        const isAvailable = slotData.status === 'available';

        return (
          <div 
            key={layout.id}
            className="mobile-slot-box"
            onMouseEnter={() => setHoveredSlot(layout.id)}
            onMouseLeave={() => setHoveredSlot(null)}
            onClick={(e) => {
              if (window.innerWidth <= 768 && !isAvailable) {
                setMobileActionSlot(slotData);
                return;
              }
              const section = document.getElementById('slots');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              position: 'absolute',
              left: layout.left,
              top: layout.top,
              width: layout.width,
              height: layout.height,
              backgroundColor: 'transparent', // ALL slots completely transparent
              // Use a dark dashed border so it's visible on the new light gray (#dbdcde) background
              border: `1px dashed ${isAvailable ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {/* Slot Content */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              filter: isHovered ? 'blur(4px)' : 'none',
              transition: 'filter 0.2s ease',
              padding: '4px'
            }}>
              {!isAvailable ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '100%', 
                  height: '100%'
                }}>
                  {slotData.logo_url && (
                     <img src={slotData.logo_url} alt="" className="booked-logo-img" style={{
                        maxWidth: '70%', maxHeight: '60%', objectFit: 'contain', paddingBottom: '4px',
                        display: 'block', margin: '0 auto'
                     }} />
                  )}
                  <div className="mobile-slot-price hide-booked-price-mobile" style={{
                    color: 'rgba(0,0,0,0.7)',
                    fontSize: layout.type === 'micro' ? '0.6rem' : '0.85rem',
                    fontWeight: 500
                  }}>
                    ₹{(layout.type === 'big' ? 19999 : layout.type === 'small' ? 6999 : 2999).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="mobile-slot-price" style={{
                  fontSize: layout.type === 'micro' ? '0.6rem' : '0.85rem',
                  color: 'rgba(0,0,0,0.7)',
                  fontWeight: 500
                }}>
                  ₹{(layout.type === 'big' ? 19999 : layout.type === 'small' ? 6999 : 2999).toLocaleString()}
                </div>
              )}
            </div>

            {/* Hover Actions Overlay */}
            {isHovered && (
              <div className="hide-mobile" style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.5)', // Slightly darker for better contrast
                padding: '4px'
              }}>
                <button 
                  className="banner-hover-btn"
                  style={{
                    backgroundColor: 'var(--color-accent)', // Blue button
                    color: 'white',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}
                  onClick={(e) => { e.stopPropagation(); onCheckout(slotData); }}
                >
                  {isAvailable ? 'Buy' : 'Queue'}
                </button>
                
                {!isAvailable && (
                  <button 
                    className="banner-hover-btn"
                    style={{
                      backgroundColor: 'white',
                      color: 'black',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontWeight: 500,
                      fontSize: '0.65rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const targetUrl = slotData.website_url || slotData.link;
                      if (targetUrl) {
                        // Ensure the URL has http/https
                        const finalUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
                        window.open(finalUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        alert(`Visiting ${slotData.holder_name}'s website...`); 
                      }
                    }}
                  >
                    Visit ↗
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom Mobile Action Modal */}
      {mobileActionSlot && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }} onClick={() => setMobileActionSlot(null)}>
          <div style={{
            background: 'white',
            width: '100%',
            padding: '2rem 1.5rem',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a1a1a' }}>Slot Options</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#536471', fontSize: '0.9rem' }}>Choose an action for this booked placement.</p>
            </div>
            
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
              onClick={() => {
                const targetUrl = mobileActionSlot.website_url;
                if (targetUrl) {
                  window.open(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`, '_blank');
                } else {
                  alert("No active site URL found for this booking.");
                }
                setMobileActionSlot(null);
              }}
            >
              Visit Active Site ↗
            </button>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
              onClick={() => {
                setMobileActionSlot(null);
                const section = document.getElementById('slots');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Join Queue
            </button>
            
            <button 
              style={{ 
                background: 'none', border: 'none', width: '100%', 
                padding: '0.75rem', marginTop: '0.5rem', color: '#536471', 
                fontSize: '0.9rem', fontWeight: 500 
              }}
              onClick={() => setMobileActionSlot(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
