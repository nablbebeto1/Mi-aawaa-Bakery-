import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Banknote,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  DollarSign,
  Users,
  ShieldCheck,
  Building,
  Phone,
  Calendar,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Sale, Product, BranchId, SalePayment } from '../types';
import { BakeryLogo } from '../components/common/BakeryLogo';

export const CustomerBalancesPage: React.FC = () => {
  const { currentUser, isSales, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const userBranch: BranchId = isSales && currentUser && currentUser.branch !== 'both'
    ? (currentUser.branch as BranchId)
    : 'coka';

  const [activeBranch, setActiveBranch] = useState<BranchId | 'all'>(isSales ? userBranch : 'all');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'partial' | 'unpaid' | 'paid'>('all');

  // Modals
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeBranch]);

  const loadData = () => {
    const prods = storage.getAllProducts();
    setProducts(prods);

    let allSales: Sale[] = [];
    if (isSales) {
      allSales = storage.getSales(userBranch);
    } else if (activeBranch === 'all') {
      allSales = storage.getSales();
    } else {
      allSales = storage.getSales(activeBranch);
    }
    setSales(allSales);
  };

  const handleOpenPaymentModal = (sale: Sale) => {
    setSelectedSaleForPayment(sale);
    setPaymentAmount(sale.remainingBalance);
    setPaymentMethod('cash');
    setPaymentNotes('');
    setStatusMessage(null);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForPayment || !currentUser) return;
    setStatusMessage(null);

    const amt = Number(paymentAmount);
    if (amt <= 0) {
      setStatusMessage({ type: 'error', text: 'Payment amount must be greater than zero.' });
      return;
    }
    if (amt > selectedSaleForPayment.remainingBalance) {
      setStatusMessage({
        type: 'error',
        text: t('customerBalances.exceedBalanceError')
      });
      return;
    }

    try {
      storage.recordSubsequentPayment(
        {
          saleId: selectedSaleForPayment.id,
          amount: amt,
          paymentMethod,
          notes: paymentNotes.trim()
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: t('customerBalances.paymentRecordedSuccess')
      });
      setSelectedSaleForPayment(null);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Filter list
  const filteredSales = sales.filter((s) => {
    if (statusFilter !== 'all') {
      if (s.paymentStatus !== statusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (s.customerName || '').toLowerCase().includes(q);
      const phoneMatch = (s.customerPhone || '').toLowerCase().includes(q);
      const numMatch = s.saleNumber.toLowerCase().includes(q);
      const prod = products.find((p) => p.id === s.productId);
      const prodMatch = prod ? (prod.name[language] || prod.name.en).toLowerCase().includes(q) : false;
      return nameMatch || phoneMatch || numMatch || prodMatch;
    }
    return true;
  });

  // KPI Calculations
  const branchSalesForMetrics = isSales
    ? sales.filter((s) => s.branch === userBranch)
    : activeBranch === 'all'
    ? sales
    : sales.filter((s) => s.branch === activeBranch);

  const totalOutstanding = branchSalesForMetrics.reduce((sum, s) => sum + (s.remainingBalance || 0), 0);
  const totalDownPayments = branchSalesForMetrics
    .filter((s) => s.paymentStatus === 'partial')
    .reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const openAccountsCount = branchSalesForMetrics.filter((s) => (s.remainingBalance || 0) > 0).length;
  const settledAccountsCount = branchSalesForMetrics.filter((s) => s.paymentStatus === 'paid').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('customerBalances.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              ቀብድ & Receivables
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('customerBalances.subtitle')}
          </p>
        </div>

        {/* Branch switcher for Owner/Manager */}
        {(isOwner || isManager) && (
          <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveBranch('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeBranch === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Branches
            </button>
            <button
              onClick={() => setActiveBranch('coka')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeBranch === 'coka' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Coka Branch
            </button>
            <button
              onClick={() => setActiveBranch('mizan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeBranch === 'mizan' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>{t('customerBalances.totalOutstanding')}</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {totalOutstanding.toLocaleString()} ETB
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Uncollected customer credit / ቀሪ ዕዳ</p>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>{t('customerBalances.totalDownPayments')}</span>
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {totalDownPayments.toLocaleString()} ETB
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Deposits collected for active orders</p>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>{t('customerBalances.unpaidSalesCount')}</span>
            <Clock size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
            {openAccountsCount}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Orders with remaining balance</p>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>{t('customerBalances.totalPaidSales')}</span>
            <CheckCircle2 size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {settledAccountsCount}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Fully settled transactions</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('customerBalances.allStatuses')}
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'partial'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('sales.statusPartial')}
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'unpaid'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('sales.statusUnpaid')}
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('sales.statusPaid')}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-stone-400" size={14} />
            <input
              type="text"
              placeholder="Search customer, phone, receipt #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:border-amber-600 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Customer Balances Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Customer Accounts Ledger
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {filteredSales.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Receipt #</th>
                <th className="px-4 py-3">{t('app.date')}</th>
                <th className="px-4 py-3">Customer & Phone</th>
                <th className="px-4 py-3">{t('users.branch')}</th>
                <th className="px-4 py-3">{t('sales.item')}</th>
                <th className="px-4 py-3 text-right">{t('sales.totalAmount')}</th>
                <th className="px-4 py-3 text-right">Paid So Far</th>
                <th className="px-4 py-3 text-right font-bold">{t('sales.remainingBalance')}</th>
                <th className="px-4 py-3">{t('app.status')}</th>
                <th className="px-4 py-3 text-center">{t('app.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-stone-400">
                    {t('customerBalances.noOutstanding')}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const prod = products.find((p) => p.id === sale.productId);
                  const prodName = prod ? prod.name[language] || prod.name.en : sale.productId;
                  const unitLabel = prod?.unit === 'kg' ? 'kg' : 'pcs';

                  return (
                    <tr key={sale.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-stone-900">
                        {sale.saleNumber}
                      </td>
                      <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                        {sale.date}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-stone-900">
                          {sale.customerName || 'Walk-in Customer'}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
                            <Phone size={10} />
                            {sale.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-stone-600 font-semibold text-[11px]">
                          {sale.branch}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-800">{prodName}</div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {sale.quantity} {unitLabel} @ {sale.unitPrice} ETB
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-stone-600">
                        {sale.totalAmount.toLocaleString()} ETB
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700 font-bold">
                        {(sale.amountPaid || 0).toLocaleString()} ETB
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {sale.remainingBalance > 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {sale.remainingBalance.toLocaleString()} ETB
                          </span>
                        ) : (
                          <span className="text-stone-400 font-medium">0 ETB</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sale.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 size={12} />
                            {t('sales.statusPaid')}
                          </span>
                        ) : sale.paymentStatus === 'partial' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock size={12} />
                            {t('sales.statusPartial')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle size={12} />
                            {t('sales.statusUnpaid')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {sale.remainingBalance > 0 && (
                            <button
                              onClick={() => handleOpenPaymentModal(sale)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Record payment against remaining balance"
                            >
                              <PlusCircle size={12} />
                              <span>{t('customerBalances.recordSubsequentPayment')}</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSaleForReceipt(sale)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                            title="View Receipt and Payment History"
                          >
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD SUBSEQUENT PAYMENT MODAL */}
      {selectedSaleForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-amber-700" />
                <h3 className="text-sm font-bold text-stone-900">
                  {t('customerBalances.subsequentPaymentTitle')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSaleForPayment(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              {/* Customer and Sale Summary */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-stone-600">
                  <span>Customer:</span>
                  <span className="font-bold text-stone-900">{selectedSaleForPayment.customerName}</span>
                </div>
                {selectedSaleForPayment.customerPhone && (
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Phone:</span>
                    <span className="font-mono text-stone-800">{selectedSaleForPayment.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-stone-600">
                  <span>Receipt #:</span>
                  <span className="font-mono text-stone-800">{selectedSaleForPayment.saleNumber}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600 pt-1 border-t border-stone-200">
                  <span>Original Total:</span>
                  <span className="font-mono font-semibold">{selectedSaleForPayment.totalAmount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700">
                  <span>Paid So Far:</span>
                  <span className="font-mono font-bold">{(selectedSaleForPayment.amountPaid || 0).toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between items-center text-amber-800 font-bold pt-1 border-t border-stone-200">
                  <span>{t('sales.remainingBalance')}:</span>
                  <span className="font-mono text-sm">{selectedSaleForPayment.remainingBalance.toLocaleString()} ETB</span>
                </div>
              </div>

              {/* Amount to pay now */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('customerBalances.paymentAmount')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={selectedSaleForPayment.remainingBalance}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono font-bold text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedSaleForPayment.remainingBalance)}
                    className="absolute right-2 top-2 text-[11px] font-bold text-amber-700 hover:text-amber-900 px-2 py-0.5 rounded-md bg-amber-50 cursor-pointer"
                  >
                    Pay Full Remaining
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('sales.paymentMethod')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="hidden"
                    />
                    <Banknote size={16} className="text-emerald-600" />
                    <span className="text-xs">{t('sales.paymentCash')}</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'digital'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="digital"
                      checked={paymentMethod === 'digital'}
                      onChange={() => setPaymentMethod('digital')}
                      className="hidden"
                    />
                    <CreditCard size={16} className="text-indigo-600" />
                    <span className="text-xs">Telebirr / CBE</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Payment Reference / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Telebirr transaction ID or deposit note"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setSelectedSaleForPayment(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Confirm & Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT & PAYMENT HISTORY MODAL */}
      {selectedSaleForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-700" />
                <h3 className="text-sm font-bold text-stone-900">
                  {t('sales.receipt')} — {selectedSaleForReceipt.saleNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSaleForReceipt(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-800">
              {/* Brand Header */}
              <div className="text-center pb-4 border-b border-dashed border-stone-300">
                <div className="flex justify-center mb-2">
                  <BakeryLogo size="md" showText={false} />
                </div>
                <h2 className="text-base font-black text-amber-900 tracking-tight">
                  {t('app.name')}
                </h2>
                <p className="text-[11px] text-stone-500">
                  {selectedSaleForReceipt.branch === 'coka'
                    ? 'Coka Branch (Main Production & Sales)'
                    : 'Mizan Retail Branch'}
                </p>
                <div className="text-[11px] text-stone-500 font-mono mt-1">
                  Receipt: {selectedSaleForReceipt.saleNumber} | Date: {selectedSaleForReceipt.date}
                </div>
              </div>

              {/* Customer Details */}
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">{t('sales.customerName')}:</span>
                  <span className="font-bold text-stone-900">
                    {selectedSaleForReceipt.customerName || 'Walk-in Customer'}
                  </span>
                </div>
                {selectedSaleForReceipt.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">{t('sales.customerPhone')}:</span>
                    <span className="font-mono text-stone-800">
                      {selectedSaleForReceipt.customerPhone}
                    </span>
                  </div>
                )}
                {selectedSaleForReceipt.notes && (
                  <div className="flex justify-between text-stone-600 italic">
                    <span>Note:</span>
                    <span>{selectedSaleForReceipt.notes}</span>
                  </div>
                )}
              </div>

              {/* Purchased Items */}
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Item Details
                </span>
                {(() => {
                  const prod = products.find((p) => p.id === selectedSaleForReceipt.productId);
                  const prodName = prod ? prod.name[language] || prod.name.en : selectedSaleForReceipt.productId;
                  const unitLabel = prod?.unit === 'kg' ? 'kg' : 'pcs';

                  return (
                    <div className="p-3 bg-stone-50 rounded-xl space-y-2">
                      <div className="flex justify-between font-bold text-stone-900 text-sm">
                        <span>{prodName}</span>
                        <span>{selectedSaleForReceipt.totalAmount.toLocaleString()} ETB</span>
                      </div>
                      <div className="flex justify-between text-stone-500 font-mono text-[11px]">
                        <span>
                          {selectedSaleForReceipt.quantity} {unitLabel} × {selectedSaleForReceipt.unitPrice} ETB
                        </span>
                        {selectedSaleForReceipt.discount > 0 && (
                          <span className="text-rose-600">Discount: -{selectedSaleForReceipt.discount} ETB</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Payments History Ledger */}
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  {t('customerBalances.paymentHistory')}
                </span>
                {selectedSaleForReceipt.payments && selectedSaleForReceipt.payments.length > 0 ? (
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="px-3 py-1.5">Date</th>
                          <th className="px-3 py-1.5">Type</th>
                          <th className="px-3 py-1.5">Method</th>
                          <th className="px-3 py-1.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {selectedSaleForReceipt.payments.map((pmt) => (
                          <tr key={pmt.id}>
                            <td className="px-3 py-1.5 font-mono text-stone-600">{pmt.date}</td>
                            <td className="px-3 py-1.5 capitalize font-semibold text-stone-800">
                              {pmt.type === 'initial_down_payment'
                                ? 'Down Payment (ቀብድ)'
                                : pmt.type === 'subsequent_payment'
                                ? 'Subsequent Payment'
                                : 'Full Payment'}
                            </td>
                            <td className="px-3 py-1.5 capitalize text-stone-600">
                              {pmt.paymentMethod === 'cash' ? 'Cash' : 'Digital (Telebirr/CBE)'}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700">
                              {pmt.amount.toLocaleString()} ETB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-50 rounded-xl text-stone-500 text-center italic">
                    No payment recorded yet.
                  </div>
                )}
              </div>

              {/* Financial Totals summary */}
              <div className="pt-3 border-t border-dashed border-stone-300 space-y-1.5 font-mono">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>{t('sales.totalAmount')}:</span>
                  <span className="font-bold text-stone-900">{selectedSaleForReceipt.totalAmount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>{t('customerBalances.totalPaidSoFar')}:</span>
                  <span className="font-bold">{(selectedSaleForReceipt.amountPaid || 0).toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-900 pt-1 border-t border-stone-200">
                  <span>{t('sales.remainingBalance')}:</span>
                  <span>{(selectedSaleForReceipt.remainingBalance || 0).toLocaleString()} ETB</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-3 border-t border-stone-200 text-stone-500">
                <p className="font-semibold text-stone-700">
                  {t('sales.receiptThankYou')}
                </p>
                <p className="text-[10px] mt-0.5">
                  Cashier: {selectedSaleForReceipt.recorderName} | Status: {selectedSaleForReceipt.paymentStatus.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-t border-stone-200 bg-stone-50">
              <button
                type="button"
                onClick={() => setSelectedSaleForReceipt(null)}
                className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-xl transition-colors cursor-pointer"
              >
                {t('app.close')}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer size={14} />
                <span>{t('sales.printReceipt')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
