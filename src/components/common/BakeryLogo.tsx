import React, { useState } from 'react';
import { Wheat } from 'lucide-react';
import { storage } from '../../services/storage';

interface BakeryLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  customUrl?: string | null;
}

export const BakeryLogo: React.FC<BakeryLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  customUrl
}) => {
  const [imageError, setImageError] = useState(false);
  const settings = storage.getSettings();
  const logoSrc = customUrl !== undefined ? customUrl : settings.logoUrl;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 32,
    xl: 48
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoSrc && !imageError ? (
        <div className={`relative overflow-hidden rounded-xl border border-amber-900/10 shadow-xs bg-amber-50/50 flex items-center justify-center shrink-0 ${sizeClasses[size]}`}>
          <img
            src={logoSrc}
            alt="Mi'aawaa Bakery Logo"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-xl bg-amber-700 text-amber-50 font-bold shadow-xs shrink-0 ${sizeClasses[size]}`}
          title="Mi'aawaa Bakery"
        >
          <Wheat size={iconSizes[size]} className="text-amber-100" />
        </div>
      )}

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold tracking-tight text-stone-900 text-base leading-tight">
            {settings.bakeryName || "Mi'aawaa Bakery"}
          </span>
          <span className="text-[11px] font-medium text-amber-800/80">
            Coka & Mizan Branches
          </span>
        </div>
      )}
    </div>
  );
};
