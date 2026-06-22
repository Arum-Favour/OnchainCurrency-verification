'use client';

import { useState, useEffect } from 'react';
import { NAIRA_DENOMINATIONS, getNoteAsset } from '../../lib/nairaNotes';
import { fetchPrintableNote } from '../../lib/printCurrency';
import GlassShell from './ui/GlassShell';
import PrintDialog from './ui/PrintDialog';
import { useDialog } from './ui/DialogProvider';

export default function IssuerDashboard({ user, onLogout }) {
  const { alert } = useDialog();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printPreview, setPrintPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [printDialog, setPrintDialog] = useState(null);
  const [newCurrency, setNewCurrency] = useState({
    denomination: '',
    currency: 'NGN',
    quantity: 1,
    qualityGrade: 'A',
    notes: ''
  });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/currency', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setCurrencies(data.currencies || []);
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
      setCurrencies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCurrency = async (currency) => {
    setSelectedCurrency(currency);
    setShowModal(true);
    setPrintPreview(null);
    setIsLoadingPreview(true);
    try {
      const response = await fetch(
        `/api/currency/printable/${encodeURIComponent(currency.serialNumber)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setPrintPreview(data.printableImage);
      }
    } catch (error) {
      console.error('Failed to load print preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCurrency(null);
    setPrintPreview(null);
  };

  const handlePrintCurrency = async () => {
    if (!selectedCurrency) return;
    setIsPrinting(true);
    try {
      const data = await fetchPrintableNote(
        selectedCurrency.serialNumber,
        localStorage.getItem('token')
      );
      setPrintDialog({
        printableImage: data.printableImage,
        serialNumber: data.serialNumber,
        denomination: data.denomination,
      });
    } catch (error) {
      await alert({
        title: 'Print Failed',
        message: error.message || 'Failed to prepare printable note.',
        variant: 'error',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCreateCurrency = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/currency/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newCurrency,
          denomination: parseInt(newCurrency.denomination, 10),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await alert({
          title: 'Success',
          message: 'Currency created successfully!',
          variant: 'success',
        });
        setNewCurrency({
          denomination: '',
          currency: 'NGN',
          quantity: 1,
          qualityGrade: 'A',
          notes: ''
        });
        fetchCurrencies();
      } else {
        await alert({
          title: 'Creation Failed',
          message: data.error || 'Failed to create currency',
          variant: 'error',
        });
      }
    } catch {
      await alert({
        title: 'Network Error',
        message: 'Please check your connection and try again.',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = (status) => {
    if (status === 'active') return 'badge badge-success';
    if (status === 'fraudulent') return 'badge badge-danger';
    return 'badge badge-neutral';
  };

  const verifiedBadge = (isVerified) =>
    isVerified ? 'badge badge-success' : 'badge badge-warning';

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Issuer Dashboard</h2>
        <p className="section-subtitle">Overview of your issued currency notes</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="stat-card glass">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="stat-value">{currencies.length}</p>
              <p className="stat-label">Total Issued</p>
            </div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="stat-value">{currencies.filter(c => c.isVerified).length}</p>
              <p className="stat-label">Verified</p>
            </div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="stat-value">{currencies.filter(c => !c.isVerified).length}</p>
              <p className="stat-label">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreateCurrency = () => (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Issue New Currency</h2>
        <p className="section-subtitle">Create and register new Naira notes for issuance</p>
      </div>
      
      <form onSubmit={handleCreateCurrency} className="glass-form rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="denomination" className="form-label">
              Denomination *
            </label>
            <select
              id="denomination"
              value={newCurrency.denomination}
              onChange={(e) => setNewCurrency({...newCurrency, denomination: e.target.value})}
              className="form-select"
              required
            >
              <option value="">Select Naira note</option>
              {NAIRA_DENOMINATIONS.map((d) => (
                <option key={d} value={d}>₦{d} Naira</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="currency" className="form-label">
              Currency
            </label>
            <select
              id="currency"
              value={newCurrency.currency}
              onChange={(e) => setNewCurrency({...newCurrency, currency: e.target.value})}
              className="form-select"
              disabled
            >
              <option value="NGN">NGN - Nigerian Naira (₦)</option>
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="form-label">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              value={newCurrency.quantity}
              onChange={(e) => setNewCurrency({...newCurrency, quantity: parseInt(e.target.value)})}
              className="form-input"
              min="1"
              max="100"
              required
            />
          </div>

          <div>
            <label htmlFor="qualityGrade" className="form-label">
              Quality Grade
            </label>
            <select
              id="qualityGrade"
              value={newCurrency.qualityGrade}
              onChange={(e) => setNewCurrency({...newCurrency, qualityGrade: e.target.value})}
              className="form-select"
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </div>
        </div>

        {newCurrency.denomination && getNoteAsset(newCurrency.denomination) && (
          <div className="info-block overflow-hidden">
            <p className="info-label mb-2">
              Note preview — ₦{newCurrency.denomination}
            </p>
            <img
              src={getNoteAsset(newCurrency.denomination)}
              alt={`₦${newCurrency.denomination} Naira note`}
              className="w-full max-h-48 object-contain rounded-lg"
            />
          </div>
        )}

        <div>
          <label htmlFor="notes" className="form-label">
            Notes
          </label>
          <textarea
            id="notes"
            value={newCurrency.notes}
            onChange={(e) => setNewCurrency({...newCurrency, notes: e.target.value})}
            className="form-textarea"
            rows="3"
            placeholder="Additional notes"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-full"
        >
          {isLoading ? 'Creating...' : 'Issue Currency'}
        </button>
      </form>
    </div>
  );

  const renderCurrencies = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="section-title">My Currencies</h2>
          <p className="section-subtitle">All notes issued under your account</p>
        </div>
        <button
          onClick={() => setCurrentTab('create')}
          className="btn btn-primary w-full sm:w-auto"
        >
          Issue New Currency
        </button>
      </div>

      <div className="glass-table-wrap glass overflow-x-auto">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Serial Number</th>
              <th>Denomination</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Issue Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currencies && currencies.length > 0 ? (
              currencies.map((currency) => (
              <tr key={currency._id}>
                <td className="font-medium text-on-dark">
                  {currency.serialNumber}
                </td>
                <td className="text-on-dark-muted">
                  ₦{currency.denomination} {currency.currency}
                </td>
                <td>
                  <span className={statusBadge(currency.status)}>
                    {currency.status}
                  </span>
                </td>
                <td>
                  <span className={verifiedBadge(currency.isVerified)}>
                    {currency.isVerified ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="text-on-dark-muted">
                  {new Date(currency.issueDate).toLocaleDateString()}
                </td>
                <td>
                  <button
                    onClick={() => handleViewCurrency(currency)}
                    className="link-accent btn-sm"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-8 text-on-dark-muted">
                  {isLoading ? 'Loading currencies...' : 'No currencies found. Create one to get started!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <GlassShell>
      {showModal && selectedCurrency && (
        <div className="modal-overlay">
          <div className="modal-panel glass-strong p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="section-title">Currency Details</h2>
                <p className="section-subtitle mt-1">
                  Serial: <span className="font-mono text-on-dark">{selectedCurrency.serialNumber}</span>
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                aria-label="Close currency details modal"
                className="btn btn-secondary btn-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="info-block">
                  <p className="info-label">Denomination</p>
                  <p className="info-value">₦{selectedCurrency.denomination} NGN</p>
                </div>
                <div className="info-block">
                  <p className="info-label">Status</p>
                  <p className="info-value capitalize">{selectedCurrency.status}</p>
                </div>
              </div>

              <div className="glass-form rounded-2xl p-4">
                <p className="form-label mb-3">Printable Note Preview</p>
                {isLoadingPreview ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="spinner" />
                    <p className="text-on-light-muted text-sm">Generating preview...</p>
                  </div>
                ) : printPreview ? (
                  <img
                    src={printPreview}
                    alt={`₦${selectedCurrency.denomination} note`}
                    className="w-full rounded-lg border border-slate-200"
                  />
                ) : getNoteAsset(selectedCurrency.denomination) ? (
                  <>
                    <img
                      src={getNoteAsset(selectedCurrency.denomination)}
                      alt={`₦${selectedCurrency.denomination} note`}
                      className="w-full max-h-48 object-contain rounded-lg border border-slate-200"
                    />
                    <p className="text-xs text-on-light-muted mt-2">Print to embed serial and QR on the note.</p>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={handlePrintCurrency}
                disabled={isPrinting}
                className="btn btn-primary"
              >
                {isPrinting ? 'Preparing...' : 'Print Currency'}
              </button>
              <button
                onClick={handleCloseModal}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="glass-nav sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-on-dark">Issuer Dashboard</h1>
              <p className="text-sm text-on-dark-muted mt-0.5">Issue and manage Naira currency notes</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-on-dark-muted text-sm">
              Welcome, <span className="font-semibold text-on-dark">{user.profile.firstName}</span>
            </span>
            <button
              onClick={onLogout}
              className="btn btn-danger btn-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="tab-group glass mb-8">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`tab-btn${currentTab === 'dashboard' ? ' active' : ''}`}
            type="button"
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentTab('create')}
            className={`tab-btn${currentTab === 'create' ? ' active' : ''}`}
            type="button"
          >
            Issue Currency
          </button>
          <button
            onClick={() => setCurrentTab('currencies')}
            className={`tab-btn${currentTab === 'currencies' ? ' active' : ''}`}
            type="button"
          >
            My Currencies
          </button>
        </div>

        {isLoading && currentTab !== 'dashboard' && (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        )}

        {currentTab === 'dashboard' && renderDashboard()}
        {currentTab === 'create' && renderCreateCurrency()}
        {currentTab === 'currencies' && renderCurrencies()}
      </div>

      <PrintDialog
        open={Boolean(printDialog)}
        onClose={() => setPrintDialog(null)}
        printableImage={printDialog?.printableImage}
        serialNumber={printDialog?.serialNumber}
        denomination={printDialog?.denomination}
      />
    </GlassShell>
  );
}
