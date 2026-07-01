import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PublicWebForm } from '@/components/webform/public-webform';

export const metadata = { title: 'Formulario · BrandHub' };

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await prisma.webForm.findFirst({
    where: { slug, active: true },
    include: { organization: { select: { name: true } } },
  });
  if (!form) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 p-4 py-12">
      <PublicWebForm form={form} orgName={form.organization.name} />
    </div>
  );
}
