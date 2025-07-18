import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';

export default function SignIn() {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [forgotMsg, setForgotMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const result = await signIn(form.email, form.password);

    if (result.success) {
      setStatus('success');
      setForm({ email: '', password: '' });
      // Redirect to account page after successful sign in
      setTimeout(() => {
        router.push('/account');
      }, 100);
    } else {
      setStatus('error');
      setErrorMessage('You credentials are incorrect. Please try again.');
    }
  };

  // Forgot password submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus('submitting');
    setForgotMsg('');
    try {
      const res = await fetch('/api/shopify/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setForgotStatus('error');
        setForgotMsg(data.error || 'Failed to send reset email.');
      } else {
        setForgotStatus('success');
        setForgotMsg('Password reset email sent! Please check your inbox.');
      }
    } catch (err: any) {
      setForgotStatus('error');
      setForgotMsg('Network error.');
    }
  };

  return (
    <main className="sign-in-page">
      <div className="sign-in-container">
        <div className="sign-in-info">
          <h1>SIGN IN</h1>
          <p>Access your business account</p>
        </div>

        <form className="sign-in-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="Email"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Password"
            />
          </label>

          {/* Forgot Password Link */}
          <div style={{ margin: '8px 0' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#333333', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              onClick={() => setShowForgot((v) => !v)}
            >
              Forgot Password?
            </button>
          </div>

          {showForgot && (
            <div style={{ marginBottom: 12 }}>
              <form onSubmit={handleForgotSubmit}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  style={{ width: '100%', marginBottom: 4 }}
                />
                <button type="submit" disabled={forgotStatus === 'submitting'} style={{ width: '100%' }}>
                  {forgotStatus === 'submitting' ? 'Sending…' : 'Send Reset Email'}
                </button>
                {forgotStatus === 'success' && <div style={{ color: 'green', marginTop: 4 }}>{forgotMsg}</div>}
                {forgotStatus === 'error' && <div style={{ color: 'red', marginTop: 4 }}>{forgotMsg}</div>}
              </form>
            </div>
          )}

          <button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Signing in…' : 'Sign In'}
          </button>

          {status === 'success' && <p className="success-msg">✅ Signed in successfully! Redirecting to account...</p>}
          {status === 'error' && <p className="error-msg">❌ {errorMessage}</p>}
        </form>
      </div>
    </main>
  );
}
