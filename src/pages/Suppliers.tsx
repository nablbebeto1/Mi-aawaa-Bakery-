import React, { useState, useEffect } from 'react';
import {
  UsersRound,
  Plus,
  Phone,
  Mail,
  MapPin,
  Package,
  Building2,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Supplier } from '../types';

export const SuppliersPage: React.FC = () => {
  const { currentUser, isOwner, isManager } = useAuth();
  const { t } = useLanguage();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    supplies: ''
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSuppliers(storage.getSuppliers());
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      storage.addSupplier(
        {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          supplies: formData.supplies.split(',').map((s) => s.trim()).filter(Boolean)
        },
        currentUser
      );

      setStatusMessage('Supplier added successfully.');
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '', supplies: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {t('nav.suppliers')}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-900 rounded-md">
              Vendor Directory
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Official suppliers for flour, sugar, oil, yeast, and packaging.
          </p>
        </div>

        {(isOwner || isManager) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((sup) => (
          <div
            key={sup.id}
            className="p-5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  {sup.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{sup.name}</h3>
                  <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                    <MapPin size={12} />
                    <span>{sup.address}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-xs text-stone-600">
              <div className="flex items-center gap-1.5">
                <Phone size={13} className="text-stone-400" />
                <span className="font-mono text-[11px]">{sup.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Mail size={13} className="text-stone-400 shrink-0" />
                <span className="truncate text-[11px]">{sup.email}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                Supplies & Materials:
              </span>
              <div className="flex flex-wrap gap-1">
                {sup.supplies.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD SUPPLIER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2">
                <UsersRound size={18} className="text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">Add New Supplier</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Wonji Sugar Share Company"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 ..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Address / Depot</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="City, region, warehouse location"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Supplies Provided (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.supplies}
                  onChange={(e) => setFormData({ ...formData, supplies: e.target.value })}
                  placeholder="Flour, Yeast, Oil"
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
