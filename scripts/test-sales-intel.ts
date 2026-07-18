import { PrismaClient } from '@prisma/client';
import { rotStateFor, pickRoundRobinOwner, winLossAnalytics } from '../src/lib/sales-intel';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const prisma = new PrismaClient();

async function main() {
  let fail = 0;
  const check = (name: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name} ${extra}`); if (!ok) fail++; };

  // 1. rotting
  check('rotting: fresh', rotStateFor(new Date(), 14).state === 'fresh');
  check('rotting: warm', rotStateFor(new Date(Date.now() - 8 * 86400000), 14).state === 'warm');
  check('rotting: rotting', rotStateFor(new Date(Date.now() - 20 * 86400000), 14).state === 'rotting');

  // 2. round-robin rota entre reps
  const org = await prisma.organization.findFirst();
  await prisma.organization.update({ where: { id: org!.id }, data: { roundRobinEnabled: true, roundRobinPointer: 0 } });
  const reps = await prisma.user.count({ where: { organizationId: org!.id, active: true, role: { in: ['AGENT', 'MANAGER', 'ADMIN', 'OWNER'] } } });
  const picks: (string | null)[] = [];
  for (let i = 0; i < reps + 1; i++) picks.push(await pickRoundRobinOwner(org!.id));
  const distinct = new Set(picks.filter(Boolean)).size;
  check('round-robin reparte entre todos los reps', distinct === reps, `(${distinct}/${reps})`);
  check('round-robin vuelve a empezar (pointer cíclico)', picks[0] === picks[reps], `(${picks[0]?.slice(-4)} == ${picks[reps]?.slice(-4)})`);
  await prisma.organization.update({ where: { id: org!.id }, data: { roundRobinEnabled: false } });

  // 3. round-robin desactivado → null
  check('round-robin off → null', (await pickRoundRobinOwner(org!.id)) === null);

  // 4. analytics
  const a = await winLossAnalytics(org!.id, 90);
  check('winLoss winRate numérico', typeof a.winRate === 'number', `(${a.winRate}%, ${a.won}W/${a.lost}L)`);
  check('winLoss lossReasons array', Array.isArray(a.lossReasons));

  await prisma.$disconnect();
  console.log(fail === 0 ? '\n✅ Sales Intelligence OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
