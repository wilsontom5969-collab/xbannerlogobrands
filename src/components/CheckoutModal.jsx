import { useState } from 'react';

export default function CheckoutModal({ slot, onClose, onSubmit }) {
  const [brandName, setBrandName] = useState('');
  const [website, setWebsite] = useState('');
  const [handle, setHandle] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoMime, setLogoMime] = useState(null);

  let minBid = slot?.current_bid / 100;
  if (slot?.status === 'live') {
    if (slot.size === 'big') {
      minBid = Math.ceil((slot.current_bid * 1.1) / 100);
    } else if (slot.size === 'small') {
      minBid = Math.floor(slot.current_bid / 100) + 1;
    }
    
    if (minBid <= slot.current_bid / 100) {
      minBid = Math.floor(slot.current_bid / 100) + 1;
    }
  }

  const [isProcessing, setIsProcessing] = useState(false);

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
    
    // Validation
    if (['big', 'small'].includes(slot.size) && Number(bidAmount) < minBid) {
      alert(`Bid must be at least ₹${minBid.toLocaleString()}`);
      return;
    }

    setIsProcessing(true);
    const finalAmount = ['big', 'small'].includes(slot.size) ? Number(bidAmount) * 100 : slot.current_bid;

    try {
      // 1. Call our secure serverless function to create the order
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

      // 2. Build PayU Form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://secure.payu.in/_payment';
      
      const baseUrl = 'https://letbannercook.vercel.app';

      const params = {
        key: orderData.key,
        txnid: orderData.order_id,
        amount: orderData.amount,
        productinfo: orderData.productinfo,
        firstname: orderData.firstname,
        email: orderData.email,
        phone: '9999999999', // Required by PayU, dummy value if not collected
        surl: `${baseUrl}/api/verify-payment`,
        furl: `${baseUrl}/api/verify-payment`,
        hash: orderData.hash
      };

      for (const [k, v] of Object.entries(params)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();

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
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%', maxWidth: '500px',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            {slot.size === 'big' ? 'Place Bid' : 'Buy Slot'} ({slot.id.toUpperCase()})
          </h2>
          <button onClick={onClose} style={{ fontSize: '1.5rem', cursor: 'pointer', border: 'none', background: 'none' }}>×</button>
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
              type="file" accept="image/*"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} 
            />
            <small style={{ color: '#536471' }}>Max 2MB. Square (1:1) recommended.</small>
          </div>

          {['big', 'small'].includes(slot.size) ? (
             <div className="mb-4">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Bid Amount (₹)</label>
              <input 
                type="number" required min={minBid}
                value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid var(--color-accent)' }} 
              />
              <small style={{ color: '#536471' }}>Minimum bid: ₹{minBid.toLocaleString()}</small>
            </div>
          ) : (
            <div className="mb-4" style={{ padding: '1rem', background: 'var(--color-hover)', borderRadius: '8px' }}>
              <strong>Total Amount: ₹{(slot.current_bid / 100).toLocaleString()}</strong>
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isProcessing} style={{ width: '100%', opacity: isProcessing ? 0.7 : 1 }}>
              {isProcessing ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
