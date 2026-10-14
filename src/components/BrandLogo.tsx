import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'md',
  showSubtitle = true 
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30 flex-shrink-0`}>
        <ShieldCheck className="w-5 h-5 text-white stroke-[2.2]" />
      </div>
      <div>
        <div className={`font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 ${textSizes[size]}`}>
          <span>Aegis</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Docs</span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] font-medium tracking-wider uppercase text-emerald-700 dark:text-emerald-400/80 -mt-0.5">
            Academic & Research
          </p>
        )}
      </div>
    </div>
  );
};
