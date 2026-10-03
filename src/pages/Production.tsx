import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Product, Ingredient, Recipe, ProductionBatch } from '../types';

export const ProductionPage: React.FC = () => {
  const { currentUser, isProduction, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [totalProduced, setTotalProduced] = useState<number>(240);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [customIngredients, setCustomIngredients] = useState<
    Array<{ ingredientId: string; quantity: number; unit: any }>
  >([]);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const loadData = () => {
    const prods = storage.getProducts();
    setProducts(prods);
    setIngredients(storage.getIngredients());
    setBatches(storage.getProductionBatches());
    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(prods[0].id);
      loadRecipeTemplate(prods[0].id);
    }
  };

  const loadRecipeTemplate = (prodId: string) => {
    const recipe = storage.getRecipeByProductId(prodId);
    if (recipe) {
      setCustomIngredients([
        ...recipe.ingredients,
        ...recipe.packaging
      ]);
    } else {
      // Default 50kg template from prompt:
      // Flour 50kg, Yeast 0.5kg, Sugar 3kg, Oil 5L, Cake mix 2kg, Bags 2kg
      setCustomIngredients([
        { ingredientId: 'ing_flour', quantity: 50, unit: 'kg' },
        { ingredientId: 'ing_yeast', quantity: 0.5, unit: 'kg' },
        { ingredientId: 'ing_sugar', quantity: 3, unit: 'kg' },
        { ingredientId: 'ing_oil', quantity: 5, unit: 'liters' },
        { ingredientId: 'ing_cake_mix', quantity: 2, unit: 'kg' },
        { ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }
      ]);
    }
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    loadRecipeTemplate(prodId);
  };

  const handleIngredientQtyChange = (ingredientId: string, quantity: number) => {
    setCustomIngredients((prev) =>
      prev.map((item) =>
        item.ingredientId === ingredientId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    );
  };

  const handleRecordBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatusMessage(null);

    try {
      storage.recordProductionBatch(
        {
          productId: selectedProductId,
          totalProduced: Number(totalProduced),
          rejectedQty: Number(rejectedQty),
          ingredientsUsed: customIngredients,
          notes: notes.trim()
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: t('production.batchRecorded')
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const saleableCalculated = Math.max(0, Number(totalProduced) - Number(rejectedQty));
  const canRecord = isProduction || isOwner || isManager;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('production.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Coka Production Center
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('production.subtitle')}
          </p>
        </div>

        {canRecord && (
          <button
            onClick={() => {
              if (products.length > 0) {
                loadRecipeTemplate(selectedProductId || products[0].id);
              }
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('production.recordBatch')}</span>
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

      {/* Formula Card */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles size={16} className="text-amber-700 shrink-0" />
          <span>{t('production.formulaNotice')}</span>
        </div>
        <span className="font-mono font-bold text-[11px] bg-white px-2 py-1 rounded-md border border-amber-200">
          Saleable = Total − Rejected
        </span>
      </div>

      {/* Batches Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Completed Production Batches
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {batches.length} total recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">{t('production.batchNumber')}</th>
                <th className="px-4 py-3">{t('app.date')}</th>
                <th className="px-4 py-3">{t('production.product')}</th>
                <th className="px-4 py-3 text-right">{t('production.totalProduced')}</th>
                <th className="px-4 py-3 text-right text-red-600">{t('production.rejectedQuantity')}</th>
                <th className="px-4 py-3 text-right text-emerald-700 font-bold">{t('production.saleableQuantity')}</th>
                <th className="px-4 py-3">Baker / Creator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {batches.map((batch) => {
                const prod = products.find((p) => p.id === batch.productId);
                const prodName = prod ? prod.name[language] || prod.name.en : batch.productId;
                return (
                  <tr key={batch.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-stone-900">
                      {batch.batchNumber}
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                      {batch.date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {prodName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-stone-800">
                      {batch.totalProduced}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-red-600">
                      {batch.rejectedQty}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-emerald-700 text-sm">
                      {batch.saleableQty}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-[11px]">
                      {batch.creatorName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD BATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <ChefHat size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('production.recordBatch')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordBatch} className="p-6 overflow-y-auto space-y-5">
              {/* Product picker */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('production.product')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name[language] || p.name.en} ({p.unitPrice} ETB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Produced & Rejected math */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('production.totalProduced')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={totalProduced}
                    onChange={(e) => setTotalProduced(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('production.rejectedQuantity')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalProduced}
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono text-red-600"
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">
                    {t('production.saleableQuantity')}
                  </span>
                  <span className="text-xl font-bold font-mono text-emerald-700">
                    {saleableCalculated} loaves
                  </span>
                </div>
              </div>

              {/* Recipe Ingredients Used (Section 9 deduction template) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800">
                    {t('production.ingredientsUsed')}
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Configurable recipe deduction
                  </span>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 divide-y divide-stone-200/60">
                  {customIngredients.map((item) => {
                    const ing = ingredients.find((i) => i.id === item.ingredientId);
                    const ingName = ing ? ing.name[language] || ing.name.en : item.ingredientId;
                    return (
                      <div key={item.ingredientId} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-stone-800 truncate">
                          {ingName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              handleIngredientQtyChange(item.ingredientId, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-right text-xs bg-white border border-stone-300 rounded-lg font-mono"
                          />
                          <span className="text-stone-500 font-mono text-[11px] w-12">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {t('production.deductedNotice')}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('app.notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Night shift batch baked with normal oven temperature."
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
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
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>{t('production.finalizeBatch')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
