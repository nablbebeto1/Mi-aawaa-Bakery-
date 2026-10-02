import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ShieldAlert,
  Search,
  KeyRound,
  Edit2,
  CheckCircle2,
  XCircle,
  Building,
  ShieldCheck,
  AlertTriangle,
  X,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { User, Role, BranchScope } from '../types';
import { hashPassword } from '../utils/crypto';

export const UserManagement: React.FC = () => {
  const { currentUser, isOwner, refreshCurrentUser } = useAuth();
  const { t } = useLanguage();

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    role: 'sales' as Role,
    branch: 'coka' as BranchScope,
    status: 'active' as 'active' | 'inactive'
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(storage.getUsers());
  };

  // If someone other than owner reaches this component, show strict access denied banner
  if (!isOwner || !currentUser) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
          <ShieldAlert className="text-red-600 shrink-0 mt-1" size={24} />
          <div>
            <h2 className="text-base font-bold text-red-900">
              {t('auth.accessDenied')}
            </h2>
            <p className="mt-1 text-sm text-red-700">
              {t('auth.managerUserBlocked')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesBranch = filterBranch === 'all' || u.branch === filterBranch || u.branch === 'both';
    return matchesSearch && matchesRole && matchesBranch;
  });

  // Handle Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setStatusMessage({ type: 'error', text: t('users.passwordMatchError') });
      return;
    }

    if (formData.password.length < 6) {
      setStatusMessage({ type: 'error', text: t('users.passwordLengthError') });
      return;
    }

    try {
      const { hash, salt } = await hashPassword(formData.password);

      storage.createUser(
        {
          username: formData.username,
          displayName: formData.displayName,
          passwordHash: hash,
          salt,
          role: formData.role,
          branch: formData.branch,
          status: formData.status
        },
        currentUser
      );

      setStatusMessage({ type: 'success', text: t('users.userCreatedSuccess') });
      setIsAddModalOpen(false);
      setFormData({
        username: '',
        displayName: '',
        password: '',
        confirmPassword: '',
        role: 'sales',
        branch: 'coka',
        status: 'active'
      });
      loadUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Edit User
  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setStatusMessage(null);

    try {
      storage.updateUser(
        editingUser.id,
        {
          username: editingUser.username,
          displayName: editingUser.displayName,
          role: editingUser.role,
          branch: editingUser.branch,
          status: editingUser.status
        },
        currentUser
      );

      setStatusMessage({ type: 'success', text: t('users.userUpdatedSuccess') });
      setEditingUser(null);
      loadUsers();
      refreshCurrentUser();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setStatusMessage(null);

    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setStatusMessage({ type: 'error', text: t('users.passwordMatchError') });
      return;
    }

    if (resetPasswordData.password.length < 6) {
      setStatusMessage({ type: 'error', text: t('users.passwordLengthError') });
      return;
    }

    try {
      const { hash, salt } = await hashPassword(resetPasswordData.password);
      storage.resetPassword(resettingUser.id, hash, salt, currentUser);

      setStatusMessage({ type: 'success', text: t('users.passwordResetSuccess') });
      setResettingUser(null);
      setResetPasswordData({ password: '', confirmPassword: '' });
      loadUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Toggle user active status
  const handleToggleStatus = (target: User) => {
    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    try {
      storage.updateUser(target.id, { status: newStatus }, currentUser);
      setStatusMessage({
        type: 'success',
        text: `Account for ${target.username} set to ${newStatus}.`
      });
      loadUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('users.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Owner Only
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('users.subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              username: '',
              displayName: '',
              password: '',
              confirmPassword: '',
              role: 'sales',
              branch: 'coka',
              status: 'active'
            });
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <UserPlus size={16} />
          <span>{t('users.add')}</span>
        </button>
      </div>

      {/* Status alert message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-stone-200">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by username or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-amber-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="owner">{t('role.owner')}</option>
            <option value="manager">{t('role.manager')}</option>
            <option value="production">{t('role.production')}</option>
            <option value="sales">{t('role.sales')}</option>
          </select>

          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700 cursor-pointer"
          >
            <option value="all">All Branches</option>
            <option value="coka">Coka Branch</option>
            <option value="mizan">Mizan Branch</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t('auth.username')}</th>
                <th className="px-4 py-3">{t('users.displayName')}</th>
                <th className="px-4 py-3">{t('users.role')}</th>
                <th className="px-4 py-3">{t('users.branch')}</th>
                <th className="px-4 py-3">{t('app.status')}</th>
                <th className="px-4 py-3">{t('users.createdDate')}</th>
                <th className="px-4 py-3 text-right">{t('app.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                    No user accounts found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-stone-900">
                      @{user.username}
                      {user.id === currentUser.id && (
                        <span className="ml-1.5 text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-sm">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-800 font-semibold">
                      {user.displayName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-800">
                        <ShieldCheck size={12} className="text-amber-700" />
                        {t(`role.${user.role}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-600">
                        <Building size={12} className="text-stone-400" />
                        {user.branch === 'coka'
                          ? 'Coka Branch'
                          : user.branch === 'mizan'
                          ? 'Mizan Branch'
                          : 'Both Branches'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 size={13} />
                          {t('users.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-[11px]">
                          <XCircle size={13} />
                          {t('users.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-[11px] tabular-nums">
                      {user.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingUser({ ...user })}
                          className="p-1.5 text-stone-600 hover:text-amber-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title={t('users.edit')}
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => {
                            setResettingUser(user);
                            setResetPasswordData({ password: '', confirmPassword: '' });
                          }}
                          className="p-1.5 text-stone-600 hover:text-amber-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title={t('users.resetPassword')}
                        >
                          <KeyRound size={14} />
                        </button>

                        {/* Activate / Deactivate Button */}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.id === currentUser.id && user.status === 'active'}
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            user.status === 'active'
                              ? 'text-red-700 hover:bg-red-50 disabled:opacity-30'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={
                            user.status === 'active'
                              ? t('users.deactivate')
                              : t('users.activate')
                          }
                        >
                          {user.status === 'active' ? t('users.deactivate') : t('users.activate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('users.add')}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {/* Username without email */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('auth.username')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. sales_coka_2"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  {t('users.usernameHelp')} No email required.
                </span>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('users.displayName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Chala Tolera"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                />
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('auth.password')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('auth.confirmPassword')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Role & Branch selection with strict operational rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('users.role')}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as Role;
                      let defaultBranch: BranchScope = 'coka';
                      if (newRole === 'owner' || newRole === 'manager') defaultBranch = 'both';
                      else if (newRole === 'production') defaultBranch = 'coka';
                      setFormData({ ...formData, role: newRole, branch: defaultBranch });
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 cursor-pointer"
                  >
                    <option value="owner">{t('role.owner')}</option>
                    <option value="manager">{t('role.manager')}</option>
                    <option value="production">{t('role.production')}</option>
                    <option value="sales">{t('role.sales')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('users.branch')}
                  </label>
                  <select
                    value={formData.branch}
                    disabled={formData.role === 'owner' || formData.role === 'manager' || formData.role === 'production'}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value as BranchScope })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 disabled:opacity-60 cursor-pointer"
                  >
                    {formData.role === 'owner' || formData.role === 'manager' ? (
                      <option value="both">Both Branches (Coka & Mizan)</option>
                    ) : formData.role === 'production' ? (
                      <option value="coka">Coka Branch (Main Center)</option>
                    ) : (
                      <>
                        <option value="coka">Coka Branch</option>
                        <option value="mizan">Mizan Branch</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('app.status')}
                </label>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={() => setFormData({ ...formData, status: 'active' })}
                    />
                    <span>{t('users.active')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={() => setFormData({ ...formData, status: 'inactive' })}
                    />
                    <span>{t('users.inactive')}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {t('users.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('users.edit')}: @{editingUser.username}
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('auth.username')}
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('users.displayName')}
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.displayName}
                  onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('users.role')}
                  </label>
                  <select
                    value={editingUser.role}
                    disabled={editingUser.id === currentUser.id}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as Role })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="owner">{t('role.owner')}</option>
                    <option value="manager">{t('role.manager')}</option>
                    <option value="production">{t('role.production')}</option>
                    <option value="sales">{t('role.sales')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('users.branch')}
                  </label>
                  <select
                    value={editingUser.branch}
                    disabled={editingUser.role === 'owner' || editingUser.role === 'manager' || editingUser.role === 'production'}
                    onChange={(e) => setEditingUser({ ...editingUser, branch: e.target.value as BranchScope })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 disabled:opacity-60 cursor-pointer"
                  >
                    {editingUser.role === 'owner' || editingUser.role === 'manager' ? (
                      <option value="both">Both Branches</option>
                    ) : editingUser.role === 'production' ? (
                      <option value="coka">Coka Branch</option>
                    ) : (
                      <>
                        <option value="coka">Coka Branch</option>
                        <option value="mizan">Mizan Branch</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('app.status')}
                </label>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      value="active"
                      checked={editingUser.status === 'active'}
                      onChange={() => setEditingUser({ ...editingUser, status: 'active' })}
                    />
                    <span>{t('users.active')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      value="inactive"
                      disabled={editingUser.id === currentUser.id}
                      checked={editingUser.status === 'inactive'}
                      onChange={() => setEditingUser({ ...editingUser, status: 'inactive' })}
                    />
                    <span>{t('users.inactive')}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {t('app.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('users.resetPassword')}: @{resettingUser.username}
                </h3>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-stone-600">
                Enter a new password for <strong>{resettingUser.displayName}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('users.newPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={resetPasswordData.password}
                    onChange={(e) =>
                      setResetPasswordData({ ...resetPasswordData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('users.confirmNewPassword')}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) =>
                    setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {t('users.resetPassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
