'use client';

import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseSerialFromVerificationInput } from '../../lib/verificationUrl';
import { useDialog } from './ui/DialogProvider';

export default function QRCodeScanner({ user = null, onVerificationLink }) {
  const { alert } = useDialog();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const html5QrCodeRef = useRef(null);
  const scannerIdRef = useRef('qr-reader-' + Math.random().toString(36).substring(7));
  const isProcessingRef = useRef(false);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      isProcessingRef.current = false;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = document.getElementById(scannerIdRef.current);
      if (!element) throw new Error('Scanner container not found. Please try again.');

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerIdRef.current);
      }

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) throw new Error('No cameras found on this device');

      const config = {
        fps: 10,
        qrbox: (w, h) => {
          const minEdge = Math.min(w, h);
          const size = Math.floor(minEdge * 0.7);
          return { width: size, height: size };
        },
        aspectRatio: 1.777778,
      };

      const onScan = (decodedText) => processQRCode(decodedText);

      try {
        const cameraId = cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id;
        await html5QrCodeRef.current.start(cameraId, config, onScan, () => {});
        setTimeout(() => setCameraReady(true), 500);
      } catch {
        await html5QrCodeRef.current.start({ facingMode: 'environment' }, config, onScan, () => {});
        setTimeout(() => setCameraReady(true), 500);
      }
    } catch (err) {
      let errorMsg = 'Camera access failed. ';
      const errMessage = err?.message || '';
      const errName = err?.name || '';

      if (errName === 'NotAllowedError') errorMsg += 'Please allow camera permissions.';
      else if (errName === 'NotFoundError') errorMsg += 'No camera found.';
      else if (errName === 'NotReadableError') errorMsg += 'Camera is in use by another app.';
      else if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        errorMsg += 'Camera requires HTTPS or localhost.';
      } else errorMsg += errMessage || 'Please try again.';

      setError(errorMsg);
      setIsScanning(false);
      setCameraReady(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = await html5QrCodeRef.current.getState();
        if (state === Html5Qrcode.SCANNING) await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      }
    } catch { /* ignore */ }
    setIsScanning(false);
    setCameraReady(false);
  };

  const processQRCode = async (qrData) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    await stopScanning();

    const serialFromLink = parseSerialFromVerificationInput(qrData);
    if (serialFromLink) {
      if (onVerificationLink) {
        onVerificationLink(serialFromLink);
        isProcessingRef.current = false;
        return;
      }
      setError(`Serial ${serialFromLink} detected. Open the Verify page to check this note.`);
      isProcessingRef.current = false;
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let qrDataObj;
      try {
        qrDataObj = JSON.parse(qrData);
      } catch {
        setError('Unrecognized QR code. Scan a NairaVerify note QR code or use serial verification.');
        setIsLoading(false);
        isProcessingRef.current = false;
        return;
      }

      const { serialNumber, qrCodeHash } = qrDataObj;

      if (serialNumber && !qrCodeHash && onVerificationLink) {
        onVerificationLink(serialNumber);
        isProcessingRef.current = false;
        setIsLoading(false);
        return;
      }

      if (!serialNumber || !qrCodeHash) {
        setError('Invalid QR code. Please scan a valid currency note or use serial verification.');
        setIsLoading(false);
        isProcessingRef.current = false;
        return;
      }

      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({ serialNumber, qrCodeHash, verificationMethod: 'qr_scan' }),
      });
      const data = await response.json();

      if (response.ok) setScanResult(data);
      else setError(data.error || 'Currency verification failed.');
    } catch {
      setError('An error occurred while verifying. Please try again.');
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    setIsLoading(false);
    setCameraReady(false);
    isProcessingRef.current = false;
  };

  const handleReportFraud = () => {
    alert({ title: 'Coming Soon', message: 'Fraud reporting will be available in a future update.', variant: 'info' });
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) html5QrCodeRef.current.stop().catch(() => {});
    };
  }, []);

  const ResultPanel = () => {
    if (!scanResult) return null;
    const valid = scanResult.isValid;

    return (
      <div className={`mt-8 rounded-2xl p-6 ${valid ? 'alert-success' : 'alert-error'}`}>
        <h3 className="text-lg font-bold mb-4">{valid ? 'Valid Currency' : 'Invalid Currency'}</h3>
        <p className="mb-5 opacity-90">{scanResult.message}</p>
        {scanResult.currency && (
          <div className="glass-form rounded-xl p-5 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['Serial', scanResult.currency.serialNumber],
                ['Denomination', `₦${scanResult.currency.denomination}`],
              ].map(([label, value]) => (
                <div key={label} className="info-block">
                  <div className="info-label">{label}</div>
                  <div className="info-value">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button onClick={resetScanner} className="btn btn-secondary btn-sm">Scan Another</button>
          {valid && <button onClick={handleReportFraud} className="btn btn-danger btn-sm">Report Fraud</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="glass-strong rounded-2xl p-6 sm:p-8">
        <div className="mb-8">
          <h2 className="section-title">QR Code Scanner</h2>
          <p className="section-subtitle">Scan a note QR code — you&apos;ll be taken to serial verification</p>
        </div>

        {!isScanning && !scanResult && (
          <div className="text-center space-y-6 py-4">
            <div className="w-28 h-28 mx-auto glass rounded-2xl flex items-center justify-center">
              <svg className="w-14 h-14 text-emerald-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="alert alert-info max-w-md mx-auto text-left text-sm">
              <p className="font-semibold mb-2">How it works</p>
              <ul className="space-y-1 opacity-90">
                <li>• Scan the QR on a printed Naira note</li>
                <li>• You&apos;ll be redirected to verify by serial number</li>
                <li>• Confirm and submit to check authenticity</li>
              </ul>
            </div>
            <button onClick={startScanning} className="btn btn-primary btn-lg">Start Camera Scanner</button>
          </div>
        )}

        {isScanning && (
          <div className="space-y-4">
            <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ minHeight: '300px' }}>
              <div id={scannerIdRef.current} className="w-full" style={{ minHeight: '300px' }} />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                  <div className="text-center text-white">
                    <div className="spinner mx-auto mb-3" />
                    <p className="text-sm font-semibold">Initializing camera...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-center">
              <button onClick={stopScanning} className="btn btn-danger">Stop Scanning</button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 alert alert-error">
            <p className="font-semibold mb-2">{error}</p>
            <button onClick={() => { setError(''); resetScanner(); }} className="btn btn-primary btn-sm mt-2">
              Try Again
            </button>
          </div>
        )}

        {isLoading && (
          <div className="mt-6 text-center">
            <div className="spinner mx-auto" />
            <p className="mt-3 text-on-dark-muted text-sm">Processing...</p>
          </div>
        )}

        <ResultPanel />
      </div>
    </div>
  );
}
