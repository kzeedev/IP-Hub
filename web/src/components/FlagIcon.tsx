import React from 'react';
import { Globe } from 'lucide-react';

interface FlagIconProps {
  code?: string;
  className?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ code, className = 'w-4 h-3' }) => {
  if (!code || code.length !== 2 || code.toUpperCase() === 'XX' || code.toUpperCase() === 'EU') {
    return <Globe className={`inline-block text-slate-400 shrink-0 ${className}`} />;
  }

  const cleanCode = code.toLowerCase();
  return (
    <span
      className={`fi fi-${cleanCode} fis inline-block rounded-xs shrink-0 shadow-xs ${className}`}
      title={code.toUpperCase()}
    />
  );
};
