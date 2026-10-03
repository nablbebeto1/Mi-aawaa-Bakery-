import React, { useState, useEffect } from 'react';
import {
  Building2,
  Truck,
  ShoppingBag,
  HandCoins,
  CheckCircle2,
  Calendar,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';

export const BranchOverviewPage: React.FC = () => {
  const { t } = useLanguage();

  const [cokaStats, setCokaStats] = useState({
    deliveriesCount: 0,
    salesCount: 0,
    salesRevenue: 0,
    cashSales: 0,
    digitalSales: 0,
    activeStaff: 3
  });

  const [mizanStats, setMizanStats] = useState({
    deliveriesCount: 0,
    salesCount: 0,
    salesRevenue: 0,
    cashSales: 0,
    digitalSales: 0,
    activeStaff: 1
  });

  const calculateStats = () => {
    const deliveries = storage.getDeliveries();
    const sales = storage.getSales();

    const cokaDels = deliveries.filter((d) => d.toBranch === 'coka').length;
    const mizanDels = deliveries.filter((d) => d.toBranch === 'mizan').length;

    const cokaSalesList = sales.filter((s) => s.branch === 'coka');
    const mizanSalesList = sales.filter((s) => s.branch === 'mizan');

    const cokaRev = cokaSalesList.reduce((sum, s) => sum + s.totalAmount, 0);
    const mizanRev = mizanSalesList.reduce((sum, s) => sum + s.totalAmount, 0);

    const cokaCash = cokaSalesList.filter((s) => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0);
    const mizanCash = mizanSalesList.filter((s) => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0);

    setCokaStats({
      deliveriesCount: cokaDels,
      salesCount: cokaSalesList.length,
      salesRevenue: cokaRev,
      cashSales: cokaCash,
      digitalSales: cokaRev - cokaCash,
      activeStaff: 3
    });

    setMizanStats({
      deliveriesCount: mizanDels,
      salesCount: mizanSalesList.length,
      salesRevenue: mizanRev,
      cashSales: mizanCash,
      digitalSales: mizanRev - mizanCash,
      activeStaff: 1
    });
  };

  useEffect(() => {
    calculateStats();
    const unsubscribe = storage.subscribe(() => {
      calculateStats();
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-stone-200">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">
          {t('nav.branchOverview')}
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Side-by-side operational comparison of Coka Main Center and Mizan Retail Branch
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coka Branch Card */}
        <div className="bg-white border-2 border-amber-800/30 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                C
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Coka Branch</h2>
                <span className="text-[11px] text-amber-800 font-semibold">
                  Main Center (Production & Retail)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-900 px-2.5 py-1 rounded-full border border-amber-200">
              HQ Hub
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Sales Revenue</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {cokaStats.salesRevenue.toLocaleString()} ETB
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Cash Collected</span>
              <span className="text-lg font-bold font-mono text-emerald-700">
                {cokaStats.cashSales.toLocaleString()} ETB
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Batches Received</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {cokaStats.deliveriesCount} batches
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Assigned Staff</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {cokaStats.activeStaff} staff
              </span>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 pt-2 border-t border-stone-100">
            Hosts main bakery oven, raw ingredient warehouse, night shift production, and front retail sales counter.
          </p>
        </div>

        {/* Mizan Branch Card */}
        <div className="bg-white border-2 border-stone-200 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-900 flex items-center justify-center font-bold">
                M
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Mizan Branch</h2>
                <span className="text-[11px] text-stone-600 font-semibold">
                  Retail Distribution Branch
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full">
              Retail Outlet
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Sales Revenue</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {mizanStats.salesRevenue.toLocaleString()} ETB
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Cash Collected</span>
              <span className="text-lg font-bold font-mono text-emerald-700">
                {mizanStats.cashSales.toLocaleString()} ETB
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Deliveries Received</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {mizanStats.deliveriesCount} batches
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Assigned Staff</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {mizanStats.activeStaff} staff
              </span>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 pt-2 border-t border-stone-100">
            Receives early morning van deliveries from Coka, serves retail customers, and night cash is collected by production staff.
          </p>
        </div>
      </div>
    </div>
  );
};
