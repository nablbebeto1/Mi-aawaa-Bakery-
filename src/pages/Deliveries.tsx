import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Delivery, Product, BranchId } from '../types';

export const DeliveriesPage: React.FC = () => {
  const { currentUser, isSales, isOwner, isManager } = useAuth();
  const { t, language } = useLanguage();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [confirmingDelivery, setConfirmingDelivery] = useState<Delivery | null>(null);

  const [receivedQty, setReceivedQty] = useState<number>(0);
  const [damagedQty, setDamagedQty] = useState<number>(0);
  const [receivingNotes, setReceivingNotes] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // If user is sales staff, scope to their branch!
  const branchFilter: BranchId | undefined = isSales && currentUser
    ? (currentUser.branch as BranchId)
    : undefined;

  useEffect(() => {
    loadData();
  }, [branchFilter]);

  const loadData = () => {
    setDeliveries(storage.getDeliveries(branchFilter));
    setProducts(storage.getProducts());
  };

  const handleOpenConfirm = (del: Delivery) => {
    setConfirmingDelivery(del);
    setReceivedQty(del.dispatchQty);
    setDamagedQty(0);
    setReceivingNotes('');
  };

  const handleSubmitConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingDelivery || !currentUser) return;
    setStatusMessage(null);

    try {
      storage.confirmDelivery(
        confirmingDelivery.id,
        {
          receivedQty: Number(receivedQty),
          damagedMissingQty: Number(damagedQty),
          notes: receivingNotes.trim()
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: t('deliveries.confirmedSuccess')
      });
      setConfirmingDelivery(null);
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
              {t('deliveries.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              {branchFilter === 'coka'
                ? 'Coka Sales Counter'
                : branchFilter === 'mizan'
                ? 'Mizan Retail Branch'
                : 'All Branches'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('deliveries.subtitle')}
          </p>
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
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Deliveries Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Incoming & Completed Deliveries
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {deliveries.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Delivery #</th>
                <th className="px-4 py-3">{t('app.date')}</th>
                <th className="px-4 py-3">{t('users.branch')}</th>
                <th className="px-4 py-3">{t('production.product')}</th>
                <th className="px-4 py-3 text-right">Dispatched</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-right text-red-600">Damaged/Lost</th>
                <th className="px-4 py-3">{t('app.status')}</th>
                <th className="px-4 py-3 text-right">{t('app.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-400">
                    No incoming deliveries for this branch.
                  </td>
                </tr>
              ) : (
                deliveries.map((del) => {
                  const prod = products.find((p) => p.id === del.productId);
                  const prodName = prod ? prod.name[language] || prod.name.en : del.productId;
                  const canConfirmThis =
                    del.status === 'dispatched' &&
                    (!isSales || currentUser?.branch === del.toBranch || isOwner || isManager);

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
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {prodName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-800">
                        {del.dispatchQty}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {del.receivedQty !== null ? (
                          <span className="font-bold text-emerald-700">{del.receivedQty}</span>
                        ) : (
                          <span className="text-stone-400 italic">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-red-600">
                        {del.damagedMissingQty || 0}
                      </td>
                      <td className="px-4 py-3">
                        {del.status === 'received' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} />
                            Confirmed
                          </span>
                        )}
                        {del.status === 'dispatched' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Clock size={12} />
                            Awaiting Confirmation
                          </span>
                        )}
                        {del.status === 'discrepancy' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={12} />
                            Discrepancy
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canConfirmThis ? (
                          <button
                            onClick={() => handleOpenConfirm(del)}
                            className="px-3 py-1 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            {t('deliveries.confirmArrival')}
                          </button>
                        ) : del.status === 'received' ? (
                          <span className="text-stone-400 text-[11px]">
                            by {del.receiverName}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px] italic">
                            Branch Restricted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELIVERY MODAL */}
      {confirmingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <PackageCheck size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {t('deliveries.confirmArrival')}
                </h3>
              </div>
              <button
                onClick={() => setConfirmingDelivery(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitConfirm} className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Dispatch Number:</span>
                  <span className="font-mono font-bold">{confirmingDelivery.deliveryNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Destination:</span>
                  <span className="font-semibold text-stone-800">
                    {confirmingDelivery.toBranch === 'coka' ? 'Coka Front Counter' : 'Mizan Branch'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Dispatched Quantity:</span>
                  <span className="font-mono font-bold text-amber-900">
                    {confirmingDelivery.dispatchQty} loaves
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('deliveries.receivedQty')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('deliveries.damagedMissing')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={damagedQty}
                  onChange={(e) => setDamagedQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono text-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('app.notes')}
                </label>
                <input
                  type="text"
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g. Bread condition, delivery arrival time"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setConfirmingDelivery(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>Confirm Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
