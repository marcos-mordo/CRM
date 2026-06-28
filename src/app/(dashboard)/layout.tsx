import { requireAuth } from '@/lib/auth-helpers';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { ViewerBanner } from '@/components/dashboard/viewer-banner';
import { KeyboardShortcuts } from '@/components/dashboard/keyboard-shortcuts';
import { AiChatBubble } from '@/components/ai/ai-chat-bubble';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { QuickAdd } from '@/components/dashboard/quick-add';
import { ShortcutsCheatsheet } from '@/components/dashboard/shortcuts-cheatsheet';
import { SessionProvider } from 'next-auth/react';
import { listMyOrganizations } from '@/lib/current-org';
import { isAIConfigured } from '@/lib/ai';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  // Buscamos el organizationId original (default) leyendo el user de DB
  // para que el switcher muestre todas las orgs del usuario, no solo la actual
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  const organizations = user
    ? await listMyOrganizations(session.user.id, user.organizationId)
    : [];

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Topbar
            organizations={organizations}
            currentOrgId={session.user.organizationId}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 pb-20 lg:pb-8">
            <ViewerBanner role={(session.user as any).role} />
            {children}
          </main>
          <KeyboardShortcuts />
          <QuickAdd />
          <ShortcutsCheatsheet />
          <AiChatBubble enabled={isAIConfigured()} />
          <MobileBottomNav />
        </div>
      </div>
    </SessionProvider>
  );
}
