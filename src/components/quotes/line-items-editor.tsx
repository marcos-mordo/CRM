'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@prisma/client';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  productId?: string | null;
}

interface Props {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  products: Product[];
  currency?: string;
}

export function LineItemsEditor({ lines, onChange, products, currency = 'USD' }: Props) {
  const update = (idx: number, patch: Partial<LineItem>) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const remove = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  const add = () =>
    onChange([
      ...lines,
      { description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, productId: null },
    ]);

  const selectProduct = (idx: number, productId: string) => {
    if (productId === '_none') return update(idx, { productId: null });
    const p = products.find((p) => p.id === productId);
    if (!p) return;
    update(idx, {
      productId: p.id,
      description: p.name,
      unitPrice: Number(p.price),
      taxRate: Number(p.taxRate),
    });
  };

  let subtotal = 0;
  let taxTotal = 0;
  const computed = lines.map((line) => {
    const gross = line.quantity * line.unitPrice;
    const disc = (gross * line.discount) / 100;
    const lineSub = gross - disc;
    const tax = (lineSub * line.taxRate) / 100;
    subtotal += lineSub;
    taxTotal += tax;
    return { ...line, lineSub, tax, total: lineSub + tax };
  });

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Descripción</TableHead>
            <TableHead className="w-20">Cant.</TableHead>
            <TableHead className="w-28">P. unit.</TableHead>
            <TableHead className="w-20">Desc.%</TableHead>
            <TableHead className="w-20">IVA%</TableHead>
            <TableHead className="w-28">Total</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {computed.map((line, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <div className="space-y-1">
                  {products.length > 0 && (
                    <Select value={line.productId ?? '_none'} onValueChange={(v) => selectProduct(idx, v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Buscar producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Sin producto —</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    value={line.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    placeholder="Concepto..."
                  />
                </div>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.quantity}
                  onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.unitPrice}
                  onChange={(e) => update(idx, { unitPrice: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={line.discount}
                  onChange={(e) => update(idx, { discount: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={line.taxRate}
                  onChange={(e) => update(idx, { taxRate: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell className="text-right font-medium text-sm">
                {formatCurrency(line.total, currency)}
              </TableCell>
              <TableCell>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" /> Agregar línea
      </Button>

      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA</span>
            <span className="font-medium">{formatCurrency(taxTotal, currency)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-base">{formatCurrency(subtotal + taxTotal, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
