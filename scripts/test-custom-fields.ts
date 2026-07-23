/**
 * QA de campos personalizados — usa las funciones REALES del lib
 * (getCustomFieldsWithValues / saveCustomFieldValues). Verifica roundtrip,
 * borrado por valor vacío, cascada al eliminar el campo. Limpia todo.
 */
import { PrismaClient } from '@prisma/client';
import { getCustomFieldsWithValues, saveCustomFieldValues } from '../src/lib/custom-fields';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const prisma = new PrismaClient();

let fail = 0;
const check = (n: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${n} ${extra}`); if (!ok) fail++; };

async function main() {
  const org = await prisma.organization.findFirst();
  const orgId = org!.id;
  const TAG = `zzcf_${Date.now()}`;
  const contact = await prisma.contact.create({ data: { firstName: 'QA', lastName: TAG, organizationId: orgId } });

  // Definir 2 campos personalizados de CONTACT
  const nivel = await prisma.customField.create({ data: { organizationId: orgId, entity: 'CONTACT', key: `nivel_${TAG}`, label: 'Nivel', type: 'SELECT', options: ['Bronce', 'Plata', 'Oro'], order: 100 } });
  const presupuesto = await prisma.customField.create({ data: { organizationId: orgId, entity: 'CONTACT', key: `pres_${TAG}`, label: 'Presupuesto', type: 'NUMBER', required: true, order: 101 } });

  // 1. get devuelve los campos sin valor aún
  let items = (await getCustomFieldsWithValues('CONTACT', contact.id, orgId)).filter((it) => it.field.key.includes(TAG));
  check('get devuelve los 2 campos definidos', items.length === 2, `(${items.length})`);
  check('sin valor inicial', items.every((it) => it.value === null));

  // 2. Guardar valores
  await saveCustomFieldValues('CONTACT', contact.id, orgId, { [nivel.key]: 'Oro', [presupuesto.key]: '50000' });
  items = (await getCustomFieldsWithValues('CONTACT', contact.id, orgId)).filter((it) => it.field.key.includes(TAG));
  const byKey = Object.fromEntries(items.map((it) => [it.field.key, it.value]));
  check('valor SELECT guardado', byKey[nivel.key] === 'Oro', `(${byKey[nivel.key]})`);
  check('valor NUMBER guardado', byKey[presupuesto.key] === '50000', `(${byKey[presupuesto.key]})`);

  // 3. Actualizar un valor
  await saveCustomFieldValues('CONTACT', contact.id, orgId, { [nivel.key]: 'Plata' });
  const v2 = (await getCustomFieldsWithValues('CONTACT', contact.id, orgId)).find((it) => it.field.key === nivel.key)?.value;
  check('valor actualizado', v2 === 'Plata', `(${v2})`);

  // 4. Valor vacío elimina el valor
  await saveCustomFieldValues('CONTACT', contact.id, orgId, { [nivel.key]: '' });
  const v3 = (await getCustomFieldsWithValues('CONTACT', contact.id, orgId)).find((it) => it.field.key === nivel.key)?.value;
  check('valor vacío borra el valor', v3 === null, `(${v3})`);

  // 5. Cascada: borrar el campo elimina sus CustomFieldValue
  await prisma.customField.delete({ where: { id: presupuesto.id } });
  const remaining = await prisma.customFieldValue.count({ where: { fieldId: presupuesto.id } });
  check('borrar campo elimina sus valores (cascada)', remaining === 0, `(${remaining})`);

  // Limpieza
  try {
    await prisma.customField.deleteMany({ where: { key: { contains: TAG } } });
    await prisma.contact.delete({ where: { id: contact.id } });
  } catch (e: any) { console.log('(aviso limpieza:', e.message, ')'); }

  await prisma.$disconnect();
  console.log(fail === 0 ? '\n✅ Campos personalizados OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
