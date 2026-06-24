import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hashToken, setPortalCookie } from '@/lib/portal-auth';

export default async function PortalVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect('/portal/login?error=missing-token');

  const hash = hashToken(token);
  const session = await prisma.portalSession.findUnique({
    where: { tokenHash: hash },
    include: { endCustomer: true },
  });

  if (!session) redirect('/portal/login?error=invalid-token');
  if (session.consumedAt) redirect('/portal/login?error=token-used');
  if (session.expiresAt < new Date()) redirect('/portal/login?error=token-expired');
  if (!session.endCustomer.portalEnabled) redirect('/portal/login?error=portal-disabled');

  await prisma.portalSession.update({
    where: { id: session.id },
    data: { consumedAt: new Date() },
  });

  await setPortalCookie(session.endCustomerId, session.organizationId);
  redirect('/portal');
}
