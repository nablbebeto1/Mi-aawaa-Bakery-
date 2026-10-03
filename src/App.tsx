import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveModule } from './components/layout/Sidebar';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BranchOverviewPage } from './pages/BranchOverview';
import { ProductionPage } from './pages/Production';
import { DistributionPage } from './pages/Distribution';
import { DeliveriesPage } from './pages/Deliveries';
import { SalesPage } from './pages/Sales';
import { CustomerBalancesPage } from './pages/CustomerBalances';
import { DailyClosingPage } from './pages/DailyClosing';
import { CashReconciliationPage } from './pages/CashReconciliation';
import { InventoryPage } from './pages/Inventory';
import { PurchasesPage } from './pages/Purchases';
import { SuppliersPage } from './pages/Suppliers';
import { ExpensesPage } from './pages/Expenses';
import { ReportsPage } from './pages/Reports';
import { UserManagement } from './pages/UserManagement';
import { SettingsPage } from './pages/Settings';
import { AuditLogsPage } from './pages/AuditLogs';
import { ChangeInitialPassword } from './pages/ChangeInitialPassword';
import { ChangePasswordPage } from './pages/ChangePassword';
import { DemoModeBanner } from './components/common/DemoModeBanner';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, currentUser, isOwner, isManager, isProduction, isSales } = useAuth();
  const { t } = useLanguage();

  const [currentModule, setCurrentModule] = useState<ActiveModule>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Login />;
  }

  // Mandatory first-login password change safeguard:
  // Admin cannot access dashboard or system pages until password is changed!
  if (currentUser.mustChangePassword) {
    return <ChangeInitialPassword onSuccess={() => setCurrentModule('dashboard')} />;
  }

  // Security guard: If a non-owner somehow lands on 'users', redirect to dashboard
  if (currentModule === 'users' && !isOwner) {
    setCurrentModule('dashboard');
  }

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <Dashboard onNavigate={(mod) => setCurrentModule(mod)} />;
      case 'branchOverview':
        return <BranchOverviewPage />;
      case 'production':
        return <ProductionPage />;
      case 'distribution':
        return <DistributionPage />;
      case 'deliveries':
        return <DeliveriesPage />;
      case 'sales':
        return <SalesPage onNavigateToBalances={() => setCurrentModule('customerBalances')} />;
      case 'customerBalances':
        return <CustomerBalancesPage />;
      case 'dailyClosing':
        return <DailyClosingPage />;
      case 'cashReconciliation':
        return <CashReconciliationPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <SettingsPage />;
      case 'auditLogs':
        return <AuditLogsPage />;
      case 'adminProfile':
        return <ChangePasswordPage />;
      default:
        return <Dashboard onNavigate={(mod) => setCurrentModule(mod)} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Persistent DEMO MODE Banner throughout the application */}
      <DemoModeBanner onNavigateToSettings={() => setCurrentModule('settings')} />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={setCurrentModule}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          {/* Top Navigation Bar */}
          <Header
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            activeModuleName={t(`nav.${currentModule}` as any, currentModule)}
            onNavigateToProfile={() => setCurrentModule('adminProfile')}
          />

          {/* Viewport Content */}
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            {renderModule()}
          </main>
        </div>
      </div>

      {/* Logout confirmation modal */}
      <LogoutConfirmModal />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
