import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ResetPassword() {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Ensure router is ready so query is stable
    if (!router.isReady) return;

    const { id, token } = router.query;
    if (typeof id === 'string') setUserId(id);
    if (typeof token === 'string') setResetToken(token);
  }, [router.isReady, router.query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    if (!resetToken) {
      setStatus('error');
      setErrorMessage('No reset token found');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setStatus('error');
      setErrorMessage('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setStatus('error');
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    try {
      const res = await fetch('/api/shopify/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: userId,
          resetToken,
          password: form.password,
        }),
      });

      const data: { success?: boolean; error?: string } = await res.json();

      if (!res.ok || !data.success) {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to reset password');
      } else {
        setStatus('success');
        setTimeout(() => {
          router.push('/sign-in');
        }, 1000);
      }
    } catch {
  setStatus('error');
  setErrorMessage('Network error. Please try again.');
}
  };

  if (!resetToken || !userId) {
    return (
      <main className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-info">
            <h1>RESET PASSWORD</h1>
            <p>Invalid reset link</p>
          </div>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'red', marginBottom: '20px' }}>
              This password reset link is invalid.
            </p>
            <button className="primary-btn" onClick={() => router.push('/sign-in')}>
              Back to Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-info">
          <h1>RESET PASSWORD</h1>
          <p>Enter your new password</p>
        </div>

        <form className="reset-password-form" onSubmit={handleSubmit}>
          <label>
            New Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Enter new password"
              minLength={6}
            />
          </label>

          <label>
            Confirm New Password
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm new password"
              minLength={6}
            />
          </label>

          <button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Resetting Password…' : 'Reset Password'}
          </button>

          {status === 'success' && (
            <p className="success-msg">Password reset successfully! Redirecting to sign-in page...</p>
          )}
          {status === 'error' && <p className="error-msg">{errorMessage}</p>}
        </form>
      </div>
    </main>
  );
}
