'use client';

import { useState, useEffect } from 'react';
import QRCodeScanner from './components/QRCodeScanner';
import CurrencyVerification from './components/CurrencyVerification';
import AdminDashboard from './components/AdminDashboard';
import IssuerDashboard from './components/IssuerDashboard';
import LoginForm from './components/LoginForm';
import GlassShell from './components/ui/GlassShell';
import GlassNav from './components/ui/GlassNav';
import { parseSerialFromVerificationInput } from '../lib/verificationUrl';

const FEATURES = [
  {
    title: 'Verify Currency',
    desc: 'Scan QR codes or enter serial numbers to verify Naira note authenticity instantly.',
    icon: (
      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Blockchain Security',
    desc: 'Tamper-proof records backed by on-chain verification and SHA-256 QR hashing.',
    icon: (
      <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Issuer Dashboard',
    desc: 'Issue official ₦50–₦1000 Naira notes with embedded serial numbers and QR codes.',
    icon: (
      <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: '1', title: 'Issue Currency', desc: 'Authorized issuers create notes with unique QR codes' },
  { n: '2', title: 'Register on Chain', desc: 'Currency details are stored for security and auditability' },
  { n: '3', title: 'Scan to Verify', desc: 'QR codes open the verification page with serial pre-filled' },
  { n: '4', title: 'Get Results', desc: 'Instant verification results with full note details' },
];

function GuestPage({ title, subtitle, onBack, children, actions }) {
  return (
    <GlassShell>
      <GlassNav title={title} subtitle={subtitle} onBack={onBack} backLabel="Home">
        {actions}
      </GlassNav>
      <div className="container mx-auto px-4 py-8">{children}</div>
    </GlassShell>
  );
}

export default function Home() {
  const [currentView, setCurrentView] = useState('home');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verifySerial, setVerifySerial] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) setUser(JSON.parse(userData));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const serial =
      params.get('verify') ||
      params.get('serial') ||
      parseSerialFromVerificationInput(window.location.href);

    if (serial) {
      setVerifySerial(serial);
      setCurrentView('verify');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentView('home');
    setVerifySerial('');
  };

  const goToVerify = (serial = '') => {
    if (serial) setVerifySerial(serial);
    setCurrentView('verify');
  };

  if (isLoading) {
    return (
      <GlassShell className="flex items-center justify-center min-h-screen">
        <div className="spinner spinner-lg" />
      </GlassShell>
    );
  }

  if (!user) {
    if (currentView === 'login') {
      return <LoginForm onLogin={handleLogin} />;
    }
    if (currentView === 'verify') {
      return (
        <GuestPage
          title="Verify Currency"
          subtitle="Check Naira note authenticity"
          onBack={() => { setCurrentView('home'); setVerifySerial(''); }}
          actions={<button onClick={() => setCurrentView('login')} className="btn btn-primary btn-sm">Login</button>}
        >
          <CurrencyVerification initialSerialNumber={verifySerial} />
        </GuestPage>
      );
    }
    if (currentView === 'scanner') {
      return (
        <GuestPage
          title="QR Scanner"
          subtitle="Scan a note to verify"
          onBack={() => setCurrentView('home')}
          actions={<button onClick={() => setCurrentView('login')} className="btn btn-primary btn-sm">Login</button>}
        >
          <QRCodeScanner onVerificationLink={goToVerify} />
        </GuestPage>
      );
    }

    return (
      <GlassShell>
        <div className="absolute inset-0 hero-glow pointer-events-none" aria-hidden="true" />

        <GlassNav title="NairaVerify" subtitle="Currency Verification System">
          <button onClick={() => setCurrentView('login')} className="btn btn-primary btn-sm">Login</button>
        </GlassNav>

        <div className="container mx-auto px-4 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-300">Blockchain-powered verification</span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold text-on-dark leading-tight mb-6">
                Verify Nigerian
                <span className="gradient-text"> Naira Notes</span>
              </h1>
              <p className="text-lg text-on-dark-muted mb-8 max-w-xl mx-auto lg:mx-0">
                Tamper-proof records, instant QR scanning, and trusted results — built for issuers, verifiers, and the public.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                <button onClick={() => goToVerify()} className="btn btn-primary btn-lg">Verify Currency</button>
                <button onClick={() => setCurrentView('scanner')} className="btn btn-gold btn-lg">Scan QR Code</button>
                <button onClick={() => setCurrentView('login')} className="btn btn-secondary btn-lg">Sign In</button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                {['Instant results', 'Tamper-proof', '₦50–₦1000 notes'].map((t) => (
                  <div key={t} className="glass px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300">{t}</div>
                ))}
              </div>
            </div>

            <div className="glass-strong rounded-3xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-on-dark">Live verification</p>
                  <p className="text-xs text-on-dark-muted">Scan a QR to validate</p>
                </div>
                <span className="badge badge-success">Active</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="col-span-2 glass rounded-2xl p-4">
                  <div className="h-2 w-1/2 rounded-full bg-emerald-500/40 mb-3" />
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/10" />
                    <div className="h-2 w-4/5 rounded-full bg-white/10" />
                    <div className="h-2 w-3/5 rounded-full bg-white/10" />
                  </div>
                  <div className="mt-4 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25" />
                </div>
                <div className="glass rounded-2xl p-3 flex flex-col items-center justify-center">
                  <div className="w-full aspect-square rounded-xl bg-emerald-500/10 border border-emerald-500/20" />
                  <span className="mt-2 text-[10px] font-semibold text-slate-400">QR</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-sm text-on-dark-muted">Status</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-20">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-on-dark mb-2">{f.title}</h3>
                <p className="text-sm text-on-dark-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-on-dark mb-3">How It Works</h2>
            <p className="text-on-dark-muted max-w-lg mx-auto">From issuance to verification — simple, secure, transparent.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="glass rounded-2xl p-6 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <span className="font-bold text-emerald-300">{s.n}</span>
                </div>
                <h4 className="font-semibold text-on-dark mb-2">{s.title}</h4>
                <p className="text-sm text-on-dark-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassShell>
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === 'issuer') {
    return <IssuerDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <GlassShell>
      <GlassNav title="NairaVerify" subtitle={`Welcome, ${user.profile.firstName}`}>
        <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
      </GlassNav>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-strong rounded-2xl p-8">
            <h2 className="section-title mb-2">Verify Currency</h2>
            <p className="section-subtitle mb-6">Enter a serial number to verify authenticity</p>
            <button onClick={() => goToVerify()} className="btn btn-primary btn-full btn-lg">
              Start Verification
            </button>
          </div>
          <div className="glass-strong rounded-2xl p-8">
            <h2 className="section-title mb-2">Scan QR Code</h2>
            <p className="section-subtitle mb-6">Use your camera for instant verification</p>
            <button onClick={() => setCurrentView('scanner')} className="btn btn-gold btn-full btn-lg">
              Open Scanner
            </button>
          </div>
        </div>
        {currentView === 'verify' && (
          <div className="mt-8">
            <CurrencyVerification user={user} initialSerialNumber={verifySerial} />
          </div>
        )}
        {currentView === 'scanner' && (
          <div className="mt-8">
            <QRCodeScanner user={user} onVerificationLink={goToVerify} />
          </div>
        )}
      </div>
    </GlassShell>
  );
}
