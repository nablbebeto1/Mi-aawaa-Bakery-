import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Truck,
  ShoppingBag,
  HandCoins,
  AlertTriangle,
  Building,
  CheckCircle2,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  Boxes
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { ActiveModule } from '../components/layout/Sidebar';

interface DashboardProps {
  onNavigate: (module: ActiveModule) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser, isOwner, isManager, isProduction, isSales } = useAuth();
  const { t } = useLanguage();

  const [stats, setStats] = useState({
    todayProducedLoaves: 0,
    todaySaleableLoaves: 0,
    pendingDeliveriesCount: 0,
    totalTodaySalesETB: 0,
    cokaSalesETB: 0,
    mizanSalesETB: 0,
    pendingCashHandoverETB: 0,
    lowStockIngredientsCount: 0
  });

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = storage.subscribe(() => {
      loadDashboardData();
    });
    return unsubscribe;
  }, []);

  const loadDashboardData = () => {
    const batches = storage.getProductionBatches();
    const deliveries = storage.getDeliveries();
    const sales = storage.getSales();
    const ingredients = storage.getIngredients();
    const handovers = storage.getCashHandovers();

    const todayStr = new Date().toISOString().slice(0, 10);

    const produced = batches.reduce((sum, b) => sum + b.totalProduced, 0);
    const saleable = batches.reduce((sum, b) => sum + b.saleableQty, 0);

    const pendingDeliveries = deliveries.filter((d) => d.status === 'dispatched').length;

    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const cokaSales = sales.filter((s) => s.branch === 'coka').reduce((sum, s) => sum + s.totalAmount, 0);
    const mizanSales = sales.filter((s) => s.branch === 'mizan').reduce((sum, s) => sum + s.totalAmount, 0);

    const pendingCash = handovers
      .filter((h) => h.status !== 'confirmed_by_manager')
      .reduce((sum, h) => sum + h.amountCounted, 0);

    const lowStock = ingredients.filter((i) => i.currentStock <= i.minStockAlert).length;
    const outstandingRec = storage.getTotalOutstandingReceivables();

    setStats({
      todayProducedLoaves: produced,
      todaySaleableLoaves: saleable,
      pendingDeliveriesCount: pendingDeliveries,
      totalTodaySalesETB: totalSales,
      cokaSalesETB: cokaSales,
      mizanSalesETB: mizanSales,
      pendingCashHandoverETB: pendingCash,
      lowStockIngredientsCount: lowStock
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-950 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">
            {currentUser?.branch === 'coka'
              ? 'Coka Branch (Main Center)'
              : currentUser?.branch === 'mizan'
              ? 'Mizan Retail Branch'
              : 'Two-Branch Operations'}
          </span>
          <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">
            Welcome, {currentUser?.displayName}
          </h1>
          <p className="text-xs text-amber-200/80 mt-1 max-w-xl">
            {isProduction
              ? 'Night production, recipe ingredient deductions, and morning bread distribution to Coka and Mizan.'
              : isSales
              ? 'Branch bread counter: Confirm fresh delivery arrivals, record customer sales, and perform shift closing.'
              : 'Full operational control: Production oversight, dispatch tracking, cash reconciliation, and owner-only settings.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-amber-800/80 border border-amber-600/40 text-xs font-semibold text-amber-100 flex items-center gap-1.5">
            <Building size={14} className="text-amber-300" />
            <span>Role: {t(`role.${currentUser?.role}`)}</span>
          </div>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Production Card */}
        {(isOwner || isManager || isProduction) && (
          <div
            onClick={() => onNavigate('production')}
            className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-2">
              <span>Fresh Bread Produced</span>
              <ChefHat size={17} className="text-amber-700 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {stats.todaySaleableLoaves} <span className="text-xs font-sans text-stone-500 font-normal">loaves</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 mt-2 font-medium">
              <CheckCircle2 size={13} />
              <span>Saleable quality ready</span>
            </div>
          </div>
        )}

        {/* Deliveries & Dispatch Card */}
        <div
          onClick={() => onNavigate(isSales ? 'deliveries' : 'distribution')}
          className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-2">
            <span>{isSales ? 'Incoming Deliveries' : 'Dispatched Deliveries'}</span>
            <Truck size={17} className="text-amber-700 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
            {stats.pendingDeliveriesCount} <span className="text-xs font-sans text-stone-500 font-normal">in transit</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-800 mt-2 font-medium">
            <ArrowRight size={13} />
            <span>{isSales ? 'Click to confirm arrival' : 'Track van dispatches'}</span>
          </div>
        </div>

        {/* Sales Card */}
        {(isOwner || isManager || isSales) && (
          <div
            onClick={() => onNavigate('sales')}
            className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-2">
              <span>Sales Revenue Today</span>
              <ShoppingBag size={17} className="text-emerald-700 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
              {stats.totalTodaySalesETB.toLocaleString()} <span className="text-xs font-sans text-stone-500 font-normal">ETB</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-500 mt-2 font-medium">
              <span>Coka: {stats.cokaSalesETB} · Mizan: {stats.mizanSalesETB}</span>
            </div>
          </div>
        )}

        {/* Cash Handover / Reconciliation Card */}
        <div
          onClick={() => onNavigate('cashReconciliation')}
          className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-2">
            <span>{isProduction ? 'Mizan Cash Collection' : 'Pending Vault Cash'}</span>
            <HandCoins size={17} className="text-amber-700 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 tabular-nums">
            {stats.pendingCashHandoverETB.toLocaleString()} <span className="text-xs font-sans text-stone-500 font-normal">ETB</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-800 mt-2 font-medium">
            <span>Reconciliation workflow</span>
          </div>
        </div>
      </div>

      {/* Role-specific Quick Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workflow 1: Production & Distribution */}
        <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
            <ChefHat size={18} className="text-amber-700" />
            <span>Night Bakery Production</span>
          </div>
          <p className="text-xs text-stone-600">
            Deduct standard 50kg flour recipe, record quality rejections, and calculate net saleable bread.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('production')}
              className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-amber-50 text-xs font-semibold text-stone-800 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Record New Night Batch</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('distribution')}
              className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-amber-50 text-xs font-semibold text-stone-800 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Dispatch to Coka & Mizan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Workflow 2: Sales & Daily Closing */}
        <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
            <CalendarCheck size={18} className="text-amber-700" />
            <span>Shift Sales & Closing</span>
          </div>
          <p className="text-xs text-stone-600">
            Confirm morning deliveries, record cash/digital retail sales, and submit physical stock & cash reconciliation.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('deliveries')}
              className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-amber-50 text-xs font-semibold text-stone-800 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Confirm Received Deliveries</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('dailyClosing')}
              className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-amber-50 text-xs font-semibold text-stone-800 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Submit Shift Daily Closing</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('customerBalances')}
              className="w-full text-left px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Customer Balances & ቀብድ</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Workflow 3: Cash Journey & Audit */}
        <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
            <HandCoins size={18} className="text-amber-700" />
            <span>Cash Journey Reconciliation</span>
          </div>
          <p className="text-xs text-stone-600">
            Mizan sales cash picked up at night by baker, transported in-transit to Coka, and confirmed by Manager.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('cashReconciliation')}
              className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-amber-50 text-xs font-semibold text-stone-800 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Cash Handover Ledger</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="w-full text-left px-3 py-2 rounded-xl bg-stone-50 hover:bg-amber-50 text-xs font-semibold text-stone-800 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Audited Financial Reports</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
