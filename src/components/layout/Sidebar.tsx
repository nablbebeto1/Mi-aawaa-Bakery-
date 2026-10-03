import React from 'react';
import {
  LayoutDashboard,
  Building,
  ChefHat,
  Truck,
  PackageCheck,
  ShoppingBag,
  CreditCard,
  CalendarCheck,
  HandCoins,
  Boxes,
  ShoppingCart,
  UsersRound,
  Receipt,
  BarChart3,
  UserCheck,
  Sliders,
  History,
  KeyRound,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { BakeryLogo } from '../common/BakeryLogo';

export type ActiveModule =
  | 'dashboard'
  | 'branchOverview'
  | 'production'
  | 'distribution'
  | 'deliveries'
  | 'sales'
  | 'customerBalances'
  | 'dailyClosing'
  | 'cashReconciliation'
  | 'inventory'
  | 'purchases'
  | 'suppliers'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'settings'
  | 'auditLogs'
  | 'adminProfile';

interface SidebarProps {
  currentModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  isOpen,
  onClose
}) => {
  const { currentUser, isOwner, isManager, isProduction, isSales } = useAuth();
  const { t } = useLanguage();

  if (!currentUser) return null;

  interface NavItem {
    id: ActiveModule;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    visible: boolean;
  }

  // Strictly enforce role-based item visibility
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      visible: true
    },
    {
      id: 'branchOverview',
      label: t('nav.branchOverview'),
      icon: Building,
      visible: isOwner || isManager
    },
    {
      id: 'production',
      label: t('nav.production'),
      icon: ChefHat,
      visible: isOwner || isManager || isProduction
    },
    {
      id: 'distribution',
      label: t('nav.distribution'),
      icon: Truck,
      visible: isOwner || isManager || isProduction
    },
    {
      id: 'deliveries',
      label: t('nav.deliveries'),
      icon: PackageCheck,
      visible: isOwner || isManager || isProduction || isSales
    },
    {
      id: 'sales',
      label: t('nav.sales'),
      icon: ShoppingBag,
      visible: isOwner || isManager || isSales
    },
    {
      id: 'customerBalances',
      label: t('nav.customerBalances'),
      icon: CreditCard,
      visible: isOwner || isManager || isSales
    },
    {
      id: 'dailyClosing',
      label: t('nav.dailyClosing'),
      icon: CalendarCheck,
      visible: isOwner || isManager || isSales
    },
    {
      id: 'cashReconciliation',
      label: isProduction ? t('nav.cashHandover') : t('nav.cashReconciliation'),
      icon: HandCoins,
      visible: isOwner || isManager || isProduction
    },
    {
      id: 'inventory',
      label: t('nav.inventory'),
      icon: Boxes,
      visible: isOwner || isManager
    },
    {
      id: 'purchases',
      label: t('nav.purchases'),
      icon: ShoppingCart,
      visible: isOwner || isManager
    },
    {
      id: 'suppliers',
      label: t('nav.suppliers'),
      icon: UsersRound,
      visible: isOwner || isManager
    },
    {
      id: 'expenses',
      label: t('nav.expenses'),
      icon: Receipt,
      visible: isOwner || isManager
    },
    {
      id: 'reports',
      label: t('nav.reports'),
      icon: BarChart3,
      visible: isOwner || isManager || isSales
    },
    // OWNER ONLY: User Management (Manager explicitly blocked!)
    {
      id: 'users',
      label: t('users.title'),
      icon: UserCheck,
      visible: isOwner
    },
    // Settings & Branding: Owner full, Manager operational view
    {
      id: 'settings',
      label: t('settings.title'),
      icon: Sliders,
      visible: isOwner || isManager
    },
    // Audit logs: Owner and Manager
    {
      id: 'auditLogs',
      label: t('nav.auditLogs'),
      icon: History,
      visible: isOwner || isManager
    },
    // Admin Profile → Change Password
    {
      id: 'adminProfile',
      label: isOwner ? 'Admin Profile → Password' : 'My Profile → Password',
      icon: KeyRound,
      visible: true
    }
  ];

  const handleSelect = (module: ActiveModule) => {
    onSelectModule(module);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-stone-900 text-stone-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <BakeryLogo size="sm" />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white leading-tight">
                Mi'aawaa Bakery
              </span>
              <span className="text-[10px] text-amber-400 font-medium">
                {currentUser.branch === 'coka'
                  ? 'Coka Branch'
                  : currentUser.branch === 'mizan'
                  ? 'Mizan Branch'
                  : 'Main & Retail Ops'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg lg:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/70'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-stone-400'} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </div>

        {/* User Card footer */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/60">
          <button
            onClick={() => handleSelect('adminProfile')}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-stone-800/80 transition-colors text-left cursor-pointer group"
            title="Open Admin Profile & Change Password"
          >
            <div className="w-8 h-8 rounded-full bg-amber-900/60 border border-amber-700/50 flex items-center justify-center text-amber-300 text-xs font-bold shrink-0 group-hover:border-amber-400">
              {currentUser.displayName.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-stone-200 truncate group-hover:text-white">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-amber-400/90 font-medium truncate">
                @{currentUser.username} · {t(`role.${currentUser.role}`)}
              </span>
            </div>
            <KeyRound size={13} className="text-stone-500 group-hover:text-amber-400 shrink-0" />
          </button>
        </div>
      </aside>
    </>
  );
};
