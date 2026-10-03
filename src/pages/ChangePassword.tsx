import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const ChangePasswordPage: React.FC = () => {
  const { currentUser, changePassword, isOwner } = useAuth();
  const { t } = useLanguage();

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
  const isDifferentFromCurrent = newPassword !== currentPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('Current password is required.');
      return;
    }

    if (newPassword.length < 12) {
      setErrorMessage('Security policy requires at least 12 characters for your new password.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSuccessMessage('Your password has been securely updated and stored.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(res.error || 'Failed to update password. Please check your current password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while updating password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-stone-200">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">
          Admin Profile & Security
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Manage your account credentials, role details, and authentication security.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-stone-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-lg border border-amber-300">
            {currentUser?.displayName.charAt(0) || 'A'}
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {currentUser?.displayName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500 font-mono">
              <span>@{currentUser?.username}</span>
              <span>•</span>
              <span className="capitalize font-semibold text-amber-800">
                {isOwner ? 'System Administrator (Owner)' : currentUser?.role}
              </span>
              <span>•</span>
              <span>Branch Scope: {currentUser?.branch.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Account Status</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
              <ShieldCheck size={14} /> Active & Secured
            </span>
          </div>
          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Permissions</span>
            <span className="font-semibold text-stone-700 mt-0.5 block">
              {isOwner ? 'Full System Configuration & Multi-Branch Access' : 'Branch Staff Access'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <KeyRound className="text-amber-700" size={18} />
            <h2 className="text-sm font-bold text-stone-900">
              Change Password
            </h2>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
            Password Policy: 12+ Chars
          </span>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Current Password
            </label>
            <div className="relative rounded-xl shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Lock size={15} />
              </div>
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="block w-full pl-9 pr-10 py-2 text-xs text-stone-900 bg-stone-50/70 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              New Password
            </label>
            <div className="relative rounded-xl shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Lock size={15} />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                className="block w-full pl-9 pr-10 py-2 text-xs text-stone-900 bg-stone-50/70 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 font-mono"
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

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative rounded-xl shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Lock size={15} />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="block w-full pl-9 pr-10 py-2 text-xs text-stone-900 bg-stone-50/70 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 font-mono"
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

          {/* Validation helpers */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] space-y-1">
            <div className={`flex items-center gap-1.5 ${passwordLengthValid ? 'text-emerald-700 font-semibold' : 'text-stone-500'}`}>
              <span>{passwordLengthValid ? '✓' : '○'}</span>
              <span>At least 12 characters ({newPassword.length}/12)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isDifferentFromCurrent ? 'text-emerald-700 font-semibold' : 'text-stone-500'}`}>
              <span>{isDifferentFromCurrent ? '✓' : '○'}</span>
              <span>Different from current password</span>
            </div>
            <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-stone-500'}`}>
              <span>{passwordsMatch ? '✓' : '○'}</span>
              <span>New password and confirmation match</span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100">
            <button
              type="submit"
              disabled={isSubmitting || !passwordLengthValid || !passwordsMatch || !isDifferentFromCurrent}
              className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 focus:outline-hidden focus:ring-2 focus:ring-amber-600 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
