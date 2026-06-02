'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProductDialog } from './product-dialog';
import { Edit, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { deleteProduct } from '@/app/(dashboard)/products/actions';
import type { Product } from '@prisma/client';

export function ProductsTable({ products }: { products: Product[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  }, [products, search]);

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      try {
        await deleteProduct(id);
        toast.success(t('Common.deleted'));
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || t('Common.error'));
      }
    });
  };

  return (
    <>
      <div className="p-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('Common.search') + '...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Products.sku')}</TableHead>
            <TableHead>{t('Common.name')}</TableHead>
            <TableHead>{t('Products.category')}</TableHead>
            <TableHead>{t('Products.price')}</TableHead>
            <TableHead>{t('Products.taxRate')}</TableHead>
            <TableHead>{t('Products.stock')}</TableHead>
            <TableHead>{t('Common.status')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p) => (
            <TableRow key={p.id} className="cursor-pointer" onClick={() => setEditing(p)}>
              <TableCell><code className="text-xs">{p.sku}</code></TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.category ? <Badge variant="secondary">{p.category}</Badge> : '—'}</TableCell>
              <TableCell className="font-medium">{formatCurrency(Number(p.price))}</TableCell>
              <TableCell>{Number(p.taxRate)}%</TableCell>
              <TableCell>{p.stock ?? '—'}</TableCell>
              <TableCell>
                {p.active ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(p)}>
                      <Edit className="h-4 w-4" /> {t('Common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(p.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && <ProductDialog product={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
