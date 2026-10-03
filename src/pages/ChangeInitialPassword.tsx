import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, AlertTriangle, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BakeryLogo } from '../components/common/BakeryLogo';

interface ChangeInitialPasswordProps {
  onSuccess?: () => void;
}

export const ChangeInitialPassword: React.FC<ChangeInitialPasswordProps> = ({ onSuccess }) => {
  const { currentUser, changeInitialPassword, confirmLogout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordLengthValid = newPassword.length >= 12;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromDefault = newPassword.toLowerCase() !== 'admin' && newPassword !== currentPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('Please enter the current installation password.');
      return;
    }

    if (newPassword.length < 12) {
      setErrorMessage('Security policy requires a strong password of at least 12 characters.');
      return;
    }

    if (newPassword.toLowerCase() === 'admin' || newPassword === currentPassword) {
      setErrorMessage('New password cannot be the installation default ("admin") or your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await changeInitialPassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSuccessMessage('Admin password updated successfully! Redirecting to Dashboard...');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to update initial password. Please verify current credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving new password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <BakeryLogo size="xl" className="mb-3" />
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Mi'aawaa Bakery
          </h1>
          <p className="mt-1 text-xs text-amber-900/80 font-medium">
            System Administration & Security Configuration
          </p>
        </div>

        {/* Security Warning Card */}
        <div className="mt-6 bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert size={22} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-950">
                Action Required: Change Initial Admin Password
              </h2>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                You have authenticated using the default installation credentials (<code className="font-mono bg-amber-200/70 px-1 py-0.5 rounded font-bold">admin / admin</code>).
                To safeguard production bakery data, financial records, and user management, you must establish a secure permanent password before accessing the system.
              </p>
            </div>
          </div>
        </div>

        {/* Password Change Form Card */}
        <div className="mt-4 bg-white py-8 px-6 shadow-sm border border-stone-200/90 rounded-2xl sm:px-10">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-amber-700" />
              <span className="text-sm font-bold text-stone-900">
                Account: @{currentUser?.username || 'admin'}
              </span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-100 text-red-800">
              Mandatory Setup
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Current Password Field */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Current Installation Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password (admin)"
                  className="block w-full pl-9 pr-10 py-2.5 text-xs text-stone-900 bg-stone-50/70 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Installation temporary default is <code className="font-mono font-bold">admin</code>.
              </p>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                New Strong Admin Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="block w-full pl-9 pr-10 py-2.5 text-xs text-stone-900 bg-stone-50/70 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="block w-full pl-9 pr-10 py-2.5 text-xs text-stone-900 bg-stone-50/70 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Password Policy Checklist */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] space-y-1">
              <div className="font-bold text-stone-700 mb-1">Password Policy Requirements:</div>
              <div className={`flex items-center gap-1.5 ${passwordLengthValid ? 'text-emerald-700 font-semibold' : 'text-stone-500'}`}>
                <span>{passwordLengthValid ? '✓' : '○'}</span>
                <span>Minimum length of at least 12 characters ({newPassword.length}/12)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isDifferentFromDefault ? 'text-emerald-700 font-semibold' : 'text-stone-500'}`}>
                <span>{isDifferentFromDefault ? '✓' : '○'}</span>
                <span>Different from temporary default ("admin")</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-stone-500'}`}>
                <span>{passwordsMatch ? '✓' : '○'}</span>
                <span>Both new password fields match exactly</span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !passwordLengthValid || !passwordsMatch || !isDifferentFromDefault}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 focus:outline-hidden focus:ring-2 focus:ring-amber-600 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Saving Password & Initializing...' : 'Save New Password & Continue to System'}
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                className="w-full py-2 px-3 text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} />
                <span>Cancel and Sign Out</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
