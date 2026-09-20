import React from 'react';

export default function SuccessModal({ levelName, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '1rem',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%', maxWidth: '400px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔓</div>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontFamily: 'var(--font-family)', fontWeight: 500 }}>
          Character Development Unlocked
        </h2>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: '#536471' }}>
          Someone just sponsored Wilson.
        </p>
        <div style={{
          background: 'var(--color-hover)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          marginBottom: '2rem'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#536471', marginBottom: '0.2rem' }}>WILSON IS NOW:</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 500 }}>{levelName}</div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={onClose}
          style={{ width: '100%' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
