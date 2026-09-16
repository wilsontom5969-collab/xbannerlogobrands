export default function SlotTable({ slots, onCheckout }) {
  return (
    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--color-hover)', borderBottom: '2px solid var(--color-border)' }}>
          <tr>
            <th style={{ padding: '1rem', fontWeight: 600 }}>Spot</th>
            <th style={{ padding: '1rem', fontWeight: 600 }}>Status / Holder</th>
            <th style={{ padding: '1rem', fontWeight: 600 }}>Price / Current Bid</th>
            <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {[...slots].sort((a, b) => b.current_bid - a.current_bid).map(slot => {
            const isAvailable = slot.status === 'available';
            const priceStr = `₹${(slot.current_bid / 100).toLocaleString()}`;
            
            return (
              <tr key={slot.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{slot.id.toUpperCase()}</div>
                  <div style={{ fontSize: '0.85rem', color: '#536471' }}>{slot.size.toUpperCase()}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  {isAvailable ? (
                    <span style={{ color: '#00ba7c', fontWeight: 500 }}>Available</span>
                  ) : (
                    <span style={{ fontWeight: 500 }}>{slot.holder_name}</span>
                  )}
                </td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>
                  {priceStr}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {!isAvailable ? (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={() => {
                          const targetUrl = slot.website_url || slot.link;
                          if (targetUrl) {
                            const finalUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
                            window.open(finalUrl, '_blank', 'noopener,noreferrer');
                          } else {
                            alert(`Visiting ${slot.holder_name}'s website...`);
                          }
                        }}
                      >
                        Visit ↗
                      </button>
                      <button 
                        className="btn btn-accent" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={() => onCheckout(slot)}
                      >
                        Outbid
                      </button>
                    </div>
                  ) : (
                    <button 
                      className={slot.size === 'big' ? "btn btn-accent" : "btn btn-primary"}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      onClick={() => onCheckout(slot)}
                    >
                      {slot.size === 'big' ? 'Start Bidding' : 'Buy Now'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
