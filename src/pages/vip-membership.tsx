// src/pages/vip-membership.tsx
import { useState } from 'react';

type ApiResponse = {
  url?: string;
  error?: string;
};

export default function VipMembershipPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseJsonSafely = (text: string): ApiResponse | null => {
    try {
      const data = JSON.parse(text) as ApiResponse;
      return data;
    } catch {
      return null;
    }
  };

  // --- Become VIP handler ---
  const handleBecomeVip = async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const text = await res.text();
      const data = parseJsonSafely(text);

      if (!data) {
        console.error('Non-JSON response from checkout-session API:', text);
        setError('Unexpected server response starting checkout.');
        setLoading(false);
        return;
      }

      if (!res.ok || !data.url) {
        setError(data.error || 'Unable to start VIP checkout.');
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Error starting VIP checkout:', err);
      setError('Something went wrong starting the VIP checkout.');
      setLoading(false);
    }
  };

  // --- Manage Membership handler ---
  const handleManageMembership = async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const text = await res.text();
      const data = parseJsonSafely(text);

      if (!data) {
        console.error('Non-JSON response from portal-session API:', text);
        setError('Unexpected server response opening billing portal.');
        setLoading(false);
        return;
      }

      if (!res.ok || !data.url) {
        setError(data.error || 'Unable to open billing portal.');
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError('Something went wrong opening billing portal.');
      setLoading(false);
    }
  };

  return (
    <main
      style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}
    >
      <h1>VIP Membership</h1>
      <p>Test flow: Stripe checkout and Stripe billing portal below.</p>

      {/* Become VIP */}
      <button
        type="button"
        onClick={handleBecomeVip}
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
          marginTop: '1rem',
        }}
      >
        {loading ? 'Processing…' : 'Become VIP'}
      </button>

      {/* Manage Membership */}
      <button
        type="button"
        onClick={handleManageMembership}
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
          marginTop: '1rem',
          display: 'block',
        }}
      >
        {loading ? 'Processing…' : 'Manage Membership'}
      </button>

      {error && (
        <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>
      )}
    </main>
  );
}
