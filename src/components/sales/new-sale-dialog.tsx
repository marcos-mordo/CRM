'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus } from 'lucide-react';
import { SignaturePad } from './signature-pad';
import { createSale } from '@/app/(dashboard)/sales-orders/actions';
import { formatCurrency, cn } from '@/lib/utils';
import { enqueue, isOnline } from '@/lib/offline-queue';
import type { Brand, BrandProduct, EndCustomer } from '@prisma/client';

interface Props {
  brands: Brand[];
  customers: EndCustomer[];
  products: (BrandProduct & { brand: Brand })[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface CartLine {
  productId: string;
  quantity: number;
}

export function NewSaleDialog({ brands, customers, products, open, onOpenChange }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [brandId, setBrandId] = useState(brands[0]?.id ?? '');
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  const brand = brands.find((b) => b.id === brandId)!;
  const brandProducts = useMemo(() => products.filter((p) => p.brandId === brandId), [products, brandId]);
  const customer = customers.find((c) => c.id === customerId);

  const computed = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let commission = 0;
    const items = cart.map((line) => {
      const p = products.find((x) => x.id === line.productId)!;
      const lineSubtotal = line.quantity * Number(p.basePrice);
      const lineTax = (lineSubtotal * Number(p.taxRate)) / 100;
      const commType = p.commissionType ?? p.brand.defaultCommissionType;
      const commVal = Number(p.commissionValue ?? p.brand.defaultCommissionValue);
      const commAmount = commType === 'PERCENTAGE' ? (lineSubtotal * commVal) / 100 : commType === 'FIXED_AMOUNT' ? commVal : 0;
      subtotal += lineSubtotal;
      tax += lineTax;
      commission += commAmount;
      return { product: p, ...line, lineSubtotal, lineTax, commAmount };
    });
    return { items, subtotal, tax, total: subtotal + tax, commission };
  }, [cart, products]);

  const setQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (!existing && delta > 0) return [...prev, { productId, quantity: 1 }];
      return prev
        .map((l) => (l.productId === productId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0);
    });
  };

  const handleSave = (asDraft: boolean) => {
    if (!brandId) return toast.error('Selecciona una marca');
    if (!customerId) return toast.error('Selecciona un cliente');
    if (cart.length === 0) return toast.error('Añade al menos un producto');
    if (!asDraft && !signature) return toast.error('Captura la firma del cliente');

    startTransition(async () => {
      const uuid = crypto.randomUUID();
      const payload = {
        brandId,
        endCustomerId: customerId,
        lines: cart,
        notes,
        signatureData: signature ?? undefined,
        signatureMethod: signature ? 'canvas' : undefined,
        status: (asDraft ? 'DRAFT' : 'SIGNED') as 'DRAFT' | 'SIGNED',
      };

      if (!isOnline()) {
        try {
          await enqueue({ uuid, type: 'CREATE_SALE', payload });
          toast.success('Sin conexión — venta guardada en cola para sincronizar');
          onOpenChange(false);
        } catch (e: any) {
          toast.error('No se pudo guardar offline: ' + e.message);
        }
        return;
      }

      try {
        const res = await createSale({ ...payload, clientUuid: uuid });
        toast.success(`Venta ${res.number} guardada`);
        onOpenChange(false);
        router.refresh();
      } catch (e: any) {
        // Si falla la red, ponemos en cola
        try {
          await enqueue({ uuid, type: 'CREATE_SALE', payload });
          toast.warning('Fallo al enviar — guardada en cola para reintentar');
          onOpenChange(false);
        } catch {
          toast.error(e.message || 'Error al guardar');
        }
      }
    });
  };

  const cartQty = (id: string) => cart.find((l) => l.productId === id)?.quantity ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Sales.new')}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm mb-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={cn('flex-1', step === n ? 'font-semibold' : 'text-muted-foreground')}>
                {n === 1 ? t('Sales.wizardStep1') : n === 2 ? t('Sales.wizardStep2') : t('Sales.wizardStep3')}
              </span>
              {n < 3 && <div className="h-px bg-border flex-1" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('Sales.brand')} *</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('Sales.customer')} *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecciona cliente..." /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.isCompany ? c.companyName : `${c.firstName} ${c.lastName}`}
                      {' · '}{c.taxId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customer && (
                <p className="text-xs text-muted-foreground mt-1">
                  {customer.email && <>{customer.email} · </>}
                  {customer.mobile || customer.phone || 'Sin teléfono'}
                  {' · '}
                  {customer.city || 'Sin ciudad'}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!brandId || !customerId}>
                {t('Common.next')} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Catálogo de {brand.name}</Label>
              <div className="grid gap-2 mt-2 max-h-72 overflow-y-auto scrollbar-thin border rounded-lg p-2">
                {brandProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin productos activos.</p>
                ) : (
                  brandProducts.map((p) => {
                    const qty = cartQty(p.id);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">{t(`BrandProducts.types.${p.type}` as any)}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(Number(p.basePrice), p.currency)} · {t(`BrandProducts.frequencies.${p.billingFrequency}` as any)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(p.id, -1)} disabled={qty === 0}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-7 text-center font-semibold text-sm">{qty}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(p.id, +1)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(computed.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatCurrency(computed.tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(computed.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400 pt-1">
                  <span>Tu comisión estimada</span>
                  <span className="font-semibold">{formatCurrency(computed.commission)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> {t('Common.previous')}
              </Button>
              <Button onClick={() => setStep(3)} disabled={cart.length === 0}>
                {t('Common.next')} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Cliente:</span> <strong>{customer?.isCompany ? customer.companyName : `${customer?.firstName} ${customer?.lastName}`}</strong></p>
              <p><span className="text-muted-foreground">Marca:</span> {brand.name}</p>
              <p><span className="text-muted-foreground">Productos:</span> {cart.length} ({computed.items.reduce((s, i) => s + i.quantity, 0)} unidades)</p>
              <p><span className="text-muted-foreground">Total:</span> <strong>{formatCurrency(computed.total)}</strong></p>
            </div>

            <div className="space-y-2">
              <Label>{t('Sales.captureSignature')} *</Label>
              <SignaturePad onChange={setSignature} height={220} />
            </div>

            <div className="flex justify-between pt-2 flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" /> {t('Common.previous')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSave(true)} disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('Sales.saveDraft')}
                </Button>
                <Button onClick={() => handleSave(false)} disabled={isPending || !signature}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('Sales.signAndSave')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
