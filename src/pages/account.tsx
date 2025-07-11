import { useEffect } from 'react';

export default function AccountPage() {
  useEffect(() => {
    document.title = 'My Account';
  }, []);

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>My Account</h1>

      {/* Orders Section */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Orders</h2>
        <div style={{ border: '1px solid #e0e0e0', padding: '16px', background: '#f9f9f9' }}>
          <p style={{ fontSize: '14px' }}>No orders yet.</p>
        </div>
      </section>

      {/* Details Section */}
      <section>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Details</h2>
        <div style={{ border: '1px solid #e0e0e0', padding: '16px', background: '#f9f9f9' }}>
          <p style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Name:</strong> Jane Doe
          </p>
          <p style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Email:</strong> jane@example.com
          </p>
          <p style={{ fontSize: '14px' }}>
            <strong>Address:</strong><br />
            123 Fake Street<br />
            London<br />
            UK
          </p>
        </div>
      </section>
    </main>
  );
}
