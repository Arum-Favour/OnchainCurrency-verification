'use client';

import { useState, useEffect } from 'react';
import { NAIRA_DENOMINATIONS, getNoteAsset } from '../../lib/nairaNotes';
import { fetchPrintableNote } from '../../lib/printCurrency';
import { getQrPayloadForCurrency } from '../../lib/verificationUrl';
import GlassShell from './ui/GlassShell';
import PrintDialog from './ui/PrintDialog';
import { useDialog } from './ui/DialogProvider';

export default function AdminDashboard({ user, onLogout }) {
  const { alert, confirm } = useDialog();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    denomination: '',
    currency: 'NGN',
    quantity: 1,
  });
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printPreview, setPrintPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [printDialog, setPrintDialog] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organization: '',
    country: '',
    phone: '',
  });

  const generateQRCodeSVG = (currency) => {
    const payload = getQrPayloadForCurrency(currency) || currency.qrCodeData;
    const size = 200;
    const encoded = encodeURIComponent(payload);
    return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}" alt="QR Code" style="width: 100%; height: 100%; display: block;" />`;
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

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      
      // Ensure we always set an array, even if data.users is undefined
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Set empty array on error to prevent undefined
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/currencies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      
      // Ensure we always set an array, even if data.currencies is undefined
      setCurrencies(data.currencies || []);
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
      // Set empty array on error to prevent undefined
      setCurrencies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    if (tab === 'users') {
      fetchUsers();
    } else if (tab === 'currencies') {
      fetchCurrencies();
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newAdminUser),
      });
      const data = await response.json();

      if (response.ok) {
        await alert({
          title: 'Admin Created',
          message: `${newAdminUser.firstName} ${newAdminUser.lastName} can now sign in as an admin.`,
          variant: 'success',
        });
        setShowAddUserModal(false);
        setNewAdminUser({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          organization: '',
          country: '',
          phone: '',
        });
        fetchUsers();
      } else {
        await alert({
          title: 'Failed to Create Admin',
          message: data.error || 'Could not create user.',
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

  const handleDeleteUser = async (targetUser) => {
    if (targetUser._id === user._id) {
      await alert({
        title: 'Not Allowed',
        message: 'You cannot delete your own account.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete User',
      message: `Permanently delete ${targetUser.profile.firstName} ${targetUser.profile.lastName} (${targetUser.email})? This cannot be undone.`,
      variant: 'error',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${targetUser._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        await alert({
          title: 'User Deleted',
          message: 'The user has been removed from the system.',
          variant: 'success',
        });
        fetchUsers();
      } else {
        await alert({
          title: 'Delete Failed',
          message: data.error || 'Could not delete user.',
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

  const roleBadge = (role) => {
    const map = {
      admin: 'badge-danger',
      issuer: 'badge-info',
      verifier: 'badge-success',
    };
    return map[role] || 'badge-neutral';
  };

  const statusBadge = (status) => {
    if (status === 'active') return 'badge-success';
    if (status === 'fraudulent') return 'badge-danger';
    return 'badge-neutral';
  };

  const verifiedBadge = (isVerified) => (isVerified ? 'badge-success' : 'badge-warning');

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Dashboard Overview</h2>
        <p className="section-subtitle">System-wide issuance, verification &amp; fraud metrics</p>
      </div>
      
      {dashboardStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="stat-card glass rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <p className="stat-value">{dashboardStats.users?.total || 0}</p>
                <p className="stat-label">Total Users</p>
              </div>
            </div>
          </div>

          <div className="stat-card glass rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-500/30">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="stat-value">{dashboardStats.currencies?.totalCurrencies || 0}</p>
                <p className="stat-label">Total Currencies</p>
              </div>
            </div>
          </div>

          <div className="stat-card glass rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="stat-value">{dashboardStats.currencies?.verifiedCurrencies || 0}</p>
                <p className="stat-label">Verified Currencies</p>
              </div>
            </div>
          </div>

          <div className="stat-card glass rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="stat-value">{dashboardStats.fraud?.totalFraudReports || 0}</p>
                <p className="stat-label">Fraud Reports</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-on-dark mb-4">User Roles</h3>
          {dashboardStats?.users?.byRole && (
            <div className="space-y-3">
              {Object.entries(dashboardStats.users.byRole).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center">
                  <span className="text-on-dark-muted capitalize">{role}s</span>
                  <span className="font-semibold text-on-dark">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-on-dark mb-4">Currency Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-on-dark-muted">Active</span>
              <span className="font-semibold text-emerald-400">{dashboardStats?.currencies?.activeCurrencies || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-dark-muted">Verified</span>
              <span className="font-semibold text-teal-400">{dashboardStats?.currencies?.verifiedCurrencies || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-dark-muted">Fraudulent</span>
              <span className="font-semibold text-red-400">{dashboardStats?.currencies?.fraudulentCurrencies || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="section-subtitle">Manage roles, access &amp; account status</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddUserModal(true)}
          className="btn btn-primary w-full sm:w-auto"
        >
          Add User
        </button>
      </div>

      <div className="glass-table-wrap glass">
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users && users.length > 0 ? (
                users.map((listUser) => (
                <tr key={listUser._id}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-on-dark">
                      {listUser.profile.firstName} {listUser.profile.lastName}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-on-dark-muted">
                    {listUser.email}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`badge ${roleBadge(listUser.role)}`}>
                      {listUser.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`badge ${listUser.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {listUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {listUser._id !== user._id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(listUser)}
                        className="link-accent text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-on-dark-muted">You</span>
                    )}
                  </td>
              </tr>
            ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-on-dark-muted">
                    {isLoading ? 'Loading users...' : 'No users found.'}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );

  const renderCreateCurrency = () => (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Issue New Currency</h2>
        <p className="section-subtitle">Create verified Naira notes with embedded QR security</p>
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
        </div>

        {newCurrency.denomination && getNoteAsset(newCurrency.denomination) && (
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            <p className="text-sm font-semibold text-on-light px-4 py-2 border-b border-slate-200">
              Note preview — ₦{newCurrency.denomination}
            </p>
            <img
              src={getNoteAsset(newCurrency.denomination)}
              alt={`₦${newCurrency.denomination} Naira note`}
              className="w-full max-h-48 object-contain"
            />
          </div>
        )}

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
          <h2 className="section-title">Currency Management</h2>
          <p className="section-subtitle">View, verify &amp; manage issued currency notes</p>
        </div>
        <button 
          type="button"
          onClick={() => setCurrentTab('create')}
          className="btn btn-gold w-full sm:w-auto">
          Issue Currency
        </button>
      </div>

      <div className="glass-table-wrap glass">
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Denomination</th>
                <th>Issuer</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies && currencies.length > 0 ? (
                currencies.map((currency) => (
                <tr key={currency._id}>
                  <td className="whitespace-nowrap font-medium text-on-dark">
                    {currency.serialNumber}
                  </td>
                  <td className="whitespace-nowrap text-on-dark-muted">
                    {currency.denomination} {currency.currency}
                  </td>
                  <td className="whitespace-nowrap text-on-dark-muted">
                    {currency.issuer?.profile?.firstName} {currency.issuer?.profile?.lastName}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`badge ${statusBadge(currency.status)}`}>
                      {currency.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`badge ${verifiedBadge(currency.isVerified)}`}>
                      {currency.isVerified ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => handleViewCurrency(currency)}
                        className="link-accent"
                      >
                        View
                      </button>
                      <button type="button" className="link-accent text-red-400 hover:text-red-300">Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-on-dark-muted">
                    {isLoading ? 'Loading currencies...' : 'No currencies found. Create one to get started!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <GlassShell>
      {/* Currency Details Modal */}
      {showModal && selectedCurrency && (
        <div className="modal-overlay">
          <div className="modal-panel glass-strong">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="section-title">Currency Details</h2>
                  <p className="section-subtitle">Serial: <span className="font-mono">{selectedCurrency.serialNumber}</span></p>
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

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="glass rounded-2xl p-4">
                  <h3 className="text-lg font-semibold text-on-dark mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-on-dark-muted">Serial Number</p>
                      <p className="font-semibold text-on-dark">{selectedCurrency.serialNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-on-dark-muted">Denomination</p>
                      <p className="font-semibold text-on-dark">{selectedCurrency.denomination} {selectedCurrency.currency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-on-dark-muted">Status</p>
                      <span className={`badge ${statusBadge(selectedCurrency.status)}`}>
                        {selectedCurrency.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-on-dark-muted">Verified</p>
                      <span className={`badge ${verifiedBadge(selectedCurrency.isVerified)}`}>
                        {selectedCurrency.isVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-on-dark-muted">Issue Date</p>
                      <p className="font-semibold text-on-dark">
                        {new Date(selectedCurrency.issueDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-on-dark-muted">Verification Count</p>
                      <p className="font-semibold text-on-dark">{selectedCurrency.verificationCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Issuer Info */}
                {selectedCurrency.issuer && (
                  <div className="glass rounded-2xl p-4 border border-teal-500/20">
                    <h3 className="text-lg font-semibold text-on-dark mb-3">Issuer Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-on-dark-muted">Name</p>
                        <p className="font-semibold text-on-dark">
                          {selectedCurrency.issuer.profile?.firstName} {selectedCurrency.issuer.profile?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-on-dark-muted">Email</p>
                        <p className="font-semibold text-on-dark">{selectedCurrency.issuer.email}</p>
                      </div>
                      {selectedCurrency.issuer.profile?.organization && (
                        <div>
                          <p className="text-sm text-on-dark-muted">Organization</p>
                          <p className="font-semibold text-on-dark">{selectedCurrency.issuer.profile.organization}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Blockchain Info */}
                {selectedCurrency.blockchain && selectedCurrency.blockchain.transactionHash && (
                  <div className="glass rounded-2xl p-4 border border-emerald-500/20">
                    <h3 className="text-lg font-semibold text-on-dark mb-3">Blockchain Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-on-dark-muted">Transaction Hash</p>
                        <p className="font-mono text-sm text-on-dark break-all">{selectedCurrency.blockchain.transactionHash}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-on-dark-muted">Block Number</p>
                          <p className="font-semibold text-on-dark">{selectedCurrency.blockchain.blockNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-on-dark-muted">Network</p>
                          <p className="font-semibold text-on-dark">{selectedCurrency.blockchain.network || 'localhost'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Note Preview */}
                <div className="glass rounded-2xl p-4">
                  <h3 className="text-lg font-semibold text-on-dark mb-3">Printable Note Preview</h3>
                  {isLoadingPreview ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="spinner" />
                      <p className="text-on-dark-muted text-sm">Generating preview with serial &amp; QR...</p>
                    </div>
                  ) : printPreview ? (
                    <>
                      <img
                        src={printPreview}
                        alt={`₦${selectedCurrency.denomination} note with serial and QR`}
                        className="w-full rounded-xl border border-white/10"
                      />
                      <p className="text-xs text-on-dark-muted mt-2">Serial number and QR code are embedded on the note image.</p>
                    </>
                  ) : getNoteAsset(selectedCurrency.denomination) ? (
                    <>
                      <img
                        src={getNoteAsset(selectedCurrency.denomination)}
                        alt={`₦${selectedCurrency.denomination} Naira note`}
                        className="w-full max-h-48 object-contain rounded-xl border border-white/10"
                      />
                      <p className="text-xs text-on-dark-muted mt-2">Preview unavailable — print to generate note with overlays.</p>
                    </>
                  ) : null}
                </div>

                {/* QR Code Info */}
                <div className="glass rounded-2xl p-4 border border-emerald-500/20">
                  <h3 className="text-lg font-semibold text-on-dark mb-3">QR Code &amp; Security</h3>
                  <div className="flex flex-col md:flex-row gap-4">
                    {selectedCurrency.qrCodeData && (
                      <div className="flex flex-col items-center">
                        <p className="text-sm text-on-dark-muted mb-2">QR Code</p>
                        <div className="glass-form rounded-xl p-4">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: generateQRCodeSVG(selectedCurrency)
                            }}
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-xs text-on-dark-muted mt-2 text-center max-w-xs">
                          Scans open the verification page with serial pre-filled
                        </p>
                        {selectedCurrency.metadata?.verificationUrl && (
                          <p className="text-xs text-emerald-400/80 mt-1 font-mono break-all text-center max-w-xs">
                            {selectedCurrency.metadata.verificationUrl}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <p className="text-sm text-on-dark-muted mb-2">QR Code Hash (SHA-256)</p>
                      <p className="font-mono text-xs text-on-light break-all glass-form rounded-xl p-3">{selectedCurrency.qrCodeHash}</p>
                      
                      {selectedCurrency.qrCodeData && (
                        <div className="mt-4">
                          <p className="text-sm text-on-dark-muted mb-2">QR Code Data</p>
                          <pre className="font-mono text-xs text-on-light break-all glass-form rounded-xl p-3 overflow-x-auto">
                            {JSON.stringify(JSON.parse(selectedCurrency.qrCodeData), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedCurrency.metadata && (
                  <div className="glass rounded-2xl p-4 border border-amber-500/20">
                    <h3 className="text-lg font-semibold text-on-dark mb-3">Additional Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedCurrency.metadata.batchNumber && (
                        <div>
                          <p className="text-sm text-on-dark-muted">Batch Number</p>
                          <p className="font-semibold text-on-dark">{selectedCurrency.metadata.batchNumber}</p>
                        </div>
                      )}
                      {selectedCurrency.metadata.qualityGrade && (
                        <div>
                          <p className="text-sm text-on-dark-muted">Quality Grade</p>
                          <p className="font-semibold text-on-dark">Grade {selectedCurrency.metadata.qualityGrade}</p>
                        </div>
                      )}
                      {selectedCurrency.metadata.productionDate && (
                        <div>
                          <p className="text-sm text-on-dark-muted">Production Date</p>
                          <p className="font-semibold text-on-dark">
                            {new Date(selectedCurrency.metadata.productionDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedCurrency.metadata.notes && (
                      <div className="mt-4">
                        <p className="text-sm text-on-dark-muted">Notes</p>
                        <p className="text-on-dark">{selectedCurrency.metadata.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePrintCurrency}
                  disabled={isPrinting}
                  className="btn btn-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {isPrinting ? 'Preparing...' : 'Print Currency'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="glass-nav sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-on-dark">Admin Dashboard</h1>
              <p className="text-sm text-on-dark-muted mt-0.5">Manage issuance, verification &amp; fraud insights</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-3">
              <span className="text-on-dark-muted text-sm">Welcome, <span className="font-semibold text-on-dark">{user.profile.firstName}</span></span>
              <span className={`badge ${roleBadge(user.role)}`}>
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-danger btn-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="tab-group glass rounded-2xl">
            <button
              type="button"
              onClick={() => handleTabChange('dashboard')}
              className={`tab-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('create')}
              className={`tab-btn ${currentTab === 'create' ? 'active' : ''}`}
            >
              Issue
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('users')}
              className={`tab-btn ${currentTab === 'users' ? 'active' : ''}`}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('currencies')}
              className={`tab-btn ${currentTab === 'currencies' ? 'active' : ''}`}
            >
              Currencies
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('reports')}
              className={`tab-btn ${currentTab === 'reports' ? 'active' : ''}`}
            >
              Reports
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        )}

        {currentTab === 'dashboard' && renderDashboard()}
        {currentTab === 'create' && renderCreateCurrency()}
        {currentTab === 'users' && renderUsers()}
        {currentTab === 'currencies' && renderCurrencies()}
        {currentTab === 'reports' && (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-on-dark-muted">Reports section coming soon...</p>
          </div>
        )}
      </div>

      <PrintDialog
        open={Boolean(printDialog)}
        onClose={() => setPrintDialog(null)}
        printableImage={printDialog?.printableImage}
        serialNumber={printDialog?.serialNumber}
        denomination={printDialog?.denomination}
      />

      {showAddUserModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setShowAddUserModal(false)}
        >
          <div className="modal-panel glass-strong p-6 max-w-lg w-full">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-on-dark">Add Admin User</h2>
                <p className="text-sm text-on-dark-muted mt-1">Create a new administrator account</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddUser} className="glass-form rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adminFirstName" className="form-label">First name *</label>
                  <input
                    id="adminFirstName"
                    type="text"
                    className="form-input"
                    value={newAdminUser.firstName}
                    onChange={(e) => setNewAdminUser({ ...newAdminUser, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="adminLastName" className="form-label">Last name *</label>
                  <input
                    id="adminLastName"
                    type="text"
                    className="form-input"
                    value={newAdminUser.lastName}
                    onChange={(e) => setNewAdminUser({ ...newAdminUser, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="adminEmail" className="form-label">Email *</label>
                <input
                  id="adminEmail"
                  type="email"
                  className="form-input"
                  value={newAdminUser.email}
                  onChange={(e) => setNewAdminUser({ ...newAdminUser, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="adminPassword" className="form-label">Password *</label>
                <input
                  id="adminPassword"
                  type="password"
                  className="form-input"
                  value={newAdminUser.password}
                  onChange={(e) => setNewAdminUser({ ...newAdminUser, password: e.target.value })}
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label htmlFor="adminOrganization" className="form-label">Organization</label>
                <input
                  id="adminOrganization"
                  type="text"
                  className="form-input"
                  value={newAdminUser.organization}
                  onChange={(e) => setNewAdminUser({ ...newAdminUser, organization: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adminCountry" className="form-label">Country</label>
                  <input
                    id="adminCountry"
                    type="text"
                    className="form-input"
                    value={newAdminUser.country}
                    onChange={(e) => setNewAdminUser({ ...newAdminUser, country: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="adminPhone" className="form-label">Phone</label>
                  <input
                    id="adminPhone"
                    type="tel"
                    className="form-input"
                    value={newAdminUser.phone}
                    onChange={(e) => setNewAdminUser({ ...newAdminUser, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="btn btn-primary btn-sm">
                  {isLoading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlassShell>
  );
}
