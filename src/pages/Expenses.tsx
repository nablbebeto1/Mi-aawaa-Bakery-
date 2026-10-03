import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle2,
  AlertCircle,
  Truck,
  Zap,
  Wrench,
  Boxes,
  HelpCircle,
  CreditCard,
  Banknote
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Expense, ExpenseCategory, BranchScope } from '../types';

export const ExpensesPage: React.FC = () => {
  const { currentUser, isOwner, isManager } = useAuth();
  const { t } = useLanguage();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [category, setCategory] = useState<ExpenseCategory>('transport');
  const [branch, setBranch] = useState<BranchScope>('both');
  const [amount, setAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [description, setDescription] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const loadData = () => {
    setExpenses(storage.getExpenses());
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      storage.recordExpense(
        {
          category,
          branch,
          amount: Number(amount),
          paymentMethod,
          description: description.trim()
        },
        currentUser
      );

      setStatusMessage('Operating expense recorded successfully.');
      setIsModalOpen(false);
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'transport':
        return <Truck size={14} className="text-amber-600" />;
      case 'utilities':
        return <Zap size={14} className="text-yellow-600" />;
      case 'maintenance':
        return <Wrench size={14} className="text-blue-600" />;
      case 'packaging':
        return <Boxes size={14} className="text-indigo-600" />;
      default:
        return <Receipt size={14} className="text-stone-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('expenses.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Overheads & Operations
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('expenses.subtitle')}
          </p>
        </div>

        {(isOwner || isManager) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('expenses.newExpense')}</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Recorded Expense Slips
          </h2>
          <span className="text-xs font-mono font-bold text-stone-900">
            Total: {totalExpenseAmount.toLocaleString()} ETB
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Expense #</th>
                <th className="px-4 py-3">{t('app.date')}</th>
                <th className="px-4 py-3">{t('users.branch')}</th>
                <th className="px-4 py-3">{t('expenses.category')}</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">{t('expenses.amount')}</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-stone-900">
                    {exp.expenseNumber}
                  </td>
                  <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                    {exp.date}
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-800">
                    {exp.branch === 'both' ? 'Both Branches' : exp.branch === 'coka' ? 'Coka Branch' : 'Mizan Branch'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-800">
                      {getCategoryIcon(exp.category)}
                      <span className="capitalize">{exp.category}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-700 max-w-xs truncate">
                    {exp.description}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-900 text-sm">
                    {exp.amount.toLocaleString()} ETB
                  </td>
                  <td className="px-4 py-3">
                    {exp.paymentMethod === 'cash' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Banknote size={12} />
                        Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        <CreditCard size={12} />
                        Digital
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-[11px]">
                    {exp.recorderName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('expenses.newExpense')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('expenses.category')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl cursor-pointer"
                  >
                    <option value="transport">{t('expenses.catTransport')}</option>
                    <option value="utilities">{t('expenses.catUtilities')}</option>
                    <option value="maintenance">{t('expenses.catMaintenance')}</option>
                    <option value="packaging">{t('expenses.catPackaging')}</option>
                    <option value="ingredients">{t('expenses.catIngredients')}</option>
                    <option value="other">{t('expenses.catOther')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Applicable Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value as BranchScope)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl cursor-pointer"
                  >
                    <option value="both">Both Branches</option>
                    <option value="coka">Coka Branch</option>
                    <option value="mizan">Mizan Branch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('expenses.amount')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'digital')}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl cursor-pointer"
                  >
                    <option value="cash">Cash Outflow</option>
                    <option value="digital">Digital / Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Description / Vendor Receipt Details <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Van delivery fuel receipt, oven heating repair"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                />
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
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
