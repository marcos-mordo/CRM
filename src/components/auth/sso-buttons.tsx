'use client';

import { useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Props {
  google: boolean;
  microsoft: boolean;
}

export function SsoButtons({ google, microsoft }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!google && !microsoft) return null;

  const onClick = (provider: 'google' | 'microsoft-entra-id') => {
    startTransition(() => {
      signIn(provider, { callbackUrl: '/dashboard' });
    });
  };

  return (
    <>
      <div className="space-y-2">
        {google && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => onClick('google')}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/>
              </svg>
            )}
            Continuar con Google
          </Button>
        )}
        {microsoft && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => onClick('microsoft-entra-id')}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 23 23" aria-hidden>
                <path fill="#F35325" d="M1 1h10v10H1z" />
                <path fill="#81BC06" d="M12 1h10v10H12z" />
                <path fill="#05A6F0" d="M1 12h10v10H1z" />
                <path fill="#FFBA08" d="M12 12h10v10H12z" />
              </svg>
            )}
            Continuar con Microsoft
          </Button>
        )}
      </div>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">o con email</span>
        </div>
      </div>
    </>
  );
}
