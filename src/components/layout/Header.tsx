import React, { useState, useEffect } from 'react';
import { LogOut, Globe, Building2, User as UserIcon, Menu, RefreshCw, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { BakeryLogo } from '../common/BakeryLogo';
import { Language } from '../../i18n';
import { storage } from '../../services/storage';

interface HeaderProps {
  onToggleSidebar?: () => void;
  activeModuleName?: string;
  onNavigateToProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeModuleName, onNavigateToProfile }) => {
  const { currentUser, requestLogout } = useAuth();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();
  const [syncStatus, setSyncStatus] = useState(storage.getSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const isDemo = storage.isDemoMode();

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setSyncStatus(storage.getSyncStatus());
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await storage.syncFromServer();
    setTimeout(() => setIsManualSyncing(false), 500);
  };

  const getBranchLabel = () => {
    if (!currentUser) return '';
    if (currentUser.branch === 'coka') return t('branch.coka');
    if (currentUser.branch === 'mizan') return t('branch.mizan');
    return t('branch.both');
  };

  const getRoleLabel = () => {
    if (!currentUser) return '';
    return t(`role.${currentUser.role}`);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/95 backdrop-blur-xs border-b border-stone-200">
      {/* Zone 1: Brand title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-stone-600 rounded-lg hover:bg-stone-100 lg:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <BakeryLogo size="sm" />
          <span className="text-base md:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap">
            Mi'aawaa Bakery
          </span>
        </div>

        {activeModuleName && (
          <div className="hidden sm:flex items-center gap-2 pl-3 ml-2 border-l border-stone-200 text-xs font-medium text-stone-500">
            <span>{activeModuleName}</span>
          </div>
        )}
      </div>

      {/* Zone 2: Branch scope & Context badge & Sync status */}
      <div className="hidden md:flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50/80 rounded-full border border-amber-200/60 text-xs text-amber-900 font-medium">
          <Building2 size={13} className="text-amber-700" />
          <span className="truncate max-w-[180px]">{getBranchLabel()}</span>
        </div>

        {/* Database & Multi-Device Realtime Sync Indicator */}
        <button
          onClick={handleManualSync}
          disabled={syncStatus.isSyncing || isManualSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-stone-200 hover:border-amber-400 bg-white hover:bg-stone-50 transition-all cursor-pointer shadow-2xs"
          title={`Centralized SQLite WAL database persistence. Last synced: ${syncStatus.lastSyncTime || 'active'}. Click to force resync.`}
        >
          <span className={`w-2 h-2 rounded-full ${syncStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-medium text-stone-600">
            {syncStatus.isSyncing || isManualSyncing ? 'Syncing...' : (syncStatus.isConnected ? 'Live Synced' : 'Cached')}
          </span>
          <RefreshCw
            size={11}
            className={`text-stone-400 ${(syncStatus.isSyncing || isManualSyncing) ? 'animate-spin text-amber-700' : ''}`}
          />
        </button>
      </div>

      {/* Zone 3: Language Selector & User Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Selector */}
        <div className="relative flex items-center bg-stone-100 hover:bg-stone-200/80 rounded-lg px-2 py-1 transition-colors">
          <Globe size={14} className="text-stone-500 mr-1.5 shrink-0" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            aria-label={t('app.language')}
            className="bg-transparent text-xs font-semibold text-stone-700 focus:outline-hidden cursor-pointer"
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.code.toUpperCase()} ({lang.nativeLabel})
              </option>
            ))}
          </select>
        </div>

        {/* Demo Mode Pill */}
        {isDemo && (
          <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] tracking-wider uppercase border border-amber-600 shadow-2xs">
            <span>DEMO MODE</span>
          </div>
        )}

        {/* User Badge */}
        {currentUser && (
          <button
            onClick={onNavigateToProfile}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-stone-100 hover:bg-stone-200/80 rounded-lg text-xs transition-colors cursor-pointer border border-transparent hover:border-stone-300"
            title="View Profile & Change Password"
          >
            <UserIcon size={14} className="text-stone-500" />
            <div className="flex flex-col text-left">
              <span className="font-semibold text-stone-800 leading-none">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-amber-800 font-medium leading-tight mt-0.5">
                {getRoleLabel()}
              </span>
            </div>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={requestLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-red-700 bg-stone-100 hover:bg-red-50 border border-stone-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
          title={t('auth.logout')}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{t('auth.logout')}</span>
        </button>
      </div>
    </header>
  );
};
