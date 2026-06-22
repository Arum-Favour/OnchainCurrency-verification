'use client';

import { useState } from 'react';
import GlassShell from './ui/GlassShell';

export default function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organization: '',
    country: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        onRegister(data.user, data.token);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassShell className="flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center mb-4 shadow-lg shadow-emerald-900/40">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-on-dark">Create account</h2>
          <p className="mt-2 text-on-dark-muted text-sm">
            Join the Naira currency verification platform
          </p>
        </div>

        <div className="glass-form rounded-2xl p-8">
          <p className="text-center text-sm text-on-light-muted mb-6">
            Already registered?{' '}
            <button type="button" onClick={onSwitchToLogin} className="link-accent">
              Sign in
            </button>
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="form-label">First name</label>
                <input id="firstName" name="firstName" type="text" required className="form-input" placeholder="First name" value={formData.firstName} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="lastName" className="form-label">Last name</label>
                <input id="lastName" name="lastName" type="text" required className="form-input" placeholder="Last name" value={formData.lastName} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="form-input" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required className="form-input" placeholder="Create a strong password" value={formData.password} onChange={handleChange} />
            </div>

            <div>
              <label htmlFor="organization" className="form-label">Organization <span className="font-normal text-slate-400">(optional)</span></label>
              <input id="organization" name="organization" type="text" className="form-input" placeholder="Organization name" value={formData.organization} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="form-label">Country <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="country" name="country" type="text" className="form-input" placeholder="Country" value={formData.country} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="phone" className="form-label">Phone <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="phone" name="phone" type="tel" className="form-input" placeholder="Phone number" value={formData.phone} onChange={handleChange} />
              </div>
            </div>

            {error && <div className="alert alert-error-light">{error}</div>}

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-full btn-lg">
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </GlassShell>
  );
}
