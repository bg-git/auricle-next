import { useState } from 'react';

export default function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

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
      setForm({ firstName: '', lastName: '', email: '', company: '' });
    } else {
      setStatus('error');
    }
  };

  return (
    <main className="register-page">
      <div className="register-layout">
        {/* Left Column (black background) */}
        <div className="register-info">
          <h1>REGISTER FREE</h1>
          <p>B2B Business Account</p>
        </div>

        {/* Right Column (form) */}
        <form className="register-form" onSubmit={handleSubmit}>
          <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} required />
          <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input name="company" placeholder="Company Name" value={form.company} onChange={handleChange} required />

          <button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting...' : 'Register'}
          </button>

          {status === 'success' && <p>✅ Registration successful</p>}
          {status === 'error' && <p>❌ Something went wrong</p>}
        </form>
      </div>
    </main>
  );
}
