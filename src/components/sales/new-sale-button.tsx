'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { NewSaleDialog } from './new-sale-dialog';
import type { Brand, BrandProduct, EndCustomer } from '@prisma/client';

interface Props {
  brands: Brand[];
  customers: EndCustomer[];
  products: (BrandProduct & { brand: Brand })[];
}

export function NewSaleButton({ brands, customers, products }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Sales');

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t('new')}
      </Button>
      {open && (
        <NewSaleDialog
          brands={brands}
          customers={customers}
          products={products}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
