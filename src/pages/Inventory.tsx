import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  RefreshCw,
  Search,
  Sparkles,
  ArrowUpDown,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Ingredient } from '../types';

export const InventoryPage: React.FC = () => {
  const { currentUser, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustingItem, setAdjustingItem] = useState<Ingredient | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const loadData = () => {
    setIngredients(storage.getIngredients());
  };

  const handleOpenAdjust = (item: Ingredient) => {
    setAdjustingItem(item);
    setAdjustedStock(item.currentStock);
    setAdjustmentReason('');
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !currentUser) return;
    setStatusMessage(null);

    if (!adjustmentReason.trim()) {
      setStatusMessage({ type: 'error', text: 'Adjustment explanation reason is required.' });
      return;
    }

    try {
      storage.adjustIngredientStock(
        adjustingItem.id,
        Number(adjustedStock),
        adjustmentReason.trim(),
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: `Inventory updated for ${adjustingItem.code} to ${adjustedStock} ${adjustingItem.unit}.`
      });
      setAdjustingItem(null);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const filtered = ingredients.filter((ing) => {
    const name = ing.name[language] || ing.name.en;
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ing.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStockAlert).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('inventory.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Raw Ingredients & Packaging
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('inventory.subtitle')}
          </p>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold">
            <AlertTriangle size={15} className="text-amber-600" />
            <span>{lowStockCount} items below threshold</span>
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

      {/* Search & Filter */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-stone-200">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search ingredient code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:bg-white"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Ingredient / Material</th>
                <th className="px-4 py-3 text-right">{t('inventory.currentStock')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.minimumAlert')}</th>
                <th className="px-4 py-3 text-right">Estimated Unit Cost</th>
                <th className="px-4 py-3">{t('app.status')}</th>
                <th className="px-4 py-3 text-right">{t('app.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filtered.map((ing) => {
                const isLow = ing.currentStock <= ing.minStockAlert;
                const name = ing.name[language] || ing.name.en;
                return (
                  <tr key={ing.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-stone-900">
                      {ing.code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900">
                      {name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-900 text-sm">
                      {ing.currentStock.toLocaleString()} {ing.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-stone-500">
                      {ing.minStockAlert} {ing.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-stone-700">
                      {ing.unitCost} ETB/{ing.unit}
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={12} />
                          {t('inventory.statusLow')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} />
                          {t('inventory.statusNormal')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(isOwner || isManager) && (
                        <button
                          onClick={() => handleOpenAdjust(ing)}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100/70 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Adjust Stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST STOCK MODAL */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <Boxes size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  Adjust Inventory: {adjustingItem.code}
                </h3>
              </div>
              <button
                onClick={() => setAdjustingItem(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Item Description
                </label>
                <div className="text-xs font-semibold text-stone-800 p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  {adjustingItem.name[language] || adjustingItem.name.en}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  New Physical Stock Count ({adjustingItem.unit}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={adjustedStock}
                  onChange={(e) => setAdjustedStock(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Audit Reason for Adjustment <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Periodic physical warehouse count correction / damaged bag spill"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
