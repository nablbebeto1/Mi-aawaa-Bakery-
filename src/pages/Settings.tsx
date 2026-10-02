import React, { useState, useRef } from 'react';
import {
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Building,
  Globe,
  Sliders,
  Clock,
  Coins,
  Boxes,
  Edit2,
  Check,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { BakeryLogo } from '../components/common/BakeryLogo';
import { Language } from '../i18n';
import { Product } from '../types';

export const SettingsPage: React.FC = () => {
  const { currentUser, isOwner, isManager } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const currentSettings = storage.getSettings();

  // Branding states
  const [logoPreview, setLogoPreview] = useState<string | null>(currentSettings.logoUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bakeryName, setBakeryName] = useState(currentSettings.bakeryName);
  const [defaultLang, setDefaultLang] = useState<Language>(currentSettings.defaultLanguage);
  const [timezone, setTimezone] = useState(currentSettings.businessTimezone);
  const [currency, setCurrency] = useState(currentSettings.currency);

  // Product pricing states
  const [products, setProducts] = useState<Product[]>(storage.getProducts());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartEditPrice = (prod: Product) => {
    setEditingProductId(prod.id);
    setEditPriceValue(prod.unitPrice);
  };

  const handleSavePrice = (productId: string) => {
    if (!currentUser) return;
    if (editPriceValue <= 0) {
      setStatusMessage({ type: 'error', text: 'Price must be greater than zero.' });
      return;
    }
    try {
      storage.updateProductPrice(productId, Number(editPriceValue), currentUser);
      setProducts(storage.getProducts());
      setEditingProductId(null);
      setStatusMessage({
        type: 'success',
        text: 'Product price updated successfully and recorded in audit log.'
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // File selection & validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (PNG, JPG, JPEG, WebP)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setStatusMessage({
        type: 'error',
        text: 'Invalid file format. Please upload PNG, JPG, JPEG, or WebP.'
      });
      return;
    }

    // Validate size (max 2 MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: 'File exceeds maximum limit of 2 MB.'
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove logo (restores default text logo)
  const handleRemoveLogo = () => {
    if (!isOwner || !currentUser) return;
    setLogoPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      storage.updateSettings({ logoUrl: null }, currentUser);
      setStatusMessage({
        type: 'success',
        text: t('settings.logoRemovedSuccess')
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Save branding & settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !currentUser) {
      setStatusMessage({
        type: 'error',
        text: 'Unauthorized: Only Owner / Administrator can update settings.'
      });
      return;
    }

    try {
      storage.updateSettings(
        {
          bakeryName: bakeryName.trim(),
          logoUrl: logoPreview,
          defaultLanguage: defaultLang,
          businessTimezone: timezone,
          currency: currency.trim()
        },
        currentUser
      );

      // If default language changed, sync active language
      if (defaultLang !== language) {
        setLanguage(defaultLang);
      }

      setStatusMessage({
        type: 'success',
        text: t('settings.logoSavedSuccess')
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-stone-200">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          {t('settings.subtitle')}
        </p>
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

      {/* Bakery Branding Section (Owner-Only Edit) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="text-amber-700" size={20} />
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                {t('settings.branding')}
              </h2>
              <p className="text-xs text-stone-500">
                Upload and manage the official bakery logo for login, top bar, and reports.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
            {isOwner ? 'Owner Controls' : 'Read Only (Manager)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Logo Preview box */}
          <div className="flex flex-col items-center p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <span className="text-xs font-bold text-stone-700 mb-3">
              {t('settings.logoPreview')}
            </span>
            <div className="w-28 h-28 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-center p-2 overflow-hidden mb-3">
              <BakeryLogo size="xl" customUrl={logoPreview} />
            </div>
            <span className="text-[11px] text-stone-500 font-medium">
              {logoPreview ? 'Custom Logo Active' : 'Default Text Logo Active'}
            </span>
          </div>

          {/* Upload Controls */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Upload New Bakery Logo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                disabled={!isOwner}
                onChange={handleFileSelect}
                className="hidden"
                id="bakery-logo-upload"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="bakery-logo-upload"
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    isOwner
                      ? 'bg-stone-900 text-white hover:bg-stone-800'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Upload size={14} />
                  <span>{logoPreview ? t('settings.changeLogo') : t('settings.uploadLogo')}</span>
                </label>

                {logoPreview && isOwner && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>{t('settings.removeLogo')}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                {t('settings.logoRequirements')}
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB).
                Click <strong>{t('settings.saveChanges')}</strong> below to persist.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* General Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <Sliders className="text-amber-700" size={18} />
          <h2 className="text-sm font-bold text-stone-900">
            {t('settings.generalSettings')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('settings.bakeryName')}
            </label>
            <div className="relative">
              <Building size={15} className="absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                disabled={!isOwner}
                value={bakeryName}
                onChange={(e) => setBakeryName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Default System Language
            </label>
            <div className="relative">
              <Globe size={15} className="absolute left-3 top-2.5 text-stone-400" />
              <select
                disabled={!isOwner}
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value as Language)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 disabled:opacity-60 cursor-pointer"
              >
                <option value="en">English (Default)</option>
                <option value="om">Afaan Oromoo</option>
                <option value="am">አማርኛ (Amharic)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('settings.timezone')}
            </label>
            <div className="relative">
              <Clock size={15} className="absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                disabled={!isOwner}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 disabled:opacity-60 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('settings.currency')}
            </label>
            <div className="relative">
              <Coins size={15} className="absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                disabled={!isOwner}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-600 disabled:opacity-60 font-mono"
              />
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex justify-end pt-4 border-t border-stone-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save size={15} />
              <span>{t('settings.saveChanges')}</span>
            </button>
          </div>
        )}
      </form>

      {/* Product Catalog & Pricing Section (Owner & Manager) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Boxes className="text-amber-700" size={18} />
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Official Product Catalog & Price Configuration
              </h2>
              <p className="text-xs text-stone-500">
                Configure prices for the 9 active bakery products. Price changes are logged in audit history and do not affect historical sales.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
            {isOwner || isManager ? 'Owner & Manager Authorized' : 'Read Only'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5">No.</th>
                <th className="px-3 py-2.5">Amharic Name (አማርኛ)</th>
                <th className="px-3 py-2.5">Afaan Oromo Name</th>
                <th className="px-3 py-2.5">English Name</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">Price (ETB)</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {products.map((prod, idx) => (
                <tr key={prod.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-3 py-2 text-stone-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="px-3 py-2 font-bold text-stone-900">{prod.name.am}</td>
                  <td className="px-3 py-2 text-stone-800 font-medium">{prod.name.om}</td>
                  <td className="px-3 py-2 text-stone-600">{prod.name.en}</td>
                  <td className="px-3 py-2 capitalize text-stone-500">{prod.unit === 'kg' ? 'Kilogram' : 'Piece'}</td>
                  <td className="px-3 py-2 text-right">
                    {editingProductId === prod.id ? (
                      <input
                        type="number"
                        min="1"
                        value={editPriceValue}
                        onChange={(e) => setEditPriceValue(Number(e.target.value))}
                        className="w-24 px-2 py-1 text-xs border border-amber-500 rounded-lg text-right font-mono font-bold bg-amber-50 focus:outline-hidden"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono font-bold text-stone-900">{prod.unitPrice} ETB</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(isOwner || isManager) && (
                      editingProductId === prod.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSavePrice(prod.id)}
                            className="p-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 rounded-md cursor-pointer"
                            title="Save new price"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProductId(null)}
                            className="p-1 text-stone-400 hover:text-stone-600 bg-stone-100 rounded-md cursor-pointer"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditPrice(prod)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={11} />
                          <span>Edit Price</span>
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
