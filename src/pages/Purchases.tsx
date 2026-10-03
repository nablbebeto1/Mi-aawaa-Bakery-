import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Purchase, Ingredient, Supplier } from '../types';

export const PurchasesPage: React.FC = () => {
  const { currentUser, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantity, setQuantity] = useState<number>(500);
  const [unitCost, setUnitCost] = useState<number>(110);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const loadData = () => {
    setPurchases(storage.getPurchases());
    const sups = storage.getSuppliers();
    setSuppliers(sups);
    const ings = storage.getIngredients();
    setIngredients(ings);

    if (sups.length > 0 && !selectedSupplierId) setSelectedSupplierId(sups[0].id);
    if (ings.length > 0 && !selectedIngredientId) {
      setSelectedIngredientId(ings[0].id);
      setUnitCost(ings[0].unitCost);
    }
  };

  const handleIngredientChange = (ingId: string) => {
    setSelectedIngredientId(ingId);
    const ing = ingredients.find((i) => i.id === ingId);
    if (ing) setUnitCost(ing.unitCost);
  };

  const handleRecordPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatusMessage(null);

    const ing = ingredients.find((i) => i.id === selectedIngredientId);
    if (!ing) return;

    const totalCost = Number(quantity) * Number(unitCost);

    try {
      storage.recordPurchase(
        {
          supplierId: selectedSupplierId,
          items: [
            {
              ingredientId: ing.id,
              quantity: Number(quantity),
              unit: ing.unit,
              unitCost: Number(unitCost),
              totalCost
            }
          ]
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: t('purchases.recordedSuccess')
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const totalCalculated = Number(quantity) * Number(unitCost);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('purchases.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Ingredient Sourcing
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('purchases.subtitle')}
          </p>
        </div>

        {(isOwner || isManager) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('purchases.newPurchase')}</span>
          </button>
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
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Purchases Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Invoices & Procurement History
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {purchases.length} invoices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">{t('app.date')}</th>
                <th className="px-4 py-3">{t('purchases.supplier')}</th>
                <th className="px-4 py-3">Items Purchased</th>
                <th className="px-4 py-3 text-right">{t('purchases.totalCost')}</th>
                <th className="px-4 py-3">{t('app.status')}</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {purchases.map((pur) => (
                <tr key={pur.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-stone-900">
                    {pur.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                    {pur.date}
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-800">
                    {pur.supplierName}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {pur.items.map((it) => {
                      const ing = ingredients.find((i) => i.id === it.ingredientId);
                      return `${it.quantity} ${it.unit} ${ing ? ing.code : it.ingredientId}`;
                    }).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-900 text-sm">
                    {pur.totalAmount.toLocaleString()} ETB
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={12} />
                      Paid & Stocked
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-[11px]">
                    {pur.recorderName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW PURCHASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('purchases.newPurchase')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('purchases.supplier')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 cursor-pointer"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Ingredient to Receive <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedIngredientId}
                  onChange={(e) => handleIngredientChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 cursor-pointer"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} - {i.name[language] || i.name.en} ({i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Quantity Received <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Unit Cost (ETB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Total Purchase Cost:</span>
                <span className="text-lg font-bold font-mono text-amber-900">
                  {totalCalculated.toLocaleString()} ETB
                </span>
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
                  Save & Credit Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
