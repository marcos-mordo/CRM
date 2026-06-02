import { requireAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { BookOpen, Eye } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Badge } from '@/components/ui/badge';
import { ArticleDialog } from '@/components/knowledge/article-dialog';
import { ArticleActions } from '@/components/knowledge/article-actions';
import { getTranslations } from 'next-intl/server';
import { formatDate } from '@/lib/utils';

export default async function KnowledgePage() {
  const session = await requireAuth();
  const t = await getTranslations('Articles');

  const articles = await prisma.article.findMany({
    where: { organizationId: session.user.organizationId },
    include: { author: true },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={`${articles.length} artículos`}>
        <ArticleDialog />
      </PageHeader>

      {articles.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title={t('new')} action={<ArticleDialog />} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{a.title}</CardTitle>
                    {a.excerpt && <CardDescription className="line-clamp-2 mt-1">{a.excerpt}</CardDescription>}
                  </div>
                  <ArticleActions article={a} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {a.category && <Badge variant="secondary">{a.category}</Badge>}
                    {a.published ? <Badge variant="success">{t('published')}</Badge> : <Badge variant="outline">{t('draft')}</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {a.views}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {a.author.name} • {formatDate(a.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
