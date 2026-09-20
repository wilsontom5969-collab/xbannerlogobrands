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
            onMouseEnter={() => setHoveredSlot(layout.id)}
            onMouseLeave={() => setHoveredSlot(null)}
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
              justifyContent: isAvailable ? 'flex-end' : 'center',
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
                     <img src={slotData.logo_url} alt="" style={{
                        maxWidth: '70%', maxHeight: '60%', objectFit: 'contain', paddingBottom: '4px',
                        display: 'block', margin: '0 auto'
                     }} />
                  )}
                  <div style={{
                    color: 'rgba(0,0,0,0.7)',
                    fontSize: layout.type === 'micro' ? '0.6rem' : '0.85rem',
                    fontWeight: 500
                  }}>
                    ₹{(layout.type === 'big' ? 19999 : layout.type === 'small' ? 6999 : 2999).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div style={{
                  marginBottom: '2px',
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
              <div style={{
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
    </div>
  );
}
