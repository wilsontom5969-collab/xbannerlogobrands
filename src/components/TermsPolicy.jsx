import React from 'react';

const TermsPolicy = ({ onBack }) => {
  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', minHeight: '80vh' }}>
      <button 
        onClick={onBack}
        className="btn btn-outline"
        style={{ marginBottom: '2rem' }}
      >
        ← Back to Home
      </button>

      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', letterSpacing: '-0.03em' }}>
        Terms & Refund Policy
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600' }}>1. Slot Purchases & Bidding</h2>
          <p style={{ color: '#536471', lineHeight: '1.6' }}>
            All slot purchases and bids are final. When you purchase a fixed-price slot, it is immediately reserved for you pending content approval. For bidding slots, you will only be charged if your bid is successful and you remain the highest bidder when the slot is finalized.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600' }}>2. Content Guidelines</h2>
          <p style={{ color: '#536471', lineHeight: '1.6' }}>
            We reserve the right to reject any logo, website link, or brand name that contains explicit material, hate speech, illegal content, or anything deemed inappropriate. If your content is rejected, you will be refunded in full.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600' }}>3. Display Duration & Guarantees</h2>
          <p style={{ color: '#536471', lineHeight: '1.6' }}>
            Logos are displayed on the X (Twitter) banner as outlined in the slot description. While we guarantee placement upon approval, we do not guarantee specific impression counts, clicks, or engagement metrics from the banner.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600' }}>4. Refund Policy</h2>
          <p style={{ color: '#536471', lineHeight: '1.6' }}>
            Due to the digital real-estate nature of this service, <strong>no refunds</strong> will be issued once a logo has gone live on the banner. Refunds are only provided if we explicitly reject your submitted content prior to placement, or in the event of a critical technical failure on our end.
          </p>
        </section>
        
        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600' }}>5. Modifications</h2>
          <p style={{ color: '#536471', lineHeight: '1.6' }}>
            We reserve the right to modify these terms or the layout of the banner at any time. Any significant structural changes to the banner that affect live slots will be communicated to current slot holders.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPolicy;
