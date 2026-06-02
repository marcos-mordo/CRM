'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { DealDialog } from './deal-dialog';
import type { Contact, Company, Stage, User } from '@prisma/client';

interface Props {
  pipeline: { id: string; stages: Stage[] };
  contacts: Contact[];
  companies: Company[];
  users: User[];
}

export function NewDealButton({ pipeline, contacts, companies, users }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Pipeline');

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t('newDeal')}
      </Button>
      <DealDialog
        pipeline={pipeline}
        contacts={contacts}
        companies={companies}
        users={users}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
