import React from 'react';

export const getCharacterLevel = (percentage) => {
  if (percentage === 0) return { name: "Wilson is Weak", copy: "Currently accepting character development." };
  if (percentage <= 20) return { name: "Slightly Less Broke Wilson", copy: "Someone believed in the plot." };
  if (percentage <= 40) return { name: "Getting Somewhere Wilson", copy: "Character development is underway." };
  if (percentage <= 60) return { name: "Main Character Wilson", copy: "Halfway through the character arc." };
  if (percentage <= 80) return { name: "Suspiciously Successful Wilson", copy: "This is getting out of hand." };
  return { name: "Final Boss Wilson", copy: "One sponsor away from full character development." };
};

export default function CharacterStatus({ occupiedCount }) {
  const percentage = Math.min(90, occupiedCount * 10);
  const level = getCharacterLevel(percentage);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', margin: '2rem 0' }}>
      {/* Left Arrow pointing right */}
      <div className="animate-bounce-right" style={{ color: '#2C2C2C' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </div>

      <div className="character-status-box" style={{
        display: 'flex', alignItems: 'center', gap: '2rem',
        background: 'white', padding: '2rem',
        borderRadius: '16px', border: '1px solid var(--color-border)',
        maxWidth: '600px', margin: '0'
      }}>
        <div style={{
          width: '84px', height: '84px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: '2px solid var(--color-border)'
        }}>
          <img
            src="/weak founder.jpg"
            alt="Wilson Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#536471', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
            Wilson's Character Development
          </div>
          <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-family)', fontWeight: 500, marginBottom: '0.3rem' }}>
            {level.name}
          </div>
          <div style={{ fontSize: '1rem', color: '#536471', marginBottom: '1rem' }}>
            {level.copy}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              flex: 1,
              height: '10px',
              background: 'var(--color-border)',
              borderRadius: '999px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${percentage}%`,
                background: 'var(--color-accent)',
                transition: 'width 1s ease-in-out'
              }} />
            </div>
            <span style={{ fontWeight: 500, fontSize: '1rem', minWidth: '35px' }}>{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Right Arrow pointing left */}
      <div className="animate-bounce-left" style={{ color: '#2C2C2C' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </div>
    </div>
  );
}
