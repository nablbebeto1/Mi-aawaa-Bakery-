import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building,
  Clock,
  ArrowRight,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Delivery, Product, ProductionBatch, BranchId } from '../types';

export const DistributionPage: React.FC = () => {
  const { currentUser, isProduction, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [toBranch, setToBranch] = useState<BranchId>('mizan');
  const [dispatchQty, setDispatchQty] = useState<number>(100);
  const [dispatchTime, setDispatchTime] = useState<string>('05:30 AM');
  const [notes, setNotes] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const loadData = () => {
    setDeliveries(storage.getDeliveries());
    const b = storage.getProductionBatches();
    setBatches(b);
    setProducts(storage.getProducts());
    if (b.length > 0 && !selectedBatchId) {
      setSelectedBatchId(b[0].id);
    }
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatusMessage(null);

    const batch = batches.find((b) => b.id === selectedBatchId);
    if (!batch) {
      setStatusMessage({ type: 'error', text: 'Please select a valid production batch.' });
      return;
    }

    try {
      storage.dispatchBread(
        {
          batchId: batch.id,
          productId: batch.productId,
          toBranch,
          dispatchQty: Number(dispatchQty),
          dispatchTime,
          notes: notes.trim()
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: t('distribution.success')
      });
      setIsModalOpen(false);
      setNotes('');
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const canDispatch = isProduction || isOwner || isManager;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('distribution.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              From Coka Bakery
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('distribution.subtitle')}
          </p>
        </div>

        {canDispatch && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('distribution.dispatchBread')}</span>
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

      {/* Dispatches Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            All Dispatched Deliveries
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {deliveries.length} dispatches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Dispatch #</th>
                <th className="px-4 py-3">{t('app.date')} & Time</th>
                <th className="px-4 py-3">{t('distribution.receivingBranch')}</th>
                <th className="px-4 py-3">{t('production.product')}</th>
                <th className="px-4 py-3 text-right">{t('distribution.dispatchQty')}</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3">{t('app.status')}</th>
                <th className="px-4 py-3">Responsible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {deliveries.map((del) => {
                const prod = products.find((p) => p.id === del.productId);
                const prodName = prod ? prod.name[language] || prod.name.en : del.productId;
                return (
                  <tr key={del.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-stone-900">
                      {del.deliveryNumber}
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-mono text-[11px]">
                      {del.date} · {del.dispatchTime}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {del.toBranch === 'coka' ? 'Coka Front Counter' : 'Mizan Branch'}
                    </td>
                    <td className="px-4 py-3">{prodName}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-900">
                      {del.dispatchQty}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {del.receivedQty !== null ? (
                        <span className="font-semibold text-emerald-700">{del.receivedQty}</span>
                      ) : (
                        <span className="text-stone-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {del.status === 'received' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} />
                          {t('distribution.statusReceived')}
                        </span>
                      )}
                      {del.status === 'dispatched' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Clock size={12} />
                          {t('distribution.statusPending')}
                        </span>
                      )}
                      {del.status === 'discrepancy' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertCircle size={12} />
                          {t('distribution.statusDiscrepancy')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-[11px]">
                      {del.dispatcherName} {del.receiverName ? `→ ${del.receiverName}` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('distribution.dispatchBread')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Source Production Batch <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 cursor-pointer"
                >
                  {batches.map((b) => {
                    const prod = products.find((p) => p.id === b.productId);
                    return (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} - {prod?.name[language] || b.productId} ({b.saleableQty} saleable)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('distribution.receivingBranch')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={toBranch}
                    onChange={(e) => setToBranch(e.target.value as BranchId)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 cursor-pointer"
                  >
                    <option value="mizan">Mizan Branch (Retail)</option>
                    <option value="coka">Coka Branch (Front Counter)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('distribution.dispatchQty')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={dispatchQty}
                    onChange={(e) => setDispatchQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('distribution.dispatchTime')}
                </label>
                <input
                  type="text"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(e.target.value)}
                  placeholder="e.g. 05:30 AM"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('app.notes')}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Driver name, van number, or transfer details"
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
                  <Truck size={15} />
                  <span>Dispatch Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
