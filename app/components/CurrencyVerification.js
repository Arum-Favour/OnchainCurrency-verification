'use client';

import { useState, useEffect } from 'react';
import { useDialog } from './ui/DialogProvider';

export default function CurrencyVerification({ user = null, initialSerialNumber = '' }) {
  const { alert } = useDialog();
  const [serialNumber, setSerialNumber] = useState(initialSerialNumber);
  const [qrCodeHash, setQrCodeHash] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromQr, setFromQr] = useState(Boolean(initialSerialNumber));

  useEffect(() => {
    if (initialSerialNumber) {
      setSerialNumber(initialSerialNumber);
      setFromQr(true);
      setVerificationResult(null);
      setError('');
    }
  }, [initialSerialNumber]);

  const handleSerialVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setVerificationResult(null);
    setFromQr(false);

    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/verification/quick/' + encodeURIComponent(serialNumber), {
        method: 'GET',
        headers,
      });
      const data = await response.json();

      if (response.ok) setVerificationResult(data);
      else setError(data.error || data.message || 'Verification failed');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ serialNumber, qrCodeHash, verificationMethod: 'qr_scan' }),
      });
      const data = await response.json();

      if (response.ok) setVerificationResult(data);
      else setError(data.error || 'Verification failed');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSerialNumber('');
    setQrCodeHash('');
    setVerificationResult(null);
    setError('');
    setFromQr(false);
  };

  const handleReportFraud = () => {
    alert({
      title: 'Coming Soon',
      message: 'Fraud reporting will be available in a future update.',
      variant: 'info',
    });
  };

  const ResultPanel = () => {
    if (!verificationResult) return null;
    const valid = verificationResult.isValid ?? verificationResult.status === 'valid';

    return (
      <div className={`mt-8 rounded-2xl p-6 ${valid ? 'alert-success' : 'alert-error'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${valid ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {valid ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
          <h3 className="text-lg font-bold">{valid ? 'Valid Currency' : 'Invalid Currency'}</h3>
        </div>

        <p className="mb-5 opacity-90">{verificationResult.message}</p>

        {(verificationResult.currency || verificationResult.serialNumber) && (
          <div className="glass-form rounded-xl p-5 mb-5">
            <h4 className="font-semibold text-on-light mb-4">Currency Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['Serial Number', verificationResult.currency?.serialNumber || verificationResult.serialNumber],
                ['Denomination', verificationResult.currency ? `₦${verificationResult.currency.denomination} ${verificationResult.currency.currency}` : '—'],
                ['Issue Date', verificationResult.currency?.issueDate ? new Date(verificationResult.currency.issueDate).toLocaleDateString() : '—'],
                ['Verifications', verificationResult.currency?.verificationCount ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="info-block">
                  <div className="info-label">{label}</div>
                  <div className="info-value">{value}</div>
                </div>
              ))}
              {verificationResult.currency?.issuer && (
                <div className="info-block sm:col-span-2">
                  <div className="info-label">Issuer</div>
                  <div className="info-value">
                    {verificationResult.currency.issuer.profile?.firstName} {verificationResult.currency.issuer.profile?.lastName}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button onClick={resetForm} className="btn btn-secondary btn-sm">Verify Another</button>
          {valid && (
            <button onClick={handleReportFraud} className="btn btn-danger btn-sm">
              Report Fraud
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="glass-strong rounded-2xl p-6 sm:p-8">
        <div className="mb-8">
          <h2 className="section-title">Currency Verification</h2>
          <p className="section-subtitle">Enter the serial number from your Naira note to verify authenticity</p>
        </div>

        {fromQr && serialNumber && !verificationResult && (
          <div className="alert alert-info mb-6">
            Serial number <span className="font-mono font-semibold">{serialNumber}</span> was loaded from a QR code.
            Review it below and click <strong>Verify Serial Number</strong> to check authenticity.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-form rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-on-light mb-4">By Serial Number</h3>
            <form onSubmit={handleSerialVerification} className="space-y-4">
              <div>
                <label htmlFor="serialNumber" className="form-label">Serial Number</label>
                <input
                  type="text"
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => { setSerialNumber(e.target.value); setFromQr(false); }}
                  className="form-input font-mono"
                  placeholder="Enter currency serial number"
                  required
                  autoFocus={Boolean(initialSerialNumber)}
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn btn-primary btn-full">
                {isLoading ? 'Verifying...' : 'Verify Serial Number'}
              </button>
            </form>
          </div>

          <div className="glass-form rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-on-light mb-4">By QR Code Hash</h3>
            <p className="text-sm text-on-light-muted mb-4">Advanced: use the hash from the note&apos;s QR metadata if available.</p>
            <form onSubmit={handleQRVerification} className="space-y-4">
              <div>
                <label htmlFor="serialNumberQR" className="form-label">Serial Number</label>
                <input type="text" id="serialNumberQR" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="form-input font-mono" placeholder="Enter currency serial number" required />
              </div>
              <div>
                <label htmlFor="qrCodeHash" className="form-label">QR Code Hash</label>
                <input type="text" id="qrCodeHash" value={qrCodeHash} onChange={(e) => setQrCodeHash(e.target.value)} className="form-input font-mono text-sm" placeholder="Enter QR code hash" required />
              </div>
              <button type="submit" disabled={isLoading} className="btn btn-gold btn-full">
                {isLoading ? 'Verifying...' : 'Verify QR Code'}
              </button>
            </form>
          </div>
        </div>

        {error && <div className="mt-6 alert alert-error">{error}</div>}
        <ResultPanel />
      </div>
    </div>
  );
}
