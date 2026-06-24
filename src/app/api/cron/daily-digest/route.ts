import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Cron diario que envía un resumen matinal a cada representante activo
 * con sus tareas del día, leads asignados y ventas pendientes.
 *
 * Programación recomendada: 0 7 * * * (todos los días a las 7am)
 * Solo envía si el rep tiene algo que mostrar.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_disabled' }, { status: 503 });
  }

  const url = new URL(req.url);
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('secret') ?? '';
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const users = await prisma.user.findMany({
    where: { active: true, role: { in: ['AGENT', 'MANAGER', 'ADMIN', 'OWNER'] } },
    include: { organization: true },
  });

  const results: { email: string; sent: boolean; reason?: string }[] = [];

  for (const user of users) {
    try {
      const [tasksToday, overdueTasks, leadsAssigned, salesPending] = await Promise.all([
        prisma.task.findMany({
          where: {
            assigneeId: user.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { gte: startOfDay, lt: endOfDay },
          },
          orderBy: { priority: 'desc' },
          take: 10,
        }),
        prisma.task.count({
          where: {
            assigneeId: user.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { lt: startOfDay },
          },
        }),
        prisma.lead.count({
          where: { ownerId: user.id, status: { in: ['NEW', 'CONTACTED'] } },
        }),
        prisma.sale.count({
          where: { representativeId: user.id, status: { in: ['DRAFT', 'PENDING_SIGN'] } },
        }),
      ]);

      const hasContent = tasksToday.length > 0 || overdueTasks > 0 || leadsAssigned > 0 || salesPending > 0;
      if (!hasContent) {
        results.push({ email: user.email, sent: false, reason: 'no content' });
        continue;
      }

      const tasksHtml = tasksToday.length === 0 ? '<li>Sin tareas para hoy.</li>' : tasksToday
        .map((t) => `<li><strong>${t.title}</strong> <span style="color:#94a3b8;font-size:11px">[${t.priority}]</span></li>`)
        .join('');

      const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#0f172a;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:24px;color:#fff;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px">Buenos días, ${user.name.split(' ')[0]}</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:13px">${user.organization.name} · ${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Resumen del día</h2>
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
      ${tasksToday.length > 0 ? `<div style="flex:1;min-width:120px;background:#f1f5f9;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#2563eb">${tasksToday.length}</div><div style="font-size:11px;color:#64748b">tareas hoy</div></div>` : ''}
      ${overdueTasks > 0 ? `<div style="flex:1;min-width:120px;background:#fef2f2;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#dc2626">${overdueTasks}</div><div style="font-size:11px;color:#64748b">vencidas</div></div>` : ''}
      ${leadsAssigned > 0 ? `<div style="flex:1;min-width:120px;background:#eff6ff;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#2563eb">${leadsAssigned}</div><div style="font-size:11px;color:#64748b">leads activos</div></div>` : ''}
      ${salesPending > 0 ? `<div style="flex:1;min-width:120px;background:#fffbeb;padding:12px;border-radius:6px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#d97706">${salesPending}</div><div style="font-size:11px;color:#64748b">ventas pendientes</div></div>` : ''}
    </div>

    <h3 style="font-size:13px;margin:0 0 8px;">Tareas para hoy:</h3>
    <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.6">${tasksHtml}</ul>

    <p style="margin-top:24px;text-align:center">
      <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/me" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-size:13px">Ir a mi panel</a>
    </p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">BrandHub · resumen diario · puedes desactivar este email desde Settings</p>
</body></html>`;

      await sendMail({
        to: user.email,
        subject: `🌅 Tu resumen del día — ${tasksToday.length} tareas para hoy`,
        html,
      });
      results.push({ email: user.email, sent: true });
    } catch (err: any) {
      results.push({ email: user.email, sent: false, reason: err?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({ ok: true, total: users.length, results });
}
