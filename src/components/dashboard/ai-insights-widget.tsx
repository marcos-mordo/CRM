'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

export function AiInsightsWidget({ enabled }: { enabled: boolean }) {
  const [insights, setInsights] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/ai/insights', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.message ?? 'Error');
          return;
        }
        setInsights(data.insights);
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Asistente AI
                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Claude</span>
              </CardTitle>
              <CardDescription className="text-xs">Insights y sugerencias basadas en tus datos de este mes</CardDescription>
            </div>
          </div>
          {insights && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={generate} disabled={isPending}>
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-xs text-muted-foreground">
            Asistente AI no está configurado. Añade <code>ANTHROPIC_API_KEY</code> en variables de entorno para activarlo.
          </p>
        ) : !insights ? (
          <div className="text-center py-2">
            <Button onClick={generate} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Sparkles className="h-4 w-4" />
              Generar insights
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Tarda ~3 segundos</p>
          </div>
        ) : (
          <div className="text-sm prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
            {insights}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
