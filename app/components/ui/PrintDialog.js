'use client';

import { useEffect } from 'react';

export default function PrintDialog({
  open,
  onClose,
  printableImage,
  serialNumber,
  denomination,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handlePrint = () => {
    window.print();
  };

  if (!open || !printableImage) return null;

  return (
    <>
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-dialog-title"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal-panel glass-strong p-6 max-w-4xl w-full">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 id="print-dialog-title" className="text-lg font-bold text-on-dark">
                Print Currency Note
              </h2>
              <p className="text-sm text-on-dark-muted mt-1">
                ₦{denomination} — <span className="font-mono">{serialNumber}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 mb-6">
            <img
              src={printableImage}
              alt={`₦${denomination} note — ${serialNumber}`}
              className="w-full h-auto max-h-[50vh] object-contain mx-auto"
            />
          </div>

          <p className="text-xs text-on-dark-muted mb-4">
            The QR code on this note links to the verification page where anyone can enter the serial number to check authenticity.
          </p>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="button" onClick={handlePrint} className="btn btn-primary btn-sm">
              Print Note
            </button>
          </div>
        </div>
      </div>

      {/* Off-screen print target — visible only when printing */}
      <div className="print-only" aria-hidden="true">
        <img
          src={printableImage}
          alt={`₦${denomination} Naira Note`}
        />
      </div>
    </>
  );
}
