'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Celda editable inline. Click en el valor → input. Enter guarda, Esc cancela.
 * Mostrar el valor formateado si prefieres usar `display` en lugar del raw value.
 */
export function InlineEdit({
  value,
  onSave,
  display,
  placeholder = '—',
  type = 'text',
  className,
  disabled,
}: {
  value: string | null | undefined;
  onSave: (newValue: string) => Promise<void>;
  display?: React.ReactNode;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number';
  className?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value ?? ''); }, [value]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    if (draft === (value ?? '')) { setEditing(false); return; }
    startTransition(async () => {
      try {
        await onSave(draft);
        setEditing(false);
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const cancel = () => { setDraft(value ?? ''); setEditing(false); };

  if (editing) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          onBlur={commit}
          disabled={pending}
          className="border rounded px-1.5 py-0.5 text-sm bg-background w-full min-w-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={cn(
        'group inline-flex items-center gap-1.5 hover:bg-accent rounded px-1 -mx-1 text-left w-full',
        disabled && 'cursor-default',
        className,
      )}
      title={disabled ? undefined : 'Click para editar'}
    >
      <span className={cn(value ? '' : 'text-muted-foreground italic')}>
        {display ?? value ?? placeholder}
      </span>
      {!disabled && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition shrink-0" />}
    </button>
  );
}
