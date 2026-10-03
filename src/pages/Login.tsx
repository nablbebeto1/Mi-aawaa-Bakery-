import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Globe, Building2, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BakeryLogo } from '../components/common/BakeryLogo';
import { Language } from '../i18n';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await login(username, password);
      if (!result.success && result.error) {
        setErrorMessage(t(result.error));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Language Bar Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-xs border border-stone-200">
        <Globe size={15} className="text-stone-500" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          aria-label={t('app.language')}
          className="bg-transparent text-xs font-semibold text-stone-700 focus:outline-hidden cursor-pointer"
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel} ({lang.code.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center">
          <BakeryLogo size="xl" className="mb-3" />
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Mi'aawaa Bakery
          </h2>
          <p className="mt-1 text-xs text-amber-900/80 font-medium">
            {t('app.subtitle')}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100/80 text-[11px] font-semibold text-amber-900 border border-amber-300/60">
            <Building2 size={12} />
            <span>Coka Main Center & Mizan Retail</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-stone-200/90 rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Username Input (NO EMAIL REQUIRED) */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-stone-700 mb-1"
              >
                {t('auth.username')}
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <UserCircle size={17} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. owner, manager, baker_coka"
                  className="block w-full pl-9 pr-3 py-2 text-sm text-stone-900 bg-stone-50/50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-stone-700 mb-1"
              >
                {t('auth.password')}
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock size={17} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm text-stone-900 bg-stone-50/50 border border-stone-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-amber-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? '...' : t('auth.login')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
