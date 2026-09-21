import React from 'react';

export default function NotFound({ onHome }) {
  return (
    <main className="container" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 className="not-found-title" style={{
        fontSize: '3rem',
        fontWeight: 500,
        letterSpacing: '-0.04em',
        marginBottom: '1rem',
        color: '#1a1a1a',
        fontFamily: 'var(--font-family)'
      }}>
        404 - Not in the script.
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#536471', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: '1.6' }}>
        You've wandered off the banner. Let's get you back to the main story.
      </p>
      
      <button 
        onClick={() => {
          window.history.replaceState({}, document.title, '/');
          onHome();
        }} 
        className="btn btn-primary"
        style={{ fontSize: '1.05rem', padding: '0.85rem 2rem' }}
      >
        Back to Home
      </button>
    </main>
  );
}
