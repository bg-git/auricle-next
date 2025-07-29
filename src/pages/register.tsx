import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Seo from '@/components/Seo';

export default function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    const res = await fetch('/api/shopify/create-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setStatus('success');
      setForm({ firstName: '', lastName: '', email: '', password: '' });
      setTimeout(() => {
        router.push('/sign-in');
      }, 100);
    } else {
      setStatus('error');
    }
  };

  return (
    <>
      <Seo
        title="Register"
        description="Create a free B2B account to buy piercing jewellery from AURICLE."
      />
      <main className="register-page">
      <div className="register-container">
        <div className="register-info">
          <h1>REGISTER FREE</h1>
          <p>B2B Business Account</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <label>
            First Name
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              placeholder="First Name"
            />
          </label>

          <label>
            Last Name
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              placeholder="Last Name"
            />
          </label>

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
            {status === 'submitting' ? 'Submitting…' : 'REGISTER'}
          </button>
          <p>
  Already have an account?{' '}
  <Link href="/sign-in" style={{ color: '#181818', textDecoration: 'underline' }}>
    Sign In
  </Link>
</p>
          {status === 'success' && <p className="success-msg">✅ Registration successful! Redirecting to sign in…</p>}
          {status === 'error' && <p className="error-msg">❌Registration Failed, Please try again.</p>}
        </form>
      </div>
    </main>
    </>
  );
}
