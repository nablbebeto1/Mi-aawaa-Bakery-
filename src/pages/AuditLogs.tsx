import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
  KeyRound,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { AuditLog, AuditAction } from '../types';

export const AuditLogsPage: React.FC = () => {
  const { currentUser, isOwner, isManager } = useAuth();
  const { t } = useLanguage();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    setLogs(storage.getAuditLogs());
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: AuditAction) => {
    if (action.includes('USER') || action.includes('PASSWORD')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    if (action.includes('CASH') || action.includes('PURCHASE')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (action.includes('STOCK')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('audit.title')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Immutable Operations Log
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('audit.subtitle')}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-stone-200">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by staff name, action, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:bg-white"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl text-stone-700 cursor-pointer"
        >
          <option value="all">All Action Types</option>
          <option value="CREATE_USER">Create User</option>
          <option value="EDIT_USER">Edit User</option>
          <option value="RESET_PASSWORD">Reset Password</option>
          <option value="CONFIRM_CASH">Confirm Cash</option>
          <option value="COLLECT_CASH">Collect Cash</option>
          <option value="RECORD_PRODUCTION">Production Batch</option>
          <option value="RECORD_SALE">Record Sale</option>
          <option value="SUBMIT_CLOSING">Daily Closing</option>
          <option value="UPDATE_LOGO">Branding / Logo</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">{t('audit.timestamp')}</th>
                <th className="px-4 py-3">{t('audit.actor')}</th>
                <th className="px-4 py-3">{t('audit.action')}</th>
                <th className="px-4 py-3">{t('audit.target')}</th>
                <th className="px-4 py-3">{t('audit.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="px-4 py-3 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900 whitespace-nowrap">
                      {log.actorName}
                      <span className="block text-[10px] text-stone-400 font-normal">
                        Role: {t(`role.${log.actorRole}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                      {log.targetType} ({log.targetId.slice(-6)})
                    </td>
                    <td className="px-4 py-3 text-stone-800">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
