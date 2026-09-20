import { useState, useEffect } from 'react';
import './index.css';
import BannerDisplay from './components/BannerDisplay';
import SlotTable from './components/SlotTable';
import CheckoutModal from './components/CheckoutModal';
import TermsPolicy from './components/TermsPolicy';
import CharacterStatus, { getCharacterLevel } from './components/CharacterStatus';
import SuccessModal from './components/SuccessModal';

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
  const [successData, setSuccessData] = useState(null);

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
    // Check for payment success
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') {
      setSuccessData({ show: true });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Visitor counter logic: deterministic hourly base to keep numbers stable across refreshes
    const getHourlyBase = () => {
      const now = new Date();
      const seed = now.getFullYear() * 1000000 + (now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours();
      const x = Math.sin(seed) * 10000;
      const randomFraction = x - Math.floor(x);
      // Random base between 680 and 880
      return Math.floor(randomFraction * 200) + 680;
    };

    let base = getHourlyBase();
    let initialVisitors = base + 3; // Default inside the range

    // Try to load from localStorage to prevent jump on refresh
    const stored = localStorage.getItem('fakeVisitors');
    if (stored) {
      try {
        const { count, storedBase } = JSON.parse(stored);
        // Only use stored if it belongs to the same hourly base
        if (storedBase === base) {
          initialVisitors = count;
        }
      } catch (e) {
        // ignore
      }
    }

    setVisitors(initialVisitors);
    
    const interval = setInterval(() => {
      const currentBase = getHourlyBase();
      if (currentBase !== base) {
        base = currentBase;
      }
      setVisitors(prev => {
        // Simulate real traffic: -2, -1, 0, +1, +2
        let next = prev + (Math.floor(Math.random() * 5) - 2);
        
        // Keep within a believable [base, base + 15] range
        if (next < base) next = base + Math.floor(Math.random() * 3);
        if (next > base + 15) next = base + 15 - Math.floor(Math.random() * 3);
        if (next > 900) next = 900;

        localStorage.setItem('fakeVisitors', JSON.stringify({
          count: next,
          storedBase: base
        }));

        return next;
      });
    }, 4500);

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

  const occupiedCount = slots.filter(s => s.bookings && s.bookings.some(b => b.status === 'active' || b.status === 'scheduled')).length;
  const currentPercentage = Math.min(90, occupiedCount * 10);
  const currentLevel = getCharacterLevel(currentPercentage).name;

  return (
    <>
      <header style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', background: '#ffffff' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <a href="/" style={{ display: 'block' }}>
            <img
              src="/logo.png"
              alt="Let The Banner Cook"
              style={{ height: '30px', width: 'auto', display: 'block' }}
            />
          </a>
          <nav className="nav-links" style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
            <a href="#slots" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0 }}>Slots</a>
            <a href="#how-it-works" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0 }}>How it works</a>
            <a href="#about" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0 }}>About Founder</a>
            <a href="https://x.com/writtenbywilson" target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center' }} aria-label="X (Twitter)">
              <svg viewBox="0 0 512 512" aria-hidden="true" style={{ height: '1.15em', width: '1.15em', fill: 'currentColor' }}><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" /></svg>
            </a>
          </nav>
        </div>
      </header>

      {currentView === 'home' ? (
        <main className="container">
          <div style={{ textAlign: 'center', marginBottom: '2rem', zoom: '0.8' }}>
            <span className="shiny-badge" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '999px', fontSize: '0.95rem', fontWeight: 500, color: '#475569',
              position: 'relative', overflow: 'hidden'
            }}>
              <div className="shiny-badge-bg"></div>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></div>
              {visitors} people viewing right now
            </span>
          </div>

          <section style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem', zoom: '0.8' }}>
            <h1 style={{
              fontSize: '64px',
              fontWeight: 500,
              lineHeight: '67.2px',
              letterSpacing: '-3.84px',
              marginBottom: '1.5rem',
              color: '#555555',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              Sponsor my <br /> <span style={{ color: '#2C2C2C' }}>Character Development</span>
            </h1>
            <p style={{ fontSize: '1.35rem', color: '#2C2C2C', maxWidth: '600px', margin: '0 auto', marginBottom: '2rem', fontWeight: 400 }}>
              Put your logo on my <a href="https://x.com/writtenbywilson" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><svg viewBox="0 0 512 512" aria-hidden="true" style={{ height: '1.25em', width: '1.25em', fill: '#2C2C2C', verticalAlign: '-0.25em', display: 'inline-block', marginRight: '0.15em', marginLeft: '0.15em' }}><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" /></svg></a> <span style={{ fontWeight: 400, fontFamily: 'Helvetica, Arial, sans-serif', color: '#2C2C2C' }}>banner</span>
            </p>
            <div className="animate-bounce-down" style={{ display: 'flex', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1A3524' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </div>
          </section>

          <section className="mb-16" style={{ maxWidth: '800px', margin: '0 auto 4rem' }}>
            <BannerDisplay slots={slots} onCheckout={setCheckoutSlot} />
          </section>

          <section className="mb-16" style={{ zoom: '0.8' }}>
            <CharacterStatus occupiedCount={occupiedCount} />
          </section>

          <section id="slots" className="mb-16">
            <div style={{
              background: '#000000',
              width: '100vw',
              position: 'relative',
              left: '50%',
              right: '50%',
              marginLeft: '-50vw',
              marginRight: '-50vw',
              padding: '1.25rem 1rem',
              marginBottom: '3.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <p style={{ fontSize: '1.1rem', color: '#f5f5f7', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif', textAlign: 'center', letterSpacing: '0.5px' }}>
                Put your logo on my  <span style={{ fontWeight: 500, color: '#ffffff' }}><a href="https://x.com/writtenbywilson" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><svg viewBox="0 0 512 512" aria-hidden="true" style={{ height: '1.25em', width: '1.25em', fill: 'currentColor', verticalAlign: '-0.25em', display: 'inline-block', marginRight: '0.15em' }}><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" /></svg></a> banner</span> and officially become part of my <span style={{ fontWeight: 500, color: '#ffffff' }}>character arc</span>.
              </p>
            </div>
            <SlotTable slots={slots} onCheckout={setCheckoutSlot} onRefresh={fetchSlots} />
          </section>



          <section id="how-it-works" className="mb-16" style={{
            background: '#ffffff',
            width: '100vw',
            position: 'relative',
            left: '50%',
            right: '50%',
            marginLeft: '-50vw',
            marginRight: '-50vw',
            padding: '5rem 1rem',
          }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', zoom: '0.8' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 600, marginBottom: '2.5rem', color: '#1a1a1a' }}>How it works</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 500, flexShrink: 0 }}>1</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500, color: '#1a1a1a' }}>Choose a Spot</h3>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#666' }}>Select between micro, small, or big slots for a fixed-price 72-hour placement.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 500, flexShrink: 0 }}>2</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500, color: '#1a1a1a' }}>Book Placement</h3>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#666' }}>Enter your brand info, upload a logo, and pay the fixed price. Your spot is instantly secured.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 500, flexShrink: 0 }}>3</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500, color: '#1a1a1a' }}>Go Live</h3>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#666' }}>If the slot is empty, you go live immediately. Otherwise, you're queued and go live automatically when the current placement ends.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="mb-16" style={{ zoom: '1' }}>
            <h2>Where the money goes</h2>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)', marginTop: '1.5rem' }}>
              <p>This money will be used for my character development : <span style={{ fontWeight: 500 }}>my health, finances, and upcoming creative projects.</span></p>
            </div>
          </section>

          <section className="mb-16" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', zoom: '0.8' }}>
            <div
              className="founder-img"
              style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
            >
              <img
                src="/founder.png"
                alt="Wilson"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.parentElement.style.display = 'none'; }}
              />
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <p style={{ fontSize: '1.05rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                <span style={{ fontWeight: 500 }}>Hey, I'm Wilson.</span> Retired agency owner, currently ghostwriting for creators, full-time caffeine dependent. Built stuff before. This is probably the weirdest one, which usually means it's the right one.
              </p>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                {/* Instagram */}
                <a href="https://www.instagram.com/wil50n_7/" target="_blank" rel="noreferrer" aria-label="Instagram" className="social-icon-box">
                  <img src="/instagram.png" alt="Instagram" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                </a>

                {/* X / Twitter */}
                <a href="https://x.com/writtenbywilson" target="_blank" rel="noreferrer" aria-label="X (Twitter)" className="social-icon-box">
                  <img src="/x-logo.png" alt="X" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                </a>

                {/* LinkedIn */}
                <a href="https://www.linkedin.com/in/wilson-tom-869591210" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="social-icon-box">
                  <img src="/linkedin.png" alt="LinkedIn" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                </a>

                {/* Threads */}
                <a href="https://www.threads.net/@wil50n_7" target="_blank" rel="noreferrer" aria-label="Threads" className="social-icon-box">
                  <img src="/threads.png" alt="Threads" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
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
        marginTop: '4rem', textAlign: 'center', color: '#536471', fontSize: '0.9rem',
        zoom: '0.8'
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

      {successData?.show && (
        <SuccessModal
          levelName={currentLevel}
          onClose={() => setSuccessData(null)}
        />
      )}
    </>
  );
}

export default App;
