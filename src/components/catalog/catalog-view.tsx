'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BrandProductDialog } from './brand-product-dialog';
import { deleteBrandProduct } from '@/app/(dashboard)/catalog/actions';
import type { Brand, BrandProduct } from '@prisma/client';

type Row = BrandProduct & { brand: Brand };

export function CatalogView({
  brands,
  products,
  selectedBrandId,
}: {
  brands: Brand[];
  products: Row[];
  selectedBrandId?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(selectedBrandId ?? 'all');
  const [editing, setEditing] = useState<BrandProduct | null>(null);
  const [creatingForBrand, setCreatingForBrand] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (tab !== 'all' && p.brandId !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, tab, search]);

  const currentBrand = tab !== 'all' ? brands.find((b) => b.id === tab) : null;

  const remove = (id: string) => {
    if (!confirm(t('Common.confirmDelete'))) return;
    startTransition(async () => {
      await deleteBrandProduct(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  return (
    <Card>
      <div className="p-4 border-b space-y-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); router.replace(v === 'all' ? '/catalog' : `/catalog?brand=${v}`); }}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">{t('Common.all')}</TabsTrigger>
            {brands.map((b) => (
              <TabsTrigger key={b.id} value={b.id}>{b.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Common.search') + '...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button
            onClick={() => setCreatingForBrand(currentBrand?.id ?? brands[0].id)}
            disabled={brands.length === 0}
          >
            <Plus className="h-4 w-4" />
            {t('BrandProducts.new')}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            {tab === 'all' && <TableHead>Marca</TableHead>}
            <TableHead>{t('BrandProducts.type')}</TableHead>
            <TableHead>{t('BrandProducts.billingFrequency')}</TableHead>
            <TableHead className="text-right">{t('BrandProducts.basePrice')}</TableHead>
            <TableHead>{t('BrandProducts.commission')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={tab === 'all' ? 8 : 7} className="text-center py-12 text-muted-foreground">
                {t('BrandProducts.noProducts')}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((p) => {
              const effectiveCommissionType = p.commissionType ?? p.brand.defaultCommissionType;
              const effectiveCommissionValue = p.commissionValue ?? p.brand.defaultCommissionValue;
              const isOverride = p.commissionType !== null;
              return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setEditing(p)}>
                  <TableCell><code className="text-xs">{p.sku}</code></TableCell>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                  </TableCell>
                  {tab === 'all' && (
                    <TableCell><Badge variant="secondary">{p.brand.name}</Badge></TableCell>
                  )}
                  <TableCell><Badge variant="outline" className="text-xs">{t(`BrandProducts.types.${p.type}` as any)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t(`BrandProducts.frequencies.${p.billingFrequency}` as any)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(Number(p.basePrice), p.currency)}</TableCell>
                  <TableCell className="text-sm">
                    {effectiveCommissionType === 'PERCENTAGE'
                      ? `${Number(effectiveCommissionValue)}%`
                      : effectiveCommissionType === 'FIXED_AMOUNT'
                        ? `${Number(effectiveCommissionValue)}€`
                        : '—'}
                    {isOverride && <Badge variant="warning" className="ml-1 text-xs">override</Badge>}
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
              );
            })
          )}
        </TableBody>
      </Table>

      {(editing || creatingForBrand) && (
        <BrandProductDialog
          product={editing ?? undefined}
          brandId={editing?.brandId ?? creatingForBrand ?? brands[0].id}
          brands={brands}
          open={!!editing || !!creatingForBrand}
          onOpenChange={(o) => {
            if (!o) {
              setEditing(null);
              setCreatingForBrand(null);
            }
          }}
        />
      )}
    </Card>
  );
}
