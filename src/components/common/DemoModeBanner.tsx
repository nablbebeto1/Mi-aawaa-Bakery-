import React from 'react';
import { AlertTriangle, Sparkles, Database, Settings } from 'lucide-react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';

interface DemoModeBannerProps {
  onNavigateToSettings?: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ onNavigateToSettings }) => {
  const isDemo = storage.isDemoMode();
  const { isOwner } = useAuth();

  if (!isDemo) return null;

  return (
    <div className="bg-amber-500 text-stone-950 px-4 py-2 shadow-xs border-b border-amber-600 flex flex-wrap items-center justify-between gap-2 z-50">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-950 text-amber-300 text-[11px] font-black tracking-wider uppercase shadow-2xs">
          <AlertTriangle size={13} className="text-amber-400" />
          <span>DEMO MODE</span>
        </div>
        <p className="text-xs font-semibold leading-tight text-stone-900">
          <span className="font-bold">Demonstration Environment Active:</span> All products, orders, sales, customer balances, and reports are isolated test data (<code className="font-mono bg-amber-400/80 px-1 py-0.2 rounded text-[11px]">miaawaa_demo.db</code>). Real production business records and finances are completely untouched.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium bg-amber-400/90 text-stone-900 px-2.5 py-0.5 rounded-full border border-amber-600/40">
          <Database size={11} />
          <span>Isolated Demo DB</span>
        </div>
        {isOwner && onNavigateToSettings && (
          <button
            onClick={onNavigateToSettings}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-stone-950 bg-amber-300 hover:bg-white rounded-lg border border-amber-600/50 shadow-2xs transition-colors cursor-pointer"
            title="Configure System Mode in Admin Settings"
          >
            <Settings size={12} />
            <span>Admin Settings</span>
          </button>
        )}
      </div>
    </div>
  );
};
