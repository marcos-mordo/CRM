/**
 * QA runtime de la importación. Prueba el parser (CSV con comillas + xlsx
 * generado con exceljs) y el importador real contra la DB:
 *  - contactos: crea empresa por nombre, dedupe por email en re-import
 *  - productos: requeridos (SKU/precio), dedupe por SKU
 *  - auto-mapeo por cabeceras con acentos/alias
 * Limpia lo que crea al terminar.
 */
import ExcelJS from 'exceljs';
import { parseCsv, parseXlsx, autoMap } from '../src/lib/parse-table';
import { IMPORTS } from '../src/lib/import-registry';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public';
const prisma = new PrismaClient();

let fail = 0;
const check = (name: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name} ${extra}`); if (!ok) fail++; };

async function main() {
  const org = await prisma.organization.findFirst();
  const orgId = org!.id;
  const TAG = `zzqa_${Date.now()}`;

  // 1. Parser CSV con comillas, comas internas y acentos
  const csv = `Nombre,Apellidos,Correo,Empresa\nJuan,"Pérez, Jr",juan@${TAG}.com,"Acme, S.L."\nMaría,López,maria@${TAG}.com,Globex`;
  const pc = parseCsv(csv);
  check('CSV: cabeceras', pc.headers.join(',') === 'Nombre,Apellidos,Correo,Empresa');
  check('CSV: comilla con coma interna', pc.rows[0][1] === 'Pérez, Jr', `("${pc.rows[0][1]}")`);
  check('CSV: 2 filas', pc.rows.length === 2);

  // 2. Auto-mapeo por alias/acentos
  const map = autoMap(pc.headers, IMPORTS.contacts.fields);
  check('auto-map Nombre→firstName', map.firstName === 'Nombre');
  check('auto-map Correo→email', map.email === 'Correo', `(${map.email})`);
  check('auto-map Empresa→company', map.company === 'Empresa');

  // 3. Parser XLSX (generado con exceljs)
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['SKU', 'Producto', 'Precio', 'IVA']);
  ws.addRow([`${TAG}-A`, 'Silla', 49.9, 21]);
  ws.addRow([`${TAG}-B`, 'Mesa', '120,50', 21]); // precio con coma decimal
  const xbuf = Buffer.from(await wb.xlsx.writeBuffer());
  const px = await parseXlsx(xbuf);
  check('XLSX: cabeceras', px.headers.join(',') === 'SKU,Producto,Precio,IVA');
  check('XLSX: 2 filas de datos', px.rows.length === 2, `(${px.rows.length})`);

  // 4. Import contactos (crea empresa por nombre)
  const mappedContacts = pc.rows.map((r) => ({
    firstName: r[0], lastName: r[1], email: r[2], company: r[3],
  }));
  const rc = await IMPORTS.contacts.run(orgId, mappedContacts);
  check('import contactos: 2 creados', rc.created === 2, `(created ${rc.created}, skip ${rc.skipped}, err ${rc.errors.length})`);
  const acme = await prisma.company.findFirst({ where: { organizationId: orgId, name: 'Acme, S.L.' } });
  check('import contactos: empresa creada por nombre', !!acme);
  const c1 = await prisma.contact.findFirst({ where: { email: `juan@${TAG}.com` }, include: { company: true } });
  check('import contactos: contacto ligado a su empresa', c1?.company?.name === 'Acme, S.L.', `(${c1?.company?.name})`);

  // 5. Re-import → dedupe por email
  const rc2 = await IMPORTS.contacts.run(orgId, mappedContacts);
  check('re-import: 0 creados, 2 omitidos', rc2.created === 0 && rc2.skipped === 2, `(created ${rc2.created}, skip ${rc2.skipped})`);

  // 6. Import productos (requeridos + coma decimal + dedupe SKU)
  const pmap = autoMap(px.headers, IMPORTS.products.fields);
  const idx = new Map(px.headers.map((h, i) => [h, i]));
  const mappedProducts = px.rows.map((r) => {
    const rec: Record<string, string> = {};
    for (const [k, h] of Object.entries(pmap)) rec[k] = r[idx.get(h)!] ?? '';
    return rec;
  });
  const rp = await IMPORTS.products.run(orgId, mappedProducts);
  check('import productos: 2 creados', rp.created === 2, `(created ${rp.created}, err ${rp.errors.length})`);
  const mesa = await prisma.product.findFirst({ where: { sku: `${TAG}-B` } });
  check('import productos: coma decimal → 120.5', mesa ? Number(mesa.price) === 120.5 : false, `(${mesa ? Number(mesa.price) : 'n/a'})`);

  // 7. Requerido ausente → error, no crea
  const rbad = await IMPORTS.products.run(orgId, [{ name: 'SinSKU', price: '10' }]);
  check('import productos: falta SKU → error', rbad.created === 0 && rbad.errors.length === 1, `(created ${rbad.created}, err ${rbad.errors.length})`);

  // Limpieza (defensiva: no debe hacer fallar el test si algo tiene FK)
  try {
    await prisma.contact.deleteMany({ where: { email: { contains: TAG } } });
    await prisma.product.deleteMany({ where: { sku: { contains: TAG } } });
    // Solo borra las empresas creadas por este test (sin contactos restantes)
    for (const name of ['Acme, S.L.', 'Globex']) {
      const co = await prisma.company.findFirst({ where: { organizationId: orgId, name }, include: { _count: { select: { contacts: true, deals: true } } } });
      if (co && co._count.contacts === 0 && co._count.deals === 0) await prisma.company.delete({ where: { id: co.id } });
    }
  } catch (e: any) { console.log('(aviso limpieza:', e.message, ')'); }

  await prisma.$disconnect();
  console.log(fail === 0 ? '\n✅ Importación OK' : `\n❌ ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
