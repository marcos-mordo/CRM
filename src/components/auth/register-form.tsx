'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function RegisterForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    organizationName: '',
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('error'));
        return;
      }

      toast.success(t('registerSuccess'));
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (!result?.error) {
        router.push('/dashboard');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="organizationName">{t('organizationName')}</Label>
        <Input
          id="organizationName"
          value={form.organizationName}
          onChange={handleChange('organizationName')}
          placeholder="Mi Empresa S.A."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">{t('yourName')}</Label>
        <Input id="name" value={form.name} onChange={handleChange('name')} placeholder="Juan Pérez" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          placeholder="tu@empresa.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t('registerButton')}
      </Button>
    </form>
  );
}
