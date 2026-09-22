import { useState, useEffect, useRef } from 'react';
import './index.css';
import BannerDisplay from './components/BannerDisplay';
import SlotTable from './components/SlotTable';
import CheckoutModal from './components/CheckoutModal';
import TermsPolicy from './components/TermsPolicy';
import CharacterStatus, { getCharacterLevel } from './components/CharacterStatus';
import SuccessModal from './components/SuccessModal';
import NotFound from './components/NotFound';

import { supabase } from './lib/supabaseClient';

const FadeInSection = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    if (domRef.current) {
      observer.observe(domRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`fade-up-section ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const path = window.location.pathname;
    if (path !== '/' && path !== '/index.html') {
      return '404';
    }
    return 'home';
  });
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
      <header style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', background: '#ffffff', position: 'relative' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <a href="/" style={{ display: 'block', zIndex: 100 }}>
            <img
              src="/logo.png"
              alt="Let The Banner Cook"
              style={{ height: '30px', width: 'auto', display: 'block' }}
            />
          </a>
          
          <button 
            className="mobile-menu-btn hide-desktop"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', zIndex: 100, padding: '0.5rem' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>

          <nav className="nav-links hide-mobile" style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
            <a href="#slots" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0 }}>Slots</a>
            <a href="#wtf-is-this" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0 }}>WTF is Brand My Arc?</a>
            <a href="#how-it-works" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0 }}>How does this works</a>
            <a href="#about" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0 }}>About Founder</a>
            <a href="https://x.com/writtenbywilson" target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', color: '#2C2C2C', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center' }} aria-label="X (Twitter)">
              <svg viewBox="0 0 512 512" aria-hidden="true" style={{ height: '1.15em', width: '1.15em', fill: 'currentColor' }}><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" /></svg>
            </a>
          </nav>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-dropdown-menu" style={{
            position: 'absolute', top: '100%', left: 0, right: 0, 
            background: 'white', borderBottom: '1px solid var(--color-border)', 
            padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem',
            alignItems: 'flex-end',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 90
          }}>
            <a href="#slots" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1rem', color: '#2C2C2C', fontWeight: 500, padding: '0.5rem 0', textAlign: 'right' }}>Slots</a>
            <a href="#wtf-is-this" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1rem', color: '#2C2C2C', fontWeight: 500, padding: '0.5rem 0', textAlign: 'right' }}>WTF is Brand My Arc?</a>
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1rem', color: '#2C2C2C', fontWeight: 500, padding: '0.5rem 0', textAlign: 'right' }}>How it works</a>
            <a href="#about" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '1rem', color: '#2C2C2C', fontWeight: 500, padding: '0.5rem 0', textAlign: 'right' }}>About Founder</a>
            <a href="https://x.com/writtenbywilson" onClick={() => setIsMobileMenuOpen(false)} target="_blank" rel="noreferrer" style={{ fontSize: '1rem', color: '#2C2C2C', fontWeight: 500, padding: '0.5rem 0', display: 'flex', alignItems: 'center', textAlign: 'right' }}>
              X (Twitter)
            </a>
          </div>
        )}
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
            <h1 className="hero-title" style={{
              fontSize: '64px',
              fontWeight: 500,
              lineHeight: '67.2px',
              letterSpacing: '-3.84px',
              marginBottom: '1.5rem',
              color: '#2C2C2C',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              Sponsor my <br /> <span style={{ color: '#2C2C2C' }}>Character Development</span>
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '1.35rem', color: '#2C2C2C', maxWidth: '600px', margin: '0 auto', marginBottom: '2rem', fontWeight: 400 }}>
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

          <section id="wtf-is-this" className="mb-16" style={{
            background: '#fafafa',
            width: '100vw',
            position: 'relative',
            left: '50%',
            right: '50%',
            marginLeft: '-50vw',
            marginRight: '-50vw',
            padding: '5rem 1rem',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <FadeInSection>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', zoom: '0.8' }}>
              <h2 className="section-title" style={{ fontSize: '2.5rem', fontWeight: 600, marginBottom: '2.5rem', color: '#1a1a1a' }}>WTF is <span className="text-accent">Brand My Arc</span>?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <FadeInSection delay={0.1}>
                  <p style={{ fontSize: '1.25rem', lineHeight: '1.7', color: '#1a1a1a', fontWeight: 500, margin: 0 }}>
                    You sponsor my character development.<br />
                    I put your brand on my banner.
                  </p>
                </FadeInSection>
                <FadeInSection delay={0.2}>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#475569', margin: 0 }}>
                    I’m documenting my journey of becoming someone I’m proud of, learning new skills, taking risks, building things, failing, improving, and figuring life out along the way.
                  </p>
                </FadeInSection>
                <FadeInSection delay={0.3}>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#475569', margin: 0 }}>
                    Brands can sponsor that journey by putting their logo on my X banner.
                  </p>
                </FadeInSection>
                <FadeInSection delay={0.4}>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#475569', margin: 0 }}>
                    Your money helps fund the person I’m becoming.<br />
                    Your logo becomes part of the story.
                  </p>
                </FadeInSection>
                <FadeInSection delay={0.5}>
                  <p style={{ fontSize: '1.25rem', lineHeight: '1.7', color: '#1a1a1a', fontWeight: 600, margin: 0, marginTop: '1rem' }}>
                    That’s Brand My Arc.
                  </p>
                </FadeInSection>
              </div>
            </div>
            </FadeInSection>
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
            <FadeInSection>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', zoom: '0.8' }}>
              <h2 className="section-title" style={{ fontSize: '2.5rem', fontWeight: 600, marginBottom: '2.5rem', color: '#1a1a1a' }}>How TF Does <span className="text-accent">Brand My Arc</span> work?</h2>
              <div className="mobile-gap-md" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <FadeInSection delay={0.1}>
                <div className="mobile-step-gap" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 500, flexShrink: 0 }}>1</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500, color: '#1a1a1a' }}>Choose a Spot</h3>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#666' }}>Select between micro, small, or big slots for a fixed-price 72-hour placement.</p>
                  </div>
                </div>
                </FadeInSection>
                <FadeInSection delay={0.2}>
                <div className="mobile-step-gap" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 500, flexShrink: 0 }}>2</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500, color: '#1a1a1a' }}>Book Placement</h3>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#666' }}>Enter your brand info, upload a logo, and pay the fixed price. Your spot is instantly secured.</p>
                  </div>
                </div>
                </FadeInSection>
                <FadeInSection delay={0.3}>
                <div className="mobile-step-gap" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 500, flexShrink: 0 }}>3</div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 500, color: '#1a1a1a' }}>Go Live</h3>
                    <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#666' }}>If the slot is empty, you go live immediately. Otherwise, you're queued and go live automatically when the current placement ends.</p>
                  </div>
                </div>
                </FadeInSection>
              </div>
            </div>
            </FadeInSection>
          </section>

          <section id="about" className="mb-16" style={{ zoom: '1' }}>
            <h2>Where the money goes</h2>
            <div style={{ background: 'white', padding: '1.25rem 2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)', marginTop: '1.5rem' }}>
              <p style={{ margin: 0, color: '#475569' }}>Every rupee helps write the next chapter of who I’m becoming from <span style={{ fontWeight: 500, color: '#1a1a1a' }}>taking better care of myself to trying things I’ve never done before.</span></p>
            </div>
          </section>

          <section className="mb-16 mobile-mb-lg founder-flex" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', zoom: '0.8' }}>
            <div
              className="founder-img mobile-founder-img"
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
      ) : currentView === 'terms' ? (
        <TermsPolicy onBack={() => setCurrentView('home')} />
      ) : (
        <NotFound onHome={() => setCurrentView('home')} />
      )}

      <footer style={{
        borderTop: '1px solid var(--color-border)', padding: '3rem 0',
        marginTop: '4rem', color: '#536471', fontSize: '0.9rem',
        zoom: '0.8'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0 2rem' }}>
          <div className="footer-links" style={{ display: 'flex', gap: '2rem' }}>
            <a href="#terms" onClick={(e) => { e.preventDefault(); setCurrentView('terms'); window.scrollTo(0, 0); }} style={{ textDecoration: 'underline' }}>Terms & Refund Policy</a>
            <a href="mailto:wilsontom5969@gmail.com" style={{ textDecoration: 'underline' }}>wilsontom5969@gmail.com</a>
          </div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>
            &copy; 2026 Wilson, Brand My Arc. All rights reserved.
          </div>
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
