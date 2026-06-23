'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight, Rocket, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'brandhub_onboarding_dismissed';

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

interface Props {
  steps: Step[];
}

export function OnboardingCard({ steps }: Props) {
  const [hidden, setHidden] = useState(true);
  const allDone = steps.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    setHidden(dismissed && allDone);
  }, [allDone]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">¡Bienvenido a BrandHub!</CardTitle>
              <CardDescription>
                {allDone
                  ? '🎉 Has completado todos los pasos iniciales.'
                  : `${doneCount} de ${steps.length} pasos completados — sigue para empezar a vender.`}
              </CardDescription>
            </div>
          </div>
          {allDone && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        <ul className="space-y-1">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-md hover:bg-accent transition group',
                  step.done && 'opacity-60'
                )}
              >
                <div
                  className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs',
                    step.done ? 'bg-green-500 text-white' : 'border-2 border-muted-foreground/30'
                  )}
                >
                  {step.done && <Check className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-medium text-sm', step.done && 'line-through')}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
