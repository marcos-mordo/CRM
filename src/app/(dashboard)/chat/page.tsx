import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { ChatLayout } from '@/components/chat/chat-layout';

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const session = await requireAuth();
  const { c: selectedConversationId } = await searchParams;

  const [conversations, users] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        organizationId: session.user.organizationId,
        participants: { some: { userId: session.user.id } },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        active: true,
        id: { not: session.user.id },
      },
      select: { id: true, name: true, email: true, avatar: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  let activeMessages: any[] = [];
  if (selectedConversationId) {
    // Verificar que el usuario es participante
    const isPart = conversations.some((c) => c.id === selectedConversationId);
    if (isPart) {
      activeMessages = await prisma.message.findMany({
        where: { conversationId: selectedConversationId },
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });
    }
  }

  return (
    <div className="space-y-4 h-full">
      <PageHeader title="Chat del equipo" description={`${conversations.length} conversaciones`} />
      <Card className="overflow-hidden">
        <ChatLayout
          conversations={conversations}
          users={users}
          currentUserId={session.user.id}
          selectedId={selectedConversationId}
          messages={activeMessages}
        />
      </Card>
    </div>
  );
}
