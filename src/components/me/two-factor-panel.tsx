'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, ShieldOff, ShieldPlus } from 'lucide-react';
import {
  disableTwoFactor,
  enableTwoFactor,
  regenerateBackupCodes,
  startTwoFactorSetup,
} from '@/app/(dashboard)/me/two-factor/actions';

interface Props {
  enabled: boolean;
  userEmail: string;
}

export function TwoFactorPanel({ enabled, userEmail }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'backup' | 'disable'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState('');

  const beginSetup = () => {
    startTransition(async () => {
      try {
        const { secret, otpauthUri } = await startTwoFactorSetup();
        setSecret(secret);
        const qr = await QRCode.toDataURL(otpauthUri, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });
        setQrDataUrl(qr);
        setStep('verify');
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await enableTwoFactor(code);
        setBackupCodes(res.backupCodes);
        setStep('backup');
        setCode('');
        toast.success('2FA activado correctamente');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const disable = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await disableTwoFactor(disableCode);
        toast.success('2FA desactivado');
        setDisableCode('');
        setStep('idle');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const regen = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await regenerateBackupCodes(code);
        setBackupCodes(res.backupCodes);
        setStep('backup');
        setCode('');
        toast.success('Códigos de respaldo regenerados');
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const copyAll = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n')).then(() => toast.success('Copiados'));
  };

  const downloadCodes = () => {
    const blob = new Blob(
      [`BrandHub - Códigos de respaldo 2FA\nCuenta: ${userEmail}\nGenerados: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nGuárdalos en lugar seguro. Cada código solo se puede usar una vez.\n`],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandhub-2fa-backup-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'backup') {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-semibold mb-1">Códigos de respaldo</p>
          <p className="text-xs text-muted-foreground mb-3">
            Guárdalos ahora. Si pierdes tu autenticador, podrás iniciar sesión usando uno de estos códigos.
            Cada código se puede usar <strong>una sola vez</strong>.
          </p>
        </div>
        <div className="bg-muted rounded-lg p-4 grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((c) => (
            <div key={c} className="text-center select-all">{c}</div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={copyAll}><Copy className="h-4 w-4" /> Copiar todos</Button>
          <Button variant="outline" onClick={downloadCodes}>Descargar .txt</Button>
          <Button onClick={() => { setStep('idle'); setBackupCodes([]); }}>Ya los guardé</Button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">1. Escanea con tu app autenticadora</p>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR 2FA" className="rounded-lg border bg-white p-2 mx-auto" width={200} height={200} />
            )}
            {secret && (
              <div className="text-xs">
                <p className="text-muted-foreground mb-1">O introdúcelo a mano:</p>
                <code className="font-mono bg-muted px-2 py-1 rounded select-all break-all">{secret}</code>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">2. Introduce el código de 6 dígitos</p>
            <form onSubmit={verify} className="space-y-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep('idle')}>Cancelar</Button>
                <Button type="submit" disabled={isPending || code.length !== 6}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Activar 2FA
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cada vez que inicies sesión necesitarás introducir un código de 6 dígitos de tu app autenticadora.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <form onSubmit={regen} className="space-y-2 border rounded-lg p-4">
            <Label>Regenerar códigos de respaldo</Label>
            <p className="text-xs text-muted-foreground">Invalida los anteriores. Necesitas un código TOTP actual.</p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="font-mono text-center"
              maxLength={6}
            />
            <Button type="submit" variant="outline" size="sm" disabled={isPending || code.length !== 6}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Regenerar
            </Button>
          </form>

          <form onSubmit={disable} className="space-y-2 border rounded-lg p-4 border-destructive/30 bg-destructive/5">
            <Label>Desactivar 2FA</Label>
            <p className="text-xs text-muted-foreground">Tu cuenta perderá la protección extra. Necesitas un código TOTP o uno de respaldo.</p>
            <Input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="000000 o aaaa-bbbb"
              className="font-mono"
            />
            <Button type="submit" variant="destructive" size="sm" disabled={isPending || disableCode.length < 6}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <ShieldOff className="h-4 w-4" /> Desactivar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sin 2FA, solo necesitas tu email y contraseña para iniciar sesión. Activarlo añade un código rotativo de 30 segundos.
      </p>
      <Button onClick={beginSetup} disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        <ShieldPlus className="h-4 w-4" /> Configurar 2FA
      </Button>
    </div>
  );
}
