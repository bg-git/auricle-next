import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Seo from '@/components/Seo';
import RegisterModal from '@/components/RegisterModal';

// Shared register email text
const wholesaleMailto = `mailto:info@auricle.co.uk?subject=${encodeURIComponent(
  'Wholesale Enquiry'
)}&body=${encodeURIComponent(
  `Hey,
    
Thank you for your interest in becoming an authorised AURICLE stockist.

To ensure access is reserved exclusively for verified piercing studios and jewellery retailers, please complete the details below. This helps us confirm eligibility and activate your wholesale account as quickly as possible.

First Name = 

Last Name = 

Company Name = 

Email Address = 

Trading Address = 

Website = 

Social Media = 

Phone Number =

Once we’ve confirmed your business details, we’ll respond to this email with your access credentials. Verification is usually completed within one hour.

Best Regards
Auricle`
)}`;

// WhatsApp details – same as header/footer
const whatsappNumber = '447757690863';

const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  `Hey,

Thank you for your interest in becoming an authorised AURICLE stockist.

To ensure access is reserved exclusively for verified piercing studios and jewellery retailers, please complete the details below and send them in this chat:

First Name = 
Last Name = 
Company Name = 
Email Address = 
Trading Address = 
Website = 
Social Media = 
Phone Number = 

Once we’ve confirmed your business details, we’ll respond via email or WhatsApp with your access credentials. Verification is usually completed within one hour.

Best Regards
Auricle`
)}`;

export default function SignIn() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [forgotMsg, setForgotMsg] = useState('');

  // Register modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

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
      setTimeout(() => {
        router.push('/account');
      }, 100);
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Your credentials are incorrect. Please try again.');
    }
  };

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
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      setForgotStatus('error');
      setForgotMsg('Network error.');
    }
  };

  return (
    <>
      <Seo
        title="Sign In"
        description="Sign in to your AURICLE wholesale account."
      />
      <main className="sign-in-page">
        <div className="sign-in-container">
          <div className="sign-in-info">
            <h1>SIGN IN</h1>
            <p>Access your business account</p>
          </div>

          {!showForgot ? (
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

              <div style={{ margin: '8px 0' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#333333',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                  onClick={() => setShowForgot(true)}
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Signing in…' : 'SIGN IN'}
              </button>

              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#181818',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Join Us
                </button>
              </p>

              {status === 'success' && (
                <p className="success-msg">
                  Signed in successfully! Redirecting to account...
                </p>
              )}
              {status === 'error' && (
                <p className="error-msg">{errorMessage}</p>
              )}
            </form>
          ) : (
            <form className="sign-in-form" onSubmit={handleForgotSubmit}>
              <label>
                Enter your email to reset password
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  style={{ width: '100%', marginBottom: 4 }}
                />
              </label>
              <button
                type="submit"
                disabled={forgotStatus === 'submitting'}
                style={{ width: '100%' }}
              >
                {forgotStatus === 'submitting' ? 'Sending…' : 'Send Reset Email'}
              </button>
              {forgotStatus === 'success' && (
                <div style={{ color: 'green', marginTop: 4 }}>{forgotMsg}</div>
              )}
              {forgotStatus === 'error' && (
                <div style={{ color: 'red', marginTop: 4 }}>{forgotMsg}</div>
              )}
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#333333',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                  onClick={() => setShowForgot(false)}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <RegisterModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        whatsappLink={whatsappLink}
        emailHref={wholesaleMailto}
      />
    </>
  );
}
