'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowRight, Edit, ExternalLink, MoreVertical, Package, Store, Trash2 } from 'lucide-react';
import { BrandDialog } from './brand-dialog';
import { deleteBrand } from '@/app/(dashboard)/brands/actions';
import type { Brand } from '@prisma/client';

type Row = Brand & { _count: { products: number; sales: number } };

export function BrandsGrid({ brands }: { brands: Row[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState<Brand | null>(null);
  const [, startTransition] = useTransition();

  const remove = (id: string) => {
    if (!confirm(t('Brands.deleteConfirm'))) return;
    startTransition(async () => {
      await deleteBrand(id);
      toast.success(t('Common.deleted'));
      router.refresh();
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <Card key={b.id} className={!b.active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {b.logo ? (
                    <img src={b.logo} alt={b.name} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{b.name}</CardTitle>
                    {b.legalName && <p className="text-xs text-muted-foreground truncate">{b.legalName}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(b)}>
                      <Edit className="h-4 w-4" /> {t('Common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(b.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> {t('Common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {b.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Package className="h-3 w-3" />
                  {b._count.products} {t('Brands.products')}
                </Badge>
                <Badge variant="outline">
                  {b._count.sales} ventas
                </Badge>
                {!b.active && <Badge variant="destructive">Inactiva</Badge>}
              </div>

              <div className="text-xs">
                <p className="text-muted-foreground">{t('Brands.defaultCommission')}:</p>
                <p className="font-medium">
                  {b.defaultCommissionType === 'PERCENTAGE'
                    ? `${Number(b.defaultCommissionValue)}%`
                    : b.defaultCommissionType === 'FIXED_AMOUNT'
                      ? `${Number(b.defaultCommissionValue)}€ fijos`
                      : 'Escalonado'}
                </p>
              </div>

              {b.website && (
                <a
                  href={b.website.startsWith('http') ? b.website : `https://${b.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  {b.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <Link
                href={`/catalog?brand=${b.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline pt-2"
              >
                Ver catálogo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && <BrandDialog brand={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />}
    </>
  );
}
