import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'flexible' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'dark' | 'light' | 'auto';
  className?: string;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey = '0x4AAAAAABcvDCSrxIuannn_',
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let intervalId: any = null;
    let isMounted = true;

    const tryRender = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return false;

      // Clean up previous widget if any
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          callback: (token: string) => {
            if (isMounted) onVerify(token);
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
          'error-callback': () => {
            if (isMounted && onError) onError();
          },
        });
        widgetIdRef.current = id;
        return true;
      } catch {
        return false;
      }
    };

    if (!tryRender()) {
      intervalId = setInterval(() => {
        if (tryRender()) {
          clearInterval(intervalId);
        }
      }, 250);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, onVerify, onExpire, onError]);

  return (
    <div className={`flex justify-center my-3 ${className}`}>
      <div ref={containerRef} id="cf-turnstile-container" className="min-h-[65px]" />
    </div>
  );
};
