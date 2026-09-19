'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Brand from './Brand';
import { api, jsonOptions } from '@/lib/client-api';

export default function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError('');
    try {
      await api('/api/auth/login', jsonOptions('POST', { email: values.get('email'), password: values.get('password') }));
      form.reset();
      router.replace('/repository');
      router.refresh();
    } catch (error) { setError(error.message); setBusy(false); }
  }

  return <section className="login-screen"><div className="login-card">
    <Brand />
    <div className="eyebrow">RECCE → INSTALLATION</div>
    <h1>Your work, connected<span>.</span></h1>
    <form onSubmit={signIn}>
      <div className="form-grid">
        <label className="full">Email<input name="email" type="email" autoComplete="username" required placeholder="Your Email" /></label>
        <label className="full">Password<input name="password" type="password" autoComplete="current-password" required placeholder="Your existing password" /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}

      
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to your repository ↗'}</button>
    </form>
    <p className="login-footnote">One account. The same recce data across both websites.</p>
  </div></section>;
}
