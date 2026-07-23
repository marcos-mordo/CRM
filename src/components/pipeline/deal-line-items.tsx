'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Package, FileText, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { addDealLineItem, removeDealLineItem, quoteFromDeal } from '@/app/(dashboard)/pipeline/line-items-actions';

interface ProductOpt { id: string; name: string; price: any; sku: string }
interface LineRow { id: string; description: string; quantity: any; unitPrice: any; discount: any; total: any; productId: string | null }

export function DealLineItems({ dealId, currency, products, lines }: { dealId: string; currency: string; products: ProductOpt[]; lines: LineRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [discount, setDiscount] = useState('0');

  const total = lines.reduce((s, l) => s + Number(l.total), 0);
  const preview = Math.round(Number(quantity || 0) * Number(unitPrice || 0) * (1 - Number(discount || 0) / 100) * 100) / 100;

  const onPickProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) { setDescription(p.name); setUnitPrice(String(Number(p.price))); }
  };

  const add = () => {
    if (!description.trim()) { toast.error('Elige un producto o escribe una descripción'); return; }
    startTransition(async () => {
      try {
        await addDealLineItem({
          dealId,
          productId: productId || undefined,
          description,
          quantity: Number(quantity) || 1,
          unitPrice: Number(unitPrice) || 0,
          discount: Number(discount) || 0,
        });
        setProductId(''); setDescription(''); setQuantity('1'); setUnitPrice('0'); setDiscount('0');
        toast.success('Línea añadida');
        router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try { await removeDealLineItem(id); router.refresh(); } catch (e: any) { toast.error(e.message); }
    });
  };

  const makeQuote = () => {
    startTransition(async () => {
      try {
        const r = await quoteFromDeal(dealId);
        toast.success(`Cotización ${r.number} creada`);
        router.push('/quotes');
      } catch (e: any) { toast.error(e.message); }
    });
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Productos y servicios</p>
        {lines.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={makeQuote} disabled={pending}>
            <FileText className="h-3.5 w-3.5" /> Crear cotización
          </Button>
        )}
      </div>

      {/* Líneas existentes */}
      {lines.length > 0 ? (
        <div className="space-y-1">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
              <span className="flex-1 truncate">{l.description}</span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {Number(l.quantity)} × {formatCurrency(Number(l.unitPrice), currency)}
                {Number(l.discount) > 0 ? ` −${Number(l.discount)}%` : ''}
              </span>
              <span className="font-medium w-24 text-right">{formatCurrency(Number(l.total), currency)}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(l.id)} disabled={pending}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex justify-between pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin líneas. Añade productos y el importe se calculará solo.</p>
      )}

      {/* Alta de línea */}
      <div className="grid grid-cols-12 gap-2 items-end pt-1">
        <div className="col-span-12">
          {products.length > 0 && (
            <Select value={productId} onValueChange={onPickProduct}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Elegir producto del catálogo (opcional)" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {formatCurrency(Number(p.price), currency)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="col-span-5">
          <Input className="h-8" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Input className="h-8" type="number" min="0" step="0.01" placeholder="Cant." value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Input className="h-8" type="number" min="0" step="0.01" placeholder="Precio" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Input className="h-8" type="number" min="0" max="100" step="1" placeholder="% dto" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="col-span-1">
          <Button type="button" size="icon" className="h-8 w-8" onClick={add} disabled={pending} title={`Añadir (${formatCurrency(preview, currency)})`}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
