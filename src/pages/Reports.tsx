import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Banknote,
  CreditCard,
  Boxes
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { BranchId, Product } from '../types';

export const ReportsPage: React.FC = () => {
  const { currentUser, isOwner, isManager, isSales } = useAuth();
  const { t, language } = useLanguage();

  const userBranch: BranchId | 'all' = isSales && currentUser && currentUser.branch !== 'both'
    ? (currentUser.branch as BranchId)
    : 'all';

  const [selectedBranch, setSelectedBranch] = useState<BranchId | 'all'>(userBranch);
  const [products, setProducts] = useState<Product[]>([]);

  const [summary, setSummary] = useState({
    totalProduced: 0,
    totalRejected: 0,
    totalSaleable: 0,
    totalSalesRevenue: 0,
    cokaSalesRevenue: 0,
    mizanSalesRevenue: 0,
    actualCashCollected: 0,
    actualDigitalCollected: 0,
    totalOutstandingReceivables: 0,
    totalDownPayments: 0,
    estimatedCostOfGoods: 0,
    totalExpenses: 0,
    grossProfit: 0,
    netOperatingProfit: 0,
    cashCounted: 0,
    cashConfirmed: 0
  });

  const [productBreakdown, setProductBreakdown] = useState<Array<{
    id: string;
    name: string;
    unit: string;
    unitPrice: number;
    quantitySold: number;
    revenue: number;
  }>>([]);

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    calculateReport();
    const unsubscribe = storage.subscribe(() => {
      calculateReport();
    });
    return unsubscribe;
  }, [selectedBranch]);

  const calculateReport = () => {
    const batches = storage.getProductionBatches();
    const sales = storage.getSales();
    const expenses = storage.getExpenses();
    const handovers = storage.getCashHandovers();
    const prods = storage.getProducts();
    setProducts(prods);

    // Filter sales by branch
    const branchFilter = selectedBranch === 'all' ? undefined : selectedBranch;
    const filteredSales = selectedBranch === 'all'
      ? sales
      : sales.filter((s) => s.branch === selectedBranch);

    const totalSalesRev = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const cokaRev = sales.filter((s) => s.branch === 'coka').reduce((acc, s) => acc + s.totalAmount, 0);
    const mizanRev = sales.filter((s) => s.branch === 'mizan').reduce((acc, s) => acc + s.totalAmount, 0);

    const actualCash = storage.getCashCollected(branchFilter);
    const actualDigital = storage.getDigitalCollected(branchFilter);
    const outstandingRec = storage.getTotalOutstandingReceivables(branchFilter);
    const downPayments = filteredSales
      .filter((s) => s.paymentStatus === 'partial')
      .reduce((sum, s) => sum + (s.amountPaid || 0), 0);

    const totalProd = batches.reduce((acc, b) => acc + b.totalProduced, 0);
    const totalRej = batches.reduce((acc, b) => acc + b.rejectedQty, 0);
    const totalSaleable = batches.reduce((acc, b) => acc + b.saleableQty, 0);

    // Approximate Cost of Goods Sold (approx 35% of standard unit prices based on recipe costs)
    const estimatedCOGS = filteredSales.reduce((acc, s) => acc + (s.quantity * (s.unitPrice * 0.35)), 0);

    // Filter expenses
    const filteredExpenses = selectedBranch === 'all'
      ? expenses
      : expenses.filter((e) => e.branch === selectedBranch || e.branch === 'both');

    const totalExp = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

    // Strict Formulas:
    // Estimated Gross Profit = Sales revenue − COGS
    const gross = Math.max(0, totalSalesRev - estimatedCOGS);
    // Estimated Net Operating Profit = Gross Profit − Operating Expenses
    const net = gross - totalExp;

    const countCash = handovers.reduce((acc, h) => acc + h.amountCounted, 0);
    const confCash = handovers.reduce((acc, h) => acc + h.amountConfirmed, 0);

    setSummary({
      totalProduced: totalProd,
      totalRejected: totalRej,
      totalSaleable: totalSaleable,
      totalSalesRevenue: totalSalesRev,
      cokaSalesRevenue: cokaRev,
      mizanSalesRevenue: mizanRev,
      actualCashCollected: actualCash,
      actualDigitalCollected: actualDigital,
      totalOutstandingReceivables: outstandingRec,
      totalDownPayments: downPayments,
      estimatedCostOfGoods: Math.round(estimatedCOGS),
      totalExpenses: totalExp,
      grossProfit: Math.round(gross),
      netOperatingProfit: Math.round(net),
      cashCounted: countCash,
      cashConfirmed: confCash
    });

    // Product breakdown
    const breakdown = prods.map((p) => {
      const pSales = filteredSales.filter((s) => s.productId === p.id);
      const qtySold = pSales.reduce((sum, s) => sum + s.quantity, 0);
      const rev = pSales.reduce((sum, s) => sum + s.totalAmount, 0);
      return {
        id: p.id,
        name: p.name[language] || p.name.en,
        unit: p.unit === 'kg' ? 'kg' : 'pcs',
        unitPrice: p.unitPrice,
        quantitySold: qtySold,
        revenue: rev
      };
    });
    setProductBreakdown(breakdown);

    // Chart data: branch comparison
    setChartData([
      { name: 'Coka Branch', revenue: cokaRev, cash: storage.getCashCollected('coka') },
      { name: 'Mizan Branch', revenue: mizanRev, cash: storage.getCashCollected('mizan') }
    ]);
  };

  const handleExportCSV = () => {
    let csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Amount (ETB / Count)\n' +
      `Total Sales Revenue (Accrual),${summary.totalSalesRevenue}\n` +
      `Total Cash Collected (Handover Pool),${summary.actualCashCollected}\n` +
      `Total Digital Payments (Telebirr/CBE),${summary.actualDigitalCollected}\n` +
      `Total Customer Receivables (Outstanding ቀሪ ዕዳ),${summary.totalOutstandingReceivables}\n` +
      `Total Down Payments Collected (ቀብድ),${summary.totalDownPayments}\n` +
      `Coka Branch Sales Revenue,${summary.cokaSalesRevenue}\n` +
      `Mizan Branch Sales Revenue,${summary.mizanSalesRevenue}\n` +
      `Total Production Batches Count,${summary.totalProduced}\n` +
      `Total Saleable Bread,${summary.totalSaleable}\n` +
      `Rejected Damaged Bread,${summary.totalRejected}\n` +
      `Estimated Cost of Goods Sold,${summary.estimatedCostOfGoods}\n` +
      `Estimated Gross Profit,${summary.grossProfit}\n` +
      `Operating Expenses,${summary.totalExpenses}\n` +
      `Estimated Net Operating Profit,${summary.netOperatingProfit}\n` +
      `Manager Confirmed Vault Cash,${summary.cashConfirmed}\n\n` +
      'Product Name,Unit,Unit Price (ETB),Quantity Sold,Total Revenue (ETB)\n';

    for (const item of productBreakdown) {
      csvContent += `"${item.name}",${item.unit},${item.unitPrice},${item.quantitySold},${item.revenue}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Miaawaa_Bakery_Financial_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('reports.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Audited Analytics & Receivables
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isSales && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-stone-100 border border-stone-200 rounded-xl cursor-pointer"
            >
              <option value="all">All Branches Combined</option>
              <option value="coka">Coka Branch Only</option>
              <option value="mizan">Mizan Branch Only</option>
            </select>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>{t('app.exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Financial Strict Notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
        <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Strict Accounting Standard: </span>
          <span>{t('reports.profitNotice')}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Revenue */}
        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 block mb-1">
            {t('reports.totalSalesRevenue')} (Accrual)
          </span>
          <div className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
            {summary.totalSalesRevenue.toLocaleString()} ETB
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">
            Recognized order sales
          </span>
        </div>

        {/* Actual Cash Collected */}
        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-semibold mb-1">
            <span>Cash Collected (Vault Pool)</span>
            <Banknote size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {summary.actualCashCollected.toLocaleString()} ETB
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">
            Full + down payments in cash
          </span>
        </div>

        {/* Customer Receivables (Outstanding ቀሪ ዕዳ) */}
        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-semibold mb-1">
            <span>Outstanding Credit (ቀሪ ዕዳ)</span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {summary.totalOutstandingReceivables.toLocaleString()} ETB
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">
            Down payments & credit due
          </span>
        </div>

        {/* Estimated Net Operating Profit */}
        <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 block mb-1">
            {t('reports.netOperatingProfit')}
          </span>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              summary.netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {summary.netOperatingProfit.toLocaleString()} ETB
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">
            After {summary.totalExpenses.toLocaleString()} ETB expenses
          </span>
        </div>
      </div>

      {/* Production & Financial Cash Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-2">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Production & Quality Yield
          </h3>
          <div className="flex justify-between text-xs py-1 border-b border-stone-100">
            <span className="text-stone-500">Total Loaves Produced:</span>
            <span className="font-mono font-bold text-stone-900">{summary.totalProduced}</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-stone-100">
            <span className="text-stone-500">Saleable Output:</span>
            <span className="font-mono font-bold text-emerald-700">{summary.totalSaleable}</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-stone-500">Rejected / Damaged:</span>
            <span className="font-mono font-bold text-red-600">{summary.totalRejected}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-2">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Payment & Credit Channels
          </h3>
          <div className="flex justify-between text-xs py-1 border-b border-stone-100">
            <span className="text-stone-500">Cash Collected:</span>
            <span className="font-mono font-bold text-emerald-700">{summary.actualCashCollected.toLocaleString()} ETB</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-stone-100">
            <span className="text-stone-500">Digital / Telebirr:</span>
            <span className="font-mono font-bold text-indigo-700">{summary.actualDigitalCollected.toLocaleString()} ETB</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-stone-500">Active Down Payments (ቀብድ):</span>
            <span className="font-mono font-bold text-amber-800">{summary.totalDownPayments.toLocaleString()} ETB</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-2">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Vault Cash Reconciled
          </h3>
          <div className="flex justify-between text-xs py-1 border-b border-stone-100">
            <span className="text-stone-500">Counted by Branches:</span>
            <span className="font-mono font-bold text-stone-900">{summary.cashCounted.toLocaleString()} ETB</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-stone-100">
            <span className="text-stone-500">Manager Confirmed in Vault:</span>
            <span className="font-mono font-bold text-emerald-700">{summary.cashConfirmed.toLocaleString()} ETB</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-stone-500">Pending Reconciliation:</span>
            <span className="font-mono font-bold text-amber-800">
              {Math.max(0, summary.cashCounted - summary.cashConfirmed).toLocaleString()} ETB
            </span>
          </div>
        </div>
      </div>

      {/* Product Catalog Sales Breakdown (9 Active Products) */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes size={16} className="text-amber-700" />
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Product Catalog Sales Breakdown (9 Active Products)
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {productBreakdown.length} products
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Quantity Sold</th>
                <th className="px-4 py-3 text-right font-bold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {productBreakdown.map((item) => (
                <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-stone-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-2.5 text-stone-500 capitalize">
                    {item.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-stone-600">
                    {item.unitPrice} ETB
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-stone-900">
                    {item.quantitySold}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-900">
                    {item.revenue.toLocaleString()} ETB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Chart Section */}
      <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-2xs">
        <h3 className="text-sm font-bold text-stone-900 mb-4">
          Branch Revenue vs Cash Collected (Coka vs Mizan)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} unit=" ETB" />
              <Tooltip formatter={(value: any, name: any) => [`${value.toLocaleString()} ETB`, name === 'revenue' ? 'Total Revenue' : 'Cash Collected']} />
              <Bar dataKey="revenue" name="Total Revenue" fill="#b45309" radius={[8, 8, 0, 0]} />
              <Bar dataKey="cash" name="Cash Collected" fill="#059669" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
