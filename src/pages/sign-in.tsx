import { useState } from 'react';

export default function SignIn() {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    const res = await fetch('/api/shopify/sign-in-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setStatus('success');
      setForm({ email: '', password: '' });
    } else {
      setStatus('error');
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

          <button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Signing in…' : 'Sign In'}
          </button>

          {status === 'success' && <p className="success-msg">✅ Signed in successfully</p>}
          {status === 'error' && <p className="error-msg">❌ Invalid email or password</p>}
        </form>
      </div>
    </main>
  );
}
