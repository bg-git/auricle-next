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

          {status === 'success' && <p className="success-msg">✅ Signed in successfully! Redirecting to account...</p>}
          {status === 'error' && <p className="error-msg">❌ {errorMessage}</p>}
        </form>
      </div>
    </main>
  );
}
