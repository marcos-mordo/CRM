'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Plus, UserCheck, UserX } from 'lucide-react';
import { changeUserRole, inviteUser, toggleUserActive } from '@/app/(dashboard)/settings/actions';
import { initials, formatDate } from '@/lib/utils';
import type { Role, User } from '@prisma/client';

export function TeamSettings({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const [form, setForm] = useState({ name: '', email: '', role: 'AGENT' as Role, password: '' });
  const [isPending, st] = useTransition();

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    st(async () => {
      try {
        await inviteUser(form);
        toast.success('Usuario creado');
        setOpen(false);
        setForm({ name: '', email: '', role: 'AGENT', password: '' });
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const toggle = (id: string) => {
    startTransition(async () => {
      try {
        await toggleUserActive(id);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const setRole = (id: string, role: Role) => {
    startTransition(async () => {
      try {
        await changeUserRole(id, role);
        toast.success(t('Common.saved'));
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('Settings.team')}</CardTitle>
          <CardDescription>{users.length} usuarios</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              {t('Settings.invite')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('Settings.invite')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={invite} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">{t('Settings.roles.ADMIN')}</SelectItem>
                    <SelectItem value="MANAGER">{t('Settings.roles.MANAGER')}</SelectItem>
                    <SelectItem value="AGENT">{t('Settings.roles.AGENT')}</SelectItem>
                    <SelectItem value="VIEWER">Solo lectura (auditor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña temporal *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                <p className="text-xs text-muted-foreground">El usuario podrá cambiarla después</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Common.cancel')}</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear usuario
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {u.role === 'OWNER' ? (
                    <Badge variant="default">{t('Settings.roles.OWNER')}</Badge>
                  ) : u.id === currentUserId ? (
                    <Badge variant="secondary">{t(`Settings.roles.${u.role}` as any)}</Badge>
                  ) : (
                    <Select value={u.role} onValueChange={(v) => setRole(u.id, v as Role)}>
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">{t('Settings.roles.ADMIN')}</SelectItem>
                        <SelectItem value="MANAGER">{t('Settings.roles.MANAGER')}</SelectItem>
                        <SelectItem value="AGENT">{t('Settings.roles.AGENT')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  {u.active ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Nunca'}
                </TableCell>
                <TableCell className="text-right">
                  {u.id !== currentUserId && u.role !== 'OWNER' && (
                    <Button variant="ghost" size="sm" onClick={() => toggle(u.id)}>
                      {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
