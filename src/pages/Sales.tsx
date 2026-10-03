import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Search,
  Building,
  Phone,
  Printer,
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Sale, Product, BranchId, PaymentStatus } from '../types';
import { BakeryLogo } from '../components/common/BakeryLogo';

interface SalesPageProps {
  onNavigateToBalances?: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({ onNavigateToBalances }) => {
  const { currentUser, isSales, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const userBranch: BranchId = isSales && currentUser && currentUser.branch !== 'both'
    ? (currentUser.branch as BranchId)
    : 'coka';

  const [activeBranch, setActiveBranch] = useState<BranchId>(userBranch);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  // New Sale Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(10);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [paymentType, setPaymentType] = useState<'full' | 'down_payment' | 'unpaid'>('full');
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [activeBranch]);

  const loadData = () => {
    const prods = storage.getProducts();
    setProducts(prods);
    const sls = storage.getSales(isSales ? userBranch : activeBranch);
    setSales(sls);
    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(prods[0].id);
      setUnitPrice(prods[0].unitPrice);
      setQuantity(prods[0].unit === 'kg' ? 1.0 : 1);
    }
  };

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setUnitPrice(prod.unitPrice);
      setQuantity(prod.unit === 'kg' ? 1.0 : 1);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const isKgProduct = selectedProduct?.unit === 'kg';

  const totalCalculated = Math.max(0, Number(quantity) * Number(unitPrice) - Number(discount));
  const remainingCalculated =
    paymentType === 'down_payment'
      ? Math.max(0, totalCalculated - Number(downPaymentAmount))
      : paymentType === 'unpaid'
      ? totalCalculated
      : 0;

  const handleOpenNewSale = () => {
    setStatusMessage(null);
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setUnitPrice(products[0].unitPrice);
      setQuantity(products[0].unit === 'kg' ? 1.0 : 1);
    }
    setDiscount(0);
    setPaymentMethod('cash');
    setPaymentType('full');
    setDownPaymentAmount(0);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleRecordSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatusMessage(null);

    const targetBranch = isSales ? userBranch : activeBranch;
    const numQty = Number(quantity);

    if (numQty <= 0) {
      setStatusMessage({ type: 'error', text: 'Sale quantity must be greater than zero.' });
      return;
    }

    if (!isKgProduct && !Number.isInteger(numQty)) {
      setStatusMessage({ type: 'error', text: 'Piece-based products must use whole-number quantities.' });
      return;
    }

    if (paymentType === 'down_payment') {
      if (!customerName.trim()) {
        setStatusMessage({ type: 'error', text: t('sales.customerRequiredError') });
        return;
      }
      if (!customerPhone.trim()) {
        setStatusMessage({ type: 'error', text: 'Customer phone number is required for down payments.' });
        return;
      }
      const dp = Number(downPaymentAmount);
      if (dp <= 0) {
        setStatusMessage({ type: 'error', text: t('sales.downPaymentError') });
        return;
      }
      if (dp > totalCalculated) {
        setStatusMessage({ type: 'error', text: t('sales.excessPaymentError') });
        return;
      }
    } else if (paymentType === 'unpaid') {
      if (!customerName.trim()) {
        setStatusMessage({ type: 'error', text: t('sales.customerRequiredError') });
        return;
      }
      if (!customerPhone.trim()) {
        setStatusMessage({ type: 'error', text: 'Customer phone number is required for credit sales.' });
        return;
      }
    }

    try {
      const recorded = storage.recordSale(
        {
          branch: targetBranch,
          productId: selectedProductId,
          quantity: numQty,
          unitPrice: Number(unitPrice),
          discount: Number(discount),
          paymentMethod,
          paymentType,
          initialAmountPaid: paymentType === 'down_payment' ? Number(downPaymentAmount) : undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim()
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: t('sales.saleRecorded')
      });
      setIsModalOpen(false);
      loadData();
      // Optionally preview receipt for the newly created sale
      setSelectedSaleForReceipt(recorded);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Summary figures
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCashCollected = storage.getCashCollected(isSales ? userBranch : activeBranch);
  const totalDigitalCollected = storage.getDigitalCollected(isSales ? userBranch : activeBranch);
  const totalOutstandingReceivables = storage.getTotalOutstandingReceivables(isSales ? userBranch : activeBranch);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('sales.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              {isSales ? (userBranch === 'coka' ? 'Coka Branch' : 'Mizan Branch') : 'Branch Counter'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('sales.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToBalances && (
            <button
              onClick={onNavigateToBalances}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
            >
              <Clock size={15} />
              <span>{t('customerBalances.title')}</span>
            </button>
          )}

          <button
            onClick={handleOpenNewSale}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('sales.newSale')}</span>
          </button>
        </div>
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
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Branch selector if Owner/Manager */}
      {(isOwner || isManager) && (
        <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-xl w-fit">
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

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Total Sales Revenue</span>
            <ShoppingBag size={16} className="text-amber-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
            {totalSalesRevenue.toLocaleString()} ETB
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Recognized shift sales</p>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Cash Collected (Handover)</span>
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {totalCashCollected.toLocaleString()} ETB
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Full + down payments in cash</p>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Digital Payments (Telebirr/CBE)</span>
            <CreditCard size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {totalDigitalCollected.toLocaleString()} ETB
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Mobile & bank deposits</p>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>{t('sales.remainingBalance')} (ቀሪ ዕዳ)</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {totalOutstandingReceivables.toLocaleString()} ETB
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Pending customer balances</p>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Sales Transactions Ledger
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {sales.length} transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Receipt #</th>
                <th className="px-4 py-3">{t('app.date')}</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">{t('production.product')}</th>
                <th className="px-4 py-3 text-right">{t('sales.quantity')}</th>
                <th className="px-4 py-3 text-right">{t('sales.unitPrice')}</th>
                <th className="px-4 py-3 text-right text-stone-500">{t('sales.discount')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('sales.totalAmount')}</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">{t('sales.paymentMethod')}</th>
                <th className="px-4 py-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-stone-400">
                    No sales recorded for this shift yet.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const prod = products.find((p) => p.id === sale.productId);
                  const prodName = prod ? prod.name[language] || prod.name.en : sale.productId;
                  const unitLabel = prod?.unit === 'kg' ? 'kg' : 'pcs';

                  return (
                    <tr key={sale.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-stone-900">
                        {sale.saleNumber}
                      </td>
                      <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                        {sale.date}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900">
                          {sale.customerName || 'Walk-in'}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                            <Phone size={9} />
                            {sale.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-800">
                        {prodName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-900">
                        {sale.quantity} {unitLabel}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-stone-600">
                        {sale.unitPrice} ETB
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-stone-500">
                        {sale.discount > 0 ? `-${sale.discount}` : '0'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-900">
                        {sale.totalAmount.toLocaleString()} ETB
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700 font-bold">
                        {(sale.amountPaid || 0).toLocaleString()} ETB
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {sale.remainingBalance > 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {sale.remainingBalance.toLocaleString()} ETB
                          </span>
                        ) : (
                          <span className="text-stone-400">0 ETB</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sale.paymentStatus === 'partial' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock size={10} />
                            ቀብድ ({sale.paymentMethod})
                          </span>
                        ) : sale.paymentStatus === 'unpaid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle size={10} />
                            Unpaid
                          </span>
                        ) : sale.paymentMethod === 'cash' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Banknote size={10} />
                            {t('sales.paymentCash')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <CreditCard size={10} />
                            Digital Pay
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="p-1 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
                          title="View / Print Receipt"
                        >
                          <FileText size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD SALE MODAL WITH DOWN PAYMENT (ቀብድ) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('sales.newSale')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSale} className="p-6 overflow-y-auto space-y-4">
              {/* Product Select */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('production.product')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 cursor-pointer"
                >
                  {products.map((p) => {
                    const localizedName = p.name[language] || p.name.en;
                    const unitName = p.unit === 'kg' ? 'Kilogram' : 'Piece';
                    return (
                      <option key={p.id} value={p.id}>
                        {localizedName} ({unitName}) — {p.unitPrice} ETB
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity, Unit Price, Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('sales.quantity')} ({isKgProduct ? 'kg' : 'pcs'}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step={isKgProduct ? '0.05' : '1'}
                    min={isKgProduct ? '0.05' : '1'}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono font-bold"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    {isKgProduct ? 'Decimals allowed (kg)' : 'Whole numbers only'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('sales.unitPrice')} (ETB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    readOnly={!isOwner && !isManager}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className={`w-full px-3 py-2 text-sm border border-stone-300 rounded-xl font-mono ${
                      isOwner || isManager
                        ? 'bg-stone-50 focus:outline-hidden focus:border-amber-600 text-stone-900 font-bold'
                        : 'bg-stone-100 text-stone-500 cursor-not-allowed'
                    }`}
                  />
                  {!(isOwner || isManager) && (
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Catalog price (Owner/Mgr editable)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('sales.discount')} (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono text-stone-600"
                  />
                </div>
              </div>

              {/* Payment Type Selection (Full vs Down Payment ቀብድ vs Unpaid) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('sales.paymentStatus')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('full')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                      paymentType === 'full'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <CheckCircle2 size={16} className={paymentType === 'full' ? 'text-emerald-600' : 'text-stone-400'} />
                    <span>{t('sales.statusPaid')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('down_payment');
                      if (downPaymentAmount === 0 && totalCalculated > 0) {
                        setDownPaymentAmount(Math.round(totalCalculated * 0.5));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                      paymentType === 'down_payment'
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Clock size={16} className={paymentType === 'down_payment' ? 'text-amber-600' : 'text-stone-400'} />
                    <span>ቀብድ (Down Pay)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('unpaid')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                      paymentType === 'unpaid'
                        ? 'bg-rose-50 border-rose-500 text-rose-900'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <AlertTriangle size={16} className={paymentType === 'unpaid' ? 'text-rose-600' : 'text-stone-400'} />
                    <span>{t('sales.statusUnpaid')}</span>
                  </button>
                </div>
              </div>

              {/* Conditional Down Payment Amount */}
              {paymentType === 'down_payment' && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900">
                      {t('sales.initialAmountPaid')} (ቀብድ) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-amber-800">
                      Total: {totalCalculated.toLocaleString()} ETB
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={totalCalculated}
                    required
                    value={downPaymentAmount}
                    onChange={(e) => setDownPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-xl font-mono font-bold text-stone-900 focus:outline-hidden focus:border-amber-600"
                  />
                  <div className="flex justify-between text-xs text-amber-900 font-semibold pt-1 border-t border-amber-200">
                    <span>{t('sales.remainingBalance')}:</span>
                    <span className="font-mono font-bold text-sm">
                      {remainingCalculated.toLocaleString()} ETB
                    </span>
                  </div>
                </div>
              )}

              {/* Customer Info (Mandatory for down payments or unpaid credit sales) */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {t('sales.customerName')} {paymentType !== 'full' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tigist Alemu"
                      required={paymentType !== 'full'}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {t('sales.customerPhone')} {paymentType !== 'full' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 0911223344"
                      required={paymentType !== 'full'}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method (for full payment or down payment) */}
              {paymentType !== 'unpaid' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {paymentType === 'down_payment' ? 'Down Payment Method' : t('sales.paymentMethod')} <span className="text-red-500">*</span>
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
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Order Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wedding cake pickup on Saturday 4 PM"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                />
              </div>

              {/* Formula & Total Calculation Preview */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-stone-700">
                  <span className="font-semibold">Calculation:</span>
                  <span className="font-mono">
                    {quantity} × {unitPrice} ETB {discount > 0 ? `− ${discount} ETB` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                  <span className="text-xs font-bold text-amber-900 uppercase">
                    {t('sales.totalAmount')}:
                  </span>
                  <span className="text-lg font-black font-mono text-amber-900">
                    {totalCalculated.toLocaleString()} ETB
                  </span>
                </div>
                {paymentType === 'down_payment' && (
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 pt-1">
                    <span>Balance Due Later:</span>
                    <span className="font-mono text-sm text-amber-900">
                      {remainingCalculated.toLocaleString()} ETB
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {paymentType === 'down_payment' ? 'Record Down Payment Sale' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT MODAL */}
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

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-stone-800">
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b border-dashed border-stone-300">
                <div className="flex justify-center mb-2">
                  <BakeryLogo size="md" showText={false} />
                </div>
                <h2 className="text-base font-black text-amber-900 tracking-tight">
                  {t('app.name')}
                </h2>
                <p className="text-[11px] text-stone-500 capitalize">
                  {selectedSaleForReceipt.branch === 'coka' ? 'Coka Branch (Main Center)' : 'Mizan Retail Branch'}
                </p>
                <div className="text-[11px] text-stone-500 font-mono mt-1">
                  Receipt #: {selectedSaleForReceipt.saleNumber} | Date: {selectedSaleForReceipt.date}
                </div>
              </div>

              {/* Customer Box */}
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

              {/* Purchased Product */}
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Purchased Item
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

              {/* Payments History */}
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Payments Breakdown
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
                              {pmt.paymentMethod === 'cash' ? 'Cash' : 'Digital'}
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
                    No payment recorded.
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="pt-3 border-t border-dashed border-stone-300 space-y-1.5 font-mono">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>{t('sales.totalAmount')}:</span>
                  <span className="font-bold text-stone-900">{selectedSaleForReceipt.totalAmount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Paid So Far:</span>
                  <span className="font-bold">{(selectedSaleForReceipt.amountPaid || 0).toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-900 pt-1 border-t border-stone-200">
                  <span>{t('sales.remainingBalance')}:</span>
                  <span>{(selectedSaleForReceipt.remainingBalance || 0).toLocaleString()} ETB</span>
                </div>
              </div>

              {/* Thank you note */}
              <div className="text-center pt-3 border-t border-stone-200 text-stone-500">
                <p className="font-semibold text-stone-700">
                  {t('sales.receiptThankYou')}
                </p>
                <p className="text-[10px] mt-0.5">
                  Cashier: {selectedSaleForReceipt.recorderName}
                </p>
              </div>
            </div>

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
