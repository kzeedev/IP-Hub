import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface FlagIconProps {
  code?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export const FlagIcon: React.FC<FlagIconProps> = ({
  code,
  className = 'w-4 h-3',
  loading = 'lazy',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [code]);

  const cleanCode = code ? code.trim().toLowerCase() : '';

  if (!cleanCode || cleanCode.length !== 2 || cleanCode === 'xx' || hasError) {
    return <Globe className={`inline-block align-middle text-slate-400 shrink-0 ${className}`} />;
  }

  return (
    <img
      src={`/assets/img/flags/4x3/${cleanCode}.svg`}
      alt={`${cleanCode.toUpperCase()} Flag`}
      width={20}
      height={15}
      loading={loading}
      decoding="async"
      onError={() => setHasError(true)}
      className={`inline-block align-middle object-cover rounded-xs shrink-0 shadow-xs aspect-[4/3] ${className}`}
      title={cleanCode.toUpperCase()}
    />
  );
};
