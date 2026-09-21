import { useState } from 'react';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutModal({ slot, onClose }) {
  const [brandName, setBrandName] = useState('');
  const [website, setWebsite] = useState('');
  const [handle, setHandle] = useState('');
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoMime, setLogoMime] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fixedPrice = slot?.size === 'big' ? 19999 : slot?.size === 'small' ? 6999 : 2999;

  // Calculate schedule
  let startsAtStr = 'Immediately';
  let endsAtStr = '';
  let now = new Date();
  
  if (slot?.bookings && slot.bookings.length > 0) {
    const sorted = [...slot.bookings].sort((a, b) => new Date(b.ends_at) - new Date(a.ends_at));
    const lastEnd = new Date(sorted[0].ends_at);
    if (lastEnd > now) {
      startsAtStr = lastEnd.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      endsAtStr = new Date(lastEnd.getTime() + 72 * 60 * 60 * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } else {
      endsAtStr = new Date(now.getTime() + 72 * 60 * 60 * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }
  } else {
    endsAtStr = new Date(now.getTime() + 72 * 60 * 60 * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Please upload a valid image file.");
        e.target.value = '';
        setLogoBase64(null);
        setLogoMime(null);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("File must be smaller than 2MB");
        e.target.value = '';
        setLogoBase64(null);
        setLogoMime(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setLogoBase64(base64String);
        setLogoMime(file.type);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoBase64(null);
      setLogoMime(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const finalAmount = fixedPrice * 100; // in paise

    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slotId: slot.id, 
          amount: finalAmount,
          brandName,
          website,
          xHandle: handle,
          logoBase64,
          logoMime
        })
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your connection.');
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Let The Banner Cook',
        description: `Booking for ${slot.id.toUpperCase()}`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            // Post the payment signature to verify-payment endpoint
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (!verifyRes.ok) {
              const errData = await verifyRes.json();
              throw new Error(errData.error || 'Payment verification failed');
            }

            window.location.href = '/?payment_success=true';
          } catch (err) {
            console.error(err);
            alert('Verification Error: ' + err.message);
            window.location.href = '/?payment_failed=true';
          }
        },
        prefill: {
          name: brandName || 'User',
          email: 'customer@letthebannercook.com',
        },
        theme: {
          color: '#1DA1F2'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();

    } catch (error) {
      console.error(error);
      alert('Checkout error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!slot) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }}>
      <div className="checkout-modal-inner" style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%', maxWidth: '500px',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.035em', fontFamily: 'var(--font-family)' }}>
            Book Placement ({slot.id.toUpperCase()})
          </h2>
          <button onClick={onClose} style={{ fontSize: '1.5rem', cursor: 'pointer', border: 'none', background: 'none' }}>×</button>
        </div>

        <div style={{ background: 'var(--color-hover)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontFamily: 'var(--font-family)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#536471' }}>Duration:</span>
            <span style={{ fontWeight: 500, color: '#1a1a1a' }}>72 Hours</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#536471' }}>Your Placement Starts:</span>
            <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{startsAtStr}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#536471' }}>Your Placement Ends:</span>
            <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{endsAtStr}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.8rem 0' }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1a1a1a' }}>
            <span style={{ fontWeight: 500 }}>Fixed Price:</span>
            <span style={{ fontWeight: 500 }}>₹{fixedPrice.toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Brand Name</label>
            <input 
              type="text" required 
              value={brandName} onChange={e => setBrandName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
            />
          </div>
          
          <div className="mb-4">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Website URL</label>
            <input 
              type="url" required 
              value={website} onChange={e => setWebsite(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
            />
          </div>

          <div className="mb-4">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>X (Twitter) Handle</label>
            <input 
              type="text" placeholder="@handle" 
              value={handle} onChange={e => setHandle(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
            />
          </div>

          <div className="mb-4">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Logo Upload</label>
            <input 
              type="file" accept="image/*" required
              onChange={handleFileChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
            />
            <small style={{ color: '#536471' }}>Max 2MB. Square (1:1) recommended.</small>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isProcessing} style={{ width: '100%', opacity: isProcessing ? 0.7 : 1 }}>
              {isProcessing ? 'Processing...' : `Pay ₹${fixedPrice.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
