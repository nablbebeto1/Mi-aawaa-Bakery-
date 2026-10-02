import React from 'react';
import { LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const LogoutConfirmModal: React.FC = () => {
  const { showLogoutConfirm, confirmLogout, cancelLogout } = useAuth();
  const { t } = useLanguage();

  if (!showLogoutConfirm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                {t('auth.logout')}
              </h3>
              <p className="text-xs text-stone-500">
                {t('app.confirmLogout')}
              </p>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 mb-6 flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              Your recorded transactions, deliveries, and closings remain securely saved in the system.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={cancelLogout}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={confirmLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={16} />
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
