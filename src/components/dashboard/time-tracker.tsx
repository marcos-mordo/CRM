'use client';

import { useEffect, useState } from 'react';
import { Play, Square, Clock } from 'lucide-react';

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function TimeTrackerWidget() {
  const [active, setActive] = useState<{ id: string; startedAt: string } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [description, setDescription] = useState('');
  const [showLabel, setShowLabel] = useState(false);

  const load = () => {
    fetch('/api/time-tracking').then(r => r.json()).then(d => {
      if (d.active) {
        setActive(d.active);
        setSeconds(Math.floor((Date.now() - new Date(d.active.startedAt).getTime()) / 1000));
      } else {
        setActive(null);
        setSeconds(0);
      }
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setSeconds(Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  const start = async () => {
    const res = await fetch('/api/time-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (res.ok) load();
  };

  const stop = async () => {
    const res = await fetch('/api/time-tracking', { method: 'PATCH' });
    if (res.ok) {
      setActive(null);
      setSeconds(0);
      setDescription('');
    }
  };

  return (
    <div
      className="fixed bottom-40 right-6 z-30 lg:bottom-24"
      onMouseEnter={() => setShowLabel(true)}
      onMouseLeave={() => setShowLabel(false)}
    >
      {active ? (
        <button
          onClick={stop}
          className="h-12 pl-4 pr-3 rounded-full bg-red-500 text-white shadow-xl flex items-center gap-2 hover:scale-105 transition"
          title="Detener temporizador"
        >
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span className="font-mono text-sm">{formatDuration(seconds)}</span>
          <Square className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={start}
          className="h-12 w-12 rounded-full bg-blue-500 text-white shadow-xl flex items-center justify-center hover:scale-105 transition"
          title="Iniciar temporizador"
        >
          <Clock className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
