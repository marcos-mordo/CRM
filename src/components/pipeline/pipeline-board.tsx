'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, MoreHorizontal, Trash2, TrendingUp, Trophy, X } from 'lucide-react';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import { moveDeal, setDealStatus, deleteDeal } from '@/app/(dashboard)/pipeline/actions';
import { DealDialog } from './deal-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Contact, Company, Deal, Pipeline, Stage, User } from '@prisma/client';

type DealRow = Deal & { contact: Contact | null; company: Company | null; owner: User | null; lineItems?: any[] };
type StageRow = Stage & { deals: DealRow[] };
type PipelineRow = Pipeline & { stages: StageRow[] };

interface Props {
  pipeline: PipelineRow;
  contacts: Contact[];
  companies: Company[];
  users: User[];
  products?: any[];
  rottingDays?: number;
}

function rotFor(lastActivityAt: Date | string, rottingDays: number): { state: 'fresh' | 'warm' | 'rotting'; days: number } {
  const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000);
  if (days >= rottingDays) return { state: 'rotting', days };
  if (days >= Math.ceil(rottingDays / 2)) return { state: 'warm', days };
  return { state: 'fresh', days };
}

export function PipelineBoard({ pipeline, contacts, companies, users, products = [], rottingDays = 14 }: Props) {
  const t = useTranslations('Pipeline');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<DealRow | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOver(null);
    const dealId = e.dataTransfer.getData('dealId');
    if (!dealId) return;

    startTransition(async () => {
      try {
        await moveDeal(dealId, stageId);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || 'Error al mover');
      }
    });
  };

  const handleWon = (id: string) => {
    startTransition(async () => {
      await setDealStatus(id, 'WON');
      toast.success('¡Oportunidad ganada!');
      router.refresh();
    });
  };

  const handleLost = (id: string) => {
    const reason = prompt('Razón de pérdida:');
    if (reason === null) return;
    startTransition(async () => {
      await setDealStatus(id, 'LOST', reason);
      toast.success('Oportunidad cerrada');
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta oportunidad?')) return;
    startTransition(async () => {
      await deleteDeal(id);
      toast.success('Eliminada');
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {pipeline.stages.map((stage) => {
          const total = stage.deals.reduce((sum, d) => sum + Number(d.amount), 0);
          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 w-80 rounded-lg p-2 transition ${
                dragOver === stage.id ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="flex items-center justify-between px-2 py-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: stage.color }} />
                  <h3 className="font-semibold">{stage.name}</h3>
                  <Badge variant="secondary" className="h-5">{stage.deals.length}</Badge>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {stage.deals.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal.id)}
                    onClick={() => setEditing(deal)}
                    className="p-3 cursor-pointer hover:shadow-md transition border-l-4"
                    style={{ borderLeftColor: stage.color }}
                  >
                    {(() => {
                      const rot = rotFor(deal.lastActivityAt, rottingDays);
                      if (rot.state === 'fresh') return null;
                      return (
                        <div className={`flex items-center gap-1 text-[10px] font-medium mb-1.5 rounded px-1.5 py-0.5 w-fit ${
                          rot.state === 'rotting'
                            ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        }`} title={`${rot.days} días sin actividad`}>
                          {rot.state === 'rotting' ? '🥀' : '⏳'} {rot.days}d sin tocar
                        </div>
                      );
                    })()}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm flex-1 line-clamp-2">{deal.title}</p>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleWon(deal.id)}>
                              <Trophy className="h-4 w-4 text-green-600" /> Marcar ganada
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleLost(deal.id)}>
                              <X className="h-4 w-4 text-red-600" /> Marcar perdida
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(deal.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <p className="text-lg font-bold mt-2">{formatCurrency(Number(deal.amount), deal.currency)}</p>

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{deal.probability}%</span>
                      {deal.expectedCloseDate && (
                        <>
                          <Calendar className="h-3 w-3 ml-1" />
                          <span>{formatDate(deal.expectedCloseDate)}</span>
                        </>
                      )}
                    </div>

                    {deal.company && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{deal.company.name}</span>
                      </div>
                    )}

                    {deal.owner && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">{initials(deal.owner.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{deal.owner.name}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <DealDialog
          deal={editing}
          pipeline={pipeline}
          contacts={contacts}
          companies={companies}
          users={users}
          products={products}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </>
  );
}
