/**
 * QA: los campos personalizados aparecen como columnas en el export.
 * Usa customFieldColumns (helper REAL) contra la DB. Crea un campo + valor,
 * verifica la columna generada, y limpia.
 */
import { PrismaClient } from '@prisma/client';
import { customFieldColumns } from '../src/lib/export-registry';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const prisma = new PrismaClient();

let fail = 0;
const check = (n: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${n} ${extra}`); if (!ok) fail++; };

async function main() {
  const org = await prisma.organization.findFirst();
  const orgId = org!.id;
  const TAG = `zzcfx_${Date.now()}`;

  const contact = await prisma.contact.create({ data: { firstName: 'QA', lastName: TAG, organizationId: orgId } });
  const fieldText = await prisma.customField.create({
    data: { organizationId: orgId, entity: 'CONTACT', key: `nivel_${TAG}`, label: `Nivel ${TAG}`, type: 'SELECT', options: ['Oro', 'Plata'], order: 90, active: true },
  });
  const fieldMulti = await prisma.customField.create({
    data: { organizationId: orgId, entity: 'CONTACT', key: `tags_${TAG}`, label: `Tags ${TAG}`, type: 'MULTISELECT', options: ['A', 'B', 'C'], order: 91, active: true },
  });
  await prisma.customFieldValue.create({ data: { organizationId: orgId, entity: 'CONTACT', entityId: contact.id, fieldId: fieldText.id, value: 'Oro' } });
  await prisma.customFieldValue.create({ data: { organizationId: orgId, entity: 'CONTACT', entityId: contact.id, fieldId: fieldMulti.id, value: JSON.stringify(['A', 'C']) } });

  const cols = await customFieldColumns(orgId, 'contacts');
  const colText = cols.find((c) => c.label === `Nivel ${TAG}`);
  const colMulti = cols.find((c) => c.label === `Tags ${TAG}`);

  check('genera columna para el campo SELECT', !!colText);
  check('genera columna para el campo MULTISELECT', !!colMulti);
  check('valor SELECT correcto en la fila', colText?.get?.({ id: contact.id }) === 'Oro', `(${colText?.get?.({ id: contact.id })})`);
  check('MULTISELECT legible (join)', colMulti?.get?.({ id: contact.id }) === 'A, C', `(${colMulti?.get?.({ id: contact.id })})`);
  check('fila sin valor → vacío', colText?.get?.({ id: 'noexiste' }) === '', `(${JSON.stringify(colText?.get?.({ id: 'noexiste' }))})`);

  // La entidad "invoices" no admite campos personalizados → sin columnas
  const none = await customFieldColumns(orgId, 'invoices');
  check('entidad sin campos personalizados → []', none.length === 0, `(${none.length})`);

  // Limpieza
  try {
    await prisma.customFieldValue.deleteMany({ where: { entityId: contact.id } });
    await prisma.customField.deleteMany({ where: { key: { contains: TAG } } });
    await prisma.contact.delete({ where: { id: contact.id } });
  } catch (e: any) { console.log('(aviso limpieza:', e.message, ')'); }

  await prisma.$disconnect();
  console.log(fail === 0 ? '\n✅ Campos personalizados en export OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
