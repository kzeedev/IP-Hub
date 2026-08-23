import React, { forwardRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export type { TurnstileInstance };

export interface TurnstileWidgetProps {
  siteKey?: string;
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  theme?: 'dark' | 'light' | 'auto';
  className?: string;
  id?: string;
}

export const TurnstileWidget = forwardRef<TurnstileInstance | undefined, TurnstileWidgetProps>(
  (
    {
      siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAABcvDCSrxIuannn_',
      action,
      onVerify,
      onExpire,
      onError,
      theme = 'dark',
      className = '',
      id,
    },
    ref
  ) => {
    return (
      <div className={`flex justify-center my-3 min-h-[65px] ${className}`} id={id}>
        <Turnstile
          ref={ref}
          siteKey={siteKey}
          onSuccess={onVerify}
          onExpire={onExpire}
          onError={onError}
          options={{
            action: action,
            theme: theme,
            size: 'normal',
          }}
        />
      </div>
    );
  }
);

TurnstileWidget.displayName = 'TurnstileWidget';
