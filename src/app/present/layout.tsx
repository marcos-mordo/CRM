import { requireAuth } from '@/lib/auth-helpers';

export default async function PresentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <div className="min-h-screen bg-background p-6">{children}</div>;
}
