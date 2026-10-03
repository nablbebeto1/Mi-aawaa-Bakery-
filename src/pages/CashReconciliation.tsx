import React, { useState, useEffect } from 'react';
import {
  HandCoins,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Banknote,
  Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { CashHandover, BranchId } from '../types';

export const CashReconciliationPage: React.FC = () => {
  const { currentUser, isProduction, isManager, isOwner, isSales } = useAuth();
  const { t } = useLanguage();

  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [activeTab, setActiveTab] = useState<'mizan' | 'coka'>('mizan');

  // Modals state
  const [selectedHandover, setSelectedHandover] = useState<CashHandover | null>(null);
  const [actionType, setActionType] = useState<'collect' | 'confirm' | null>(null);
  const [actionAmount, setActionAmount] = useState<number>(0);
  const [actionNotes, setActionNotes] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const loadData = () => {
    setHandovers(storage.getCashHandovers());
  };

  const handleOpenAction = (handover: CashHandover, type: 'collect' | 'confirm') => {
    setSelectedHandover(handover);
    setActionType(type);
    setActionAmount(type === 'collect' ? handover.amountCounted : (handover.amountCollected || handover.amountCounted));
    setActionNotes('');
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHandover || !currentUser || !actionType) return;
    setStatusMessage(null);

    try {
      if (actionType === 'collect') {
        storage.collectMizanCash(selectedHandover.id, Number(actionAmount), actionNotes.trim(), currentUser);
        setStatusMessage({
          type: 'success',
          text: `Collected ${actionAmount} ETB from Mizan branch. Cash is now in transit to Manager.`
        });
      } else if (actionType === 'confirm') {
        storage.confirmCashReceipt(selectedHandover.id, Number(actionAmount), actionNotes.trim(), currentUser);
        setStatusMessage({
          type: 'success',
          text: t('cash.confirmedSuccess')
        });
      }

      setSelectedHandover(null);
      setActionType(null);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const filteredHandovers = handovers.filter((h) => h.branch === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('cash.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Multi-Step Verification
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('cash.subtitle')}
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

      {/* Tabs for Mizan Journey vs Coka Journey */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('mizan')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'mizan'
              ? 'border-amber-700 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building size={15} />
          <span>{t('cash.mizanJourney')}</span>
          <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded-full">
            Sales → Baker → Manager
          </span>
        </button>

        <button
          onClick={() => setActiveTab('coka')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'coka'
              ? 'border-amber-700 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building size={15} />
          <span>{t('cash.cokaJourney')}</span>
          <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded-full">
            Sales → Manager Direct
          </span>
        </button>
      </div>

      {/* Journey Steps explainer */}
      {activeTab === 'mizan' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              1
            </span>
            <div>
              <span className="font-bold block">Counted by Mizan Sales</span>
              <p className="text-[11px] text-stone-600">Shift close cash counted and safely stored.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              2
            </span>
            <div>
              <span className="font-bold block">Collected by Baker at Night</span>
              <p className="text-[11px] text-stone-600">Production staff picks up envelope (in-transit).</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              3
            </span>
            <div>
              <span className="font-bold block">Confirmed by Manager</span>
              <p className="text-[11px] text-stone-600">Manager confirms deposit into bakery vault.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              1
            </span>
            <div>
              <span className="font-bold block">Counted by Coka Sales Counter</span>
              <p className="text-[11px] text-stone-600">Shift close cash counted at Coka front retail.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              2
            </span>
            <div>
              <span className="font-bold block">Confirmed Directly by Manager</span>
              <p className="text-[11px] text-stone-600">Handed over directly to Manager at Coka center.</p>
            </div>
          </div>
        </div>
      )}

      {/* Handovers Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            {activeTab === 'mizan' ? 'Mizan Cash Handover Ledger' : 'Coka Cash Handover Ledger'}
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {filteredHandovers.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">{t('app.date')}</th>
                <th className="px-4 py-3">{t('users.branch')}</th>
                <th className="px-4 py-3 text-right">Counted by Sales</th>
                {activeTab === 'mizan' && (
                  <th className="px-4 py-3 text-right">Collected (Baker)</th>
                )}
                <th className="px-4 py-3 text-right font-bold text-emerald-800">Confirmed (Manager)</th>
                <th className="px-4 py-3">{t('app.status')}</th>
                <th className="px-4 py-3 text-right">{t('app.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredHandovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                    No cash handovers generated yet. Submit a Daily Closing to initiate handover.
                  </td>
                </tr>
              ) : (
                filteredHandovers.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 text-stone-500 font-mono text-[11px]">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {item.branch === 'coka' ? 'Coka Front Counter' : 'Mizan Branch'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-stone-900">
                      {item.amountCounted.toLocaleString()} ETB
                      <span className="block text-[10px] text-stone-400 font-normal">
                        by {item.salesStaffName}
                      </span>
                    </td>
                    {activeTab === 'mizan' && (
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {item.status !== 'counted' ? (
                          <>
                            <span className="font-bold text-amber-800">
                              {item.amountCollected.toLocaleString()} ETB
                            </span>
                            <span className="block text-[10px] text-stone-400 font-normal">
                              by {item.collectedByStaffName}
                            </span>
                          </>
                        ) : (
                          <span className="text-stone-400 italic">Awaiting Collector</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {item.status === 'confirmed_by_manager' ? (
                        <>
                          <span className="font-bold text-emerald-700 text-sm">
                            {item.amountConfirmed.toLocaleString()} ETB
                          </span>
                          <span className="block text-[10px] text-stone-400 font-normal">
                            by {item.confirmedByManagerName}
                          </span>
                        </>
                      ) : (
                        <span className="text-stone-400 italic">Unconfirmed</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'confirmed_by_manager' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} />
                          {t('cash.statusConfirmed')}
                        </span>
                      )}
                      {item.status === 'collected_in_transit' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Truck size={12} />
                          {t('cash.statusInTransit')}
                        </span>
                      )}
                      {item.status === 'counted' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                          <Clock size={12} />
                          {t('cash.statusCounted')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Step 2 for Mizan: Baker collects cash */}
                      {item.branch === 'mizan' && item.status === 'counted' && (isProduction || isOwner || isManager) && (
                        <button
                          onClick={() => handleOpenAction(item, 'collect')}
                          className="px-3 py-1 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Collect Mizan Cash
                        </button>
                      )}

                      {/* Step 3: Manager confirms cash */}
                      {((item.branch === 'mizan' && item.status === 'collected_in_transit') ||
                        (item.branch === 'coka' && item.status === 'counted')) &&
                        (isManager || isOwner) && (
                          <button
                            onClick={() => handleOpenAction(item, 'confirm')}
                            className="px-3 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            Confirm Receipt
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTION MODAL (Collect or Confirm) */}
      {selectedHandover && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <HandCoins size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  {actionType === 'collect' ? 'Record Night Collection' : 'Confirm Manager Receipt'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedHandover(null);
                  setActionType(null);
                }}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Branch:</span>
                  <span className="font-semibold text-stone-800">
                    {selectedHandover.branch === 'coka' ? 'Coka Front Counter' : 'Mizan Branch'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Sales Staff Count:</span>
                  <span className="font-mono font-bold text-amber-900">
                    {selectedHandover.amountCounted.toLocaleString()} ETB
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {actionType === 'collect' ? 'Actual Amount Collected' : 'Actual Amount Received in Vault'} (ETB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={actionAmount}
                  onChange={(e) => setActionAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-base font-bold font-mono bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Handover Notes / Verification
                </label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Sealed envelope verified without discrepancy"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHandover(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>Submit Confirmation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
