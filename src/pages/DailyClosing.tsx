import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Boxes,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { DailyClosing, ClosingStockItem, Product, BranchId } from '../types';

export const DailyClosingPage: React.FC = () => {
  const { currentUser, isSales, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const userBranch: BranchId = isSales && currentUser && currentUser.branch !== 'both'
    ? (currentUser.branch as BranchId)
    : 'coka';

  const [activeBranch, setActiveBranch] = useState<BranchId>(userBranch);
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form states for stock items
  const [stockItems, setStockItems] = useState<ClosingStockItem[]>([]);

  // Cash form states
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [cashSales, setCashSales] = useState<number>(0);
  const [otherCashReceipts, setOtherCashReceipts] = useState<number>(0);
  const [authorizedExpenses, setAuthorizedExpenses] = useState<number>(0);
  const [authorizedRefunds, setAuthorizedRefunds] = useState<number>(0);
  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [cashDiscrepancyReason, setCashDiscrepancyReason] = useState<string>('');
  const [digitalPaymentsTotal, setDigitalPaymentsTotal] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const targetBranch = isSales ? userBranch : activeBranch;

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [targetBranch]);

  const loadData = () => {
    const prods = storage.getProducts();
    setProducts(prods);
    const cls = storage.getDailyClosings(targetBranch);
    setClosings(cls);

    // Auto-calculate today's deliveries received and sales made for this branch
    const deliveries = storage.getDeliveries(targetBranch).filter((d) => d.status === 'received');
    const sales = storage.getSales(targetBranch);

    // Initialize stock items
    const initialItems: ClosingStockItem[] = prods.map((p) => {
      const deliveredQty = deliveries
        .filter((d) => d.productId === p.id)
        .reduce((sum, d) => sum + (d.receivedQty || 0), 0);

      const soldQty = sales
        .filter((s) => s.productId === p.id)
        .reduce((sum, s) => sum + s.quantity, 0);

      const opening = 0; // Fresh morning start
      const damaged = 0;
      const expected = opening + deliveredQty - soldQty - damaged;

      return {
        productId: p.id,
        openingStock: opening,
        deliveriesReceived: deliveredQty,
        quantitySold: soldQty,
        unsoldBread: Math.max(0, expected),
        damagedWasted: damaged,
        expectedStock: expected,
        physicalCount: Math.max(0, expected),
        discrepancy: 0,
        discrepancyReason: ''
      };
    });
    setStockItems(initialItems);

    // Auto-calculate cash figures from actual payments received (full sales, initial down payments, subsequent balance payments)
    const branchPayments = storage.getAllPayments(targetBranch);
    const cashSalesSum = branchPayments
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);

    const digitalSalesSum = branchPayments
      .filter((p) => p.paymentMethod === 'digital')
      .reduce((sum, p) => sum + p.amount, 0);

    setCashSales(cashSalesSum);
    setDigitalPaymentsTotal(digitalSalesSum);
    setActualCashCounted(cashSalesSum); // default suggested
  };

  const handleStockCountChange = (productId: string, physicalCount: number) => {
    setStockItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const disc = physicalCount - item.expectedStock;
          return {
            ...item,
            physicalCount,
            unsoldBread: physicalCount,
            discrepancy: disc
          };
        }
        return item;
      })
    );
  };

  const handleStockDiscrepancyReason = (productId: string, reason: string) => {
    setStockItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, discrepancyReason: reason } : item))
    );
  };

  const expectedCashCalculated =
    Number(openingCash) +
    Number(cashSales) +
    Number(otherCashReceipts) -
    Number(authorizedExpenses) -
    Number(authorizedRefunds);

  const cashDiscrepancyCalculated = Number(actualCashCounted) - expectedCashCalculated;

  const handleSubmitClosing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatusMessage(null);

    // Validation
    for (const item of stockItems) {
      if (item.discrepancy !== 0 && (!item.discrepancyReason || !item.discrepancyReason.trim())) {
        setStatusMessage({
          type: 'error',
          text: `Explanation is mandatory for stock discrepancy on product (${item.discrepancy} loaves).`
        });
        return;
      }
    }

    if (cashDiscrepancyCalculated !== 0 && (!cashDiscrepancyReason || !cashDiscrepancyReason.trim())) {
      setStatusMessage({
        type: 'error',
        text: `Explanation is mandatory for cash discrepancy (${cashDiscrepancyCalculated} ETB).`
      });
      return;
    }

    try {
      storage.submitDailyClosing(
        {
          branch: targetBranch,
          stockItems,
          cash: {
            openingCash: Number(openingCash),
            cashSales: Number(cashSales),
            otherCashReceipts: Number(otherCashReceipts),
            authorizedCashExpenses: Number(authorizedExpenses),
            authorizedCashRefunds: Number(authorizedRefunds),
            expectedCash: expectedCashCalculated,
            actualCashCounted: Number(actualCashCounted),
            cashDiscrepancy: cashDiscrepancyCalculated,
            cashDiscrepancyReason: cashDiscrepancyReason.trim(),
            digitalPaymentsTotal: Number(digitalPaymentsTotal)
          },
          notes: notes.trim()
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: t('dailyClosing.submitSuccess')
      });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('dailyClosing.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              {targetBranch === 'coka' ? 'Coka Branch' : 'Mizan Branch'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('dailyClosing.subtitle')}
          </p>
        </div>

        {/* Branch switcher for Owner/Manager */}
        {(isOwner || isManager) && (
          <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setActiveBranch('coka')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeBranch === 'coka' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              Coka Branch
            </button>
            <button
              onClick={() => setActiveBranch('mizan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeBranch === 'mizan' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              Mizan Branch
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Daily Closing Form */}
      <form onSubmit={handleSubmitClosing} className="space-y-6">
        {/* SECTION 1: Bread Stock Reconciliation */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Boxes size={18} className="text-amber-700" />
              <h2 className="text-sm font-bold text-stone-900">
                1. {t('dailyClosing.stockReconciliation')}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-stone-500">
              Expected = Opening + Deliveries − Sold − Damaged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] border-b border-stone-200">
                <tr>
                  <th className="px-3 py-2.5">{t('production.product')}</th>
                  <th className="px-3 py-2.5 text-right">{t('dailyClosing.openingStock')}</th>
                  <th className="px-3 py-2.5 text-right">{t('dailyClosing.deliveriesReceived')}</th>
                  <th className="px-3 py-2.5 text-right">{t('dailyClosing.quantitySold')}</th>
                  <th className="px-3 py-2.5 text-right">{t('dailyClosing.expectedClosingStock')}</th>
                  <th className="px-3 py-2.5 text-right text-amber-900 font-bold">{t('dailyClosing.physicalCount')}</th>
                  <th className="px-3 py-2.5 text-right">{t('dailyClosing.stockDiscrepancy')}</th>
                  <th className="px-3 py-2.5">{t('dailyClosing.explanationRequired')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {stockItems.map((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  const prodName = prod ? prod.name[language] || prod.name.en : item.productId;
                  return (
                    <tr key={item.productId} className="hover:bg-stone-50/50">
                      <td className="px-3 py-2.5 font-bold text-stone-900">{prodName}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{item.openingStock}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-700 font-bold">
                        +{item.deliveriesReceived}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-amber-900">
                        -{item.quantitySold}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-stone-900">
                        {item.expectedStock}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.physicalCount}
                          onChange={(e) =>
                            handleStockCountChange(item.productId, Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 text-right text-xs bg-amber-50/70 border border-amber-300 rounded-lg font-mono font-bold text-stone-900"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold">
                        {item.discrepancy === 0 ? (
                          <span className="text-emerald-600">0</span>
                        ) : item.discrepancy > 0 ? (
                          <span className="text-blue-600">+{item.discrepancy}</span>
                        ) : (
                          <span className="text-red-600">{item.discrepancy}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.discrepancy !== 0 ? (
                          <input
                            type="text"
                            required
                            placeholder="Mandatory explanation..."
                            value={item.discrepancyReason}
                            onChange={(e) =>
                              handleStockDiscrepancyReason(item.productId, e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs bg-red-50/50 border border-red-300 rounded-lg text-red-900"
                          />
                        ) : (
                          <span className="text-stone-400 text-[11px] italic">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: Cash Reconciliation */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Banknote size={18} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-stone-900">
                2. {t('dailyClosing.cashReconciliation')}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-stone-500">
              Expected = Opening + Cash Sales + Receipts − Expenses
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('dailyClosing.openingCash')} (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('dailyClosing.cashSales')} (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={cashSales}
                onChange={(e) => setCashSales(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono font-bold text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('dailyClosing.digitalPaymentsTotal')} (Non-Cash)
              </label>
              <input
                type="number"
                disabled
                value={digitalPaymentsTotal}
                className="w-full px-3 py-2 text-xs bg-stone-100 border border-stone-200 rounded-xl font-mono text-indigo-700 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('dailyClosing.otherReceipts')} (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={otherCashReceipts}
                onChange={(e) => setOtherCashReceipts(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('dailyClosing.authorizedExpenses')} (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={authorizedExpenses}
                onChange={(e) => setAuthorizedExpenses(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono text-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('dailyClosing.authorizedRefunds')} (ETB)
              </label>
              <input
                type="number"
                min="0"
                value={authorizedRefunds}
                onChange={(e) => setAuthorizedRefunds(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono text-red-600"
              />
            </div>
          </div>

          {/* Cash Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-stone-100">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-500">
                {t('dailyClosing.expectedCash')}
              </span>
              <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
                {expectedCashCalculated.toLocaleString()} ETB
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-900">
                {t('dailyClosing.actualCashCounted')} (Physical) *
              </span>
              <input
                type="number"
                min="0"
                required
                value={actualCashCounted}
                onChange={(e) => setActualCashCounted(Number(e.target.value))}
                className="mt-1 w-full px-2 py-1 text-lg font-bold font-mono bg-white border border-amber-300 rounded-lg text-amber-950"
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-500">
                {t('dailyClosing.cashDiscrepancy')}
              </span>
              <div
                className={`text-xl font-bold font-mono tabular-nums ${
                  cashDiscrepancyCalculated === 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {cashDiscrepancyCalculated > 0
                  ? `+${cashDiscrepancyCalculated.toLocaleString()}`
                  : cashDiscrepancyCalculated.toLocaleString()}{' '}
                ETB
              </div>
            </div>
          </div>

          {cashDiscrepancyCalculated !== 0 && (
            <div>
              <label className="block text-xs font-bold text-red-700 mb-1">
                Explanation for Cash Discrepancy <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={cashDiscrepancyReason}
                onChange={(e) => setCashDiscrepancyReason(e.target.value)}
                placeholder="Reason for cash discrepancy..."
                className="w-full px-3 py-2 text-xs bg-red-50/50 border border-red-300 rounded-xl text-red-900"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              General Closing Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shift closing observations, handover readiness..."
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
            />
          </div>
        </div>

        {/* Submit Closing Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <CalendarCheck size={16} />
            <span>{t('dailyClosing.submitClosing')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
