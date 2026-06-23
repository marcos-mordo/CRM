'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  phone?: string | null;
  message?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  label?: string;
}

/**
 * Genera un link wa.me con mensaje pre-rellenado.
 * Funciona en móvil (abre WhatsApp app), desktop (abre WhatsApp Web).
 * No requiere API ni cuenta Business — solo el número del cliente.
 */
export function WhatsAppButton({ phone, message, size = 'sm', variant = 'outline', className, label = 'WhatsApp' }: Props) {
  if (!phone) {
    return (
      <Button variant={variant} size={size} disabled className={className} title="Sin teléfono">
        <MessageCircle className="h-4 w-4" />
        {size !== 'icon' && label}
      </Button>
    );
  }

  // Normalizar: quitar espacios, paréntesis, guiones; mantener + inicial
  const normalized = phone.replace(/[^\d+]/g, '');
  // wa.me requiere número internacional SIN + ni 00
  const intlNumber = normalized.startsWith('+')
    ? normalized.slice(1)
    : normalized.startsWith('00')
      ? normalized.slice(2)
      : normalized;

  const url = `https://wa.me/${intlNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  return (
    <Button variant={variant} size={size} className={cn('text-green-600 hover:text-green-700 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950/30', className)} asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {size !== 'icon' && label}
      </a>
    </Button>
  );
}
