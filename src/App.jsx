import { useState, useEffect } from 'react';
import './index.css';
import BannerDisplay from './components/BannerDisplay';
import SlotTable from './components/SlotTable';
import CheckoutModal from './components/CheckoutModal';
import TermsPolicy from './components/TermsPolicy';

import { supabase } from './lib/supabaseClient';

const INITIAL_SLOTS = [
  { id: 'big-1', size: 'big', status: 'available' },
  { id: 'big-2', size: 'big', status: 'available' },
  { id: 'big-3', size: 'big', status: 'available' },
  { id: 'small-1', size: 'small', status: 'available' },
  { id: 'small-2', size: 'small', status: 'available' },
  { id: 'small-3', size: 'small', status: 'available' },
  { id: 'small-4', size: 'small', status: 'available' },
  { id: 'small-5', size: 'small', status: 'available' },
  { id: 'small-6', size: 'small', status: 'available' },
  { id: 'micro-1', size: 'micro', status: 'available' },
  { id: 'micro-2', size: 'micro', status: 'available' },
];

function App() {
  const [visitors, setVisitors] = useState(0);
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [checkoutSlot, setCheckoutSlot] = useState(null);
  const [currentView, setCurrentView] = useState('home');

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/get-slots');
      if (res.ok) {
        const { data } = await res.json();
        if (data && data.length > 0) {
          // Map the database rows to the frontend slot structure
          setSlots(data);
        }
      } else {
        const errorData = await res.json();
        console.error('Error fetching slots from API:', errorData);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    // Visitor counter logic
    setVisitors(Math.floor(Math.random() * 50) + 10);
    const interval = setInterval(() => {
      setVisitors(prev => Math.max(1, prev + Math.floor(Math.random() * 5) - 2));
    }, 5000);

    // Fetch live slots from Supabase on mount
    fetchSlots();

    return () => clearInterval(interval);
  }, []);

  const handleCheckoutSubmit = async (checkoutData) => {
    // The backend /api/verify-payment has already securely updated Supabase!
    // We just need to close the modal and refresh the frontend grid to show it.
    setCheckoutSlot(null);
    await fetchSlots();
  };

  return (
    <>
      <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <a href="/" style={{ display: 'block' }}>
            <img 
              src="/logo.png" 
              alt="Let The Banner Cook" 
              style={{ maxWidth: '250px', width: '100%', display: 'block' }} 
            />
          </a>
          <nav className="nav-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <a href="#slots">Slots</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About Founder</a>
          </nav>
        </div>
      </header>

      {currentView === 'home' ? (
        <main className="container">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--color-hover)', padding: '0.5rem 1rem',
              borderRadius: '999px', fontSize: '0.9rem', fontWeight: 500
            }}>
              <span style={{ color: 'var(--color-accent)' }}>●</span> {visitors} people viewing right now
            </span>
          </div>

          <section className="mb-16" style={{ maxWidth: '800px', margin: '0 auto 4rem' }}>
            <BannerDisplay slots={slots} onCheckout={setCheckoutSlot} />
          </section>

          <section id="slots" className="mb-16">
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Live Slot Status</h2>
            <SlotTable slots={slots} onCheckout={setCheckoutSlot} onRefresh={fetchSlots} />
          </section>

          <section id="how-it-works" className="mb-16">
            <h2>How It Works</h2>
            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '3rem', marginTop: '3rem'
            }}>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>1. Choose a Spot</h3>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>Select between micro, small, or big slots for a fixed-price 72-hour placement.</p>
              </div>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>2. Book Placement</h3>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>Enter your brand info, upload a logo, and pay the fixed price. Your spot is instantly secured.</p>
              </div>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>3. Go Live</h3>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>If the slot is empty, you go live immediately. Otherwise, you're queued and go live automatically when the current placement ends.</p>
              </div>
            </div>
          </section>

        <section id="about" className="mb-16">
          <h2>Where the money goes</h2>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)', marginTop: '3rem' }}>
            <p>Great question. This funds my unemployment. Consider yourself a very small, very confused investor in my life.</p>
          </div>
        </section>

        <section className="mb-16" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div 
            className="founder-img"
            style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
          >
            <img 
              src="/founder.jpeg" 
              alt="Wilson" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }} 
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
          <div style={{ flex: '1 1 300px' }}>
            <p style={{ fontSize: '1.05rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Hey, I'm Wilson. Retired agency owner, current 3am shitposter, full-time caffeine dependent. Built stuff before. This is probably the weirdest one, which usually means it's the right one.
            </p>
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
              {/* Instagram */}
              <a href="https://www.instagram.com/wil50n_7/" target="_blank" rel="noreferrer" aria-label="Instagram">
                <img src="/instagram.png" alt="Instagram" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </a>
              
              {/* X (Twitter) */}
              <a href="https://x.com/writtenbywilson" target="_blank" rel="noreferrer" aria-label="X (Twitter)">
                <img src="/x-logo.png" alt="X" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </a>

              {/* LinkedIn */}
              <a href="https://www.linkedin.com/in/wilson-tom-869591210/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <img src="/linkedin.png" alt="LinkedIn" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </a>

              {/* Threads */}
              <a href="https://www.threads.com/@wil50n_7" target="_blank" rel="noreferrer" aria-label="Threads">
                <img src="/threads.png" alt="Threads" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </a>
            </div>
          </div>
        </section>
      </main>
      ) : (
        <TermsPolicy onBack={() => setCurrentView('home')} />
      )}

      <footer style={{
        borderTop: '1px solid var(--color-border)', padding: '3rem 0',
        marginTop: '4rem', textAlign: 'center', color: '#536471', fontSize: '0.9rem'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <a href="#terms" onClick={(e) => { e.preventDefault(); setCurrentView('terms'); window.scrollTo(0, 0); }} style={{ textDecoration: 'underline' }}>Terms & Refund Policy</a>
          <a href="mailto:wilsontom5969@gmail.com" style={{ textDecoration: 'underline' }}>wilsontom5969@gmail.com</a>
        </div>
      </footer>

      {checkoutSlot && (
        <CheckoutModal 
          slot={checkoutSlot} 
          onClose={() => setCheckoutSlot(null)} 
          onSubmit={handleCheckoutSubmit}
        />
      )}
    </>
  );
}

export default App;
