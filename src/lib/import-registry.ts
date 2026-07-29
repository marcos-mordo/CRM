import { prisma } from './prisma';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number';
  aliases?: string[]; // para el auto-mapeo (nombres típicos en otros CRM)
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ImportOpts {
  updateExisting?: boolean; // si true, actualiza el registro duplicado en vez de omitirlo
}

export interface ImportDef {
  label: string;
  fields: ImportField[];
  run: (organizationId: string, rows: Record<string, string>[], opts?: ImportOpts) => Promise<ImportResult>;
}

// Añade a `patch` solo los valores no vacíos (no pisa datos existentes con blancos)
function patchNonEmpty(patch: Record<string, any>, entries: Record<string, any>) {
  for (const [k, v] of Object.entries(entries)) if (v != null) patch[k] = v;
  return patch;
}

const num = (v: string | undefined): number | null => {
  if (!v) return null;
  let s = String(v).trim().replace(/[^0-9.,-]/g, '');
  if (s === '') return null;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // El último separador es el decimal: "1.500,50" (es) o "1,500.50" (en)
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (hasComma) {
    s = s.replace(',', '.'); // "1500,50"
  }
  const n = Number(s);
  return isNaN(n) ? null : n;
};
const str = (v: string | undefined): string | null => {
  const s = (v ?? '').trim();
  return s === '' ? null : s;
};
const date = (v: string | undefined): Date | null => {
  const s = (v ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const IMPORTS: Record<string, ImportDef> = {
  contacts: {
    label: 'Contactos',
    fields: [
      { key: 'firstName', label: 'Nombre', required: true, aliases: ['first name', 'nombre', 'name', 'firstname'] },
      { key: 'lastName', label: 'Apellidos', required: true, aliases: ['last name', 'apellido', 'apellidos', 'surname', 'lastname'] },
      { key: 'email', label: 'Email', aliases: ['correo', 'e-mail', 'mail'] },
      { key: 'phone', label: 'Teléfono', aliases: ['telefono', 'phone number', 'tel'] },
      { key: 'mobile', label: 'Móvil', aliases: ['movil', 'celular', 'cell'] },
      { key: 'jobTitle', label: 'Cargo', aliases: ['puesto', 'title', 'position', 'job title'] },
      { key: 'department', label: 'Departamento', aliases: ['department'] },
      { key: 'company', label: 'Empresa', aliases: ['empresa', 'company name', 'organización', 'account'] },
      { key: 'city', label: 'Ciudad', aliases: ['ciudad', 'localidad'] },
      { key: 'country', label: 'País', aliases: ['pais', 'country'] },
      { key: 'source', label: 'Origen', aliases: ['origen', 'lead source'] },
    ],
    run: async (orgId, rows, opts) => {
      const errors: string[] = [];
      const valid = rows.filter((r, i) => {
        if (!str(r.firstName) || !str(r.lastName)) { errors.push(`Fila ${i + 2}: falta nombre o apellidos`); return false; }
        return true;
      });

      // Dedupe por email ya existente → id del registro
      const existing = new Map<string, string>();
      (await prisma.contact.findMany({ where: { organizationId: orgId, email: { not: null } }, select: { id: true, email: true } }))
        .forEach((c) => existing.set(c.email!.toLowerCase(), c.id));

      // Resolver empresas por nombre (match o crear)
      const companyNames = [...new Set(valid.map((r) => str(r.company)).filter(Boolean) as string[])];
      const companyIdByName = new Map<string, string>();
      if (companyNames.length > 0) {
        const found = await prisma.company.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } });
        for (const c of found) companyIdByName.set(c.name.toLowerCase(), c.id);
        const toCreate = companyNames.filter((n) => !companyIdByName.has(n.toLowerCase()));
        for (const name of toCreate) {
          const created = await prisma.company.create({ data: { name, organizationId: orgId }, select: { id: true, name: true } });
          companyIdByName.set(created.name.toLowerCase(), created.id);
        }
      }

      let created = 0, updated = 0, skipped = 0;
      for (const r of valid) {
        const email = str(r.email);
        const key = email?.toLowerCase();
        const companyName = str(r.company);
        const companyId = companyName ? companyIdByName.get(companyName.toLowerCase()) ?? null : null;
        const fields = {
          firstName: str(r.firstName)!, lastName: str(r.lastName)!,
          email, phone: str(r.phone), mobile: str(r.mobile), jobTitle: str(r.jobTitle),
          department: str(r.department), city: str(r.city), country: str(r.country), source: str(r.source), companyId,
        };
        if (key && existing.has(key)) {
          if (opts?.updateExisting) {
            await prisma.contact.update({ where: { id: existing.get(key)! }, data: patchNonEmpty({}, fields) });
            updated++;
          } else skipped++;
          continue;
        }
        const c = await prisma.contact.create({ data: { ...fields, organizationId: orgId }, select: { id: true } });
        if (key) existing.set(key, c.id);
        created++;
      }
      return { created, updated, skipped, errors };
    },
  },

  companies: {
    label: 'Empresas',
    fields: [
      { key: 'name', label: 'Empresa', required: true, aliases: ['nombre', 'company', 'company name', 'razón social', 'account'] },
      { key: 'industry', label: 'Sector', aliases: ['sector', 'industry'] },
      { key: 'website', label: 'Web', aliases: ['web', 'sitio web', 'url'] },
      { key: 'email', label: 'Email', aliases: ['correo', 'mail'] },
      { key: 'phone', label: 'Teléfono', aliases: ['telefono', 'tel'] },
      { key: 'city', label: 'Ciudad', aliases: ['ciudad'] },
      { key: 'country', label: 'País', aliases: ['pais'] },
      { key: 'size', label: 'Tamaño', aliases: ['tamaño', 'empleados', 'size'] },
    ],
    run: async (orgId, rows, opts) => {
      const errors: string[] = [];
      const existing = new Map<string, string>();
      (await prisma.company.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } })).forEach((c) => existing.set(c.name.toLowerCase(), c.id));
      let created = 0, updated = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const name = str(rows[i].name);
        if (!name) { errors.push(`Fila ${i + 2}: falta el nombre`); continue; }
        const key = name.toLowerCase();
        const fields = {
          name, industry: str(rows[i].industry), website: str(rows[i].website), email: str(rows[i].email),
          phone: str(rows[i].phone), city: str(rows[i].city), country: str(rows[i].country), size: str(rows[i].size),
        };
        if (existing.has(key)) {
          if (opts?.updateExisting) { await prisma.company.update({ where: { id: existing.get(key)! }, data: patchNonEmpty({}, fields) }); updated++; }
          else skipped++;
          continue;
        }
        const c = await prisma.company.create({ data: { ...fields, organizationId: orgId }, select: { id: true } });
        existing.set(key, c.id);
        created++;
      }
      return { created, updated, skipped, errors };
    },
  },

  leads: {
    label: 'Leads',
    fields: [
      { key: 'firstName', label: 'Nombre', required: true, aliases: ['nombre', 'first name', 'name'] },
      { key: 'lastName', label: 'Apellidos', required: true, aliases: ['apellidos', 'last name', 'surname'] },
      { key: 'email', label: 'Email', aliases: ['correo', 'mail'] },
      { key: 'phone', label: 'Teléfono', aliases: ['telefono', 'tel'] },
      { key: 'company', label: 'Empresa', aliases: ['empresa', 'company'] },
      { key: 'jobTitle', label: 'Cargo', aliases: ['puesto', 'title'] },
      { key: 'source', label: 'Origen', aliases: ['origen', 'lead source'] },
      { key: 'estimatedValue', label: 'Valor estimado', type: 'number', aliases: ['valor', 'value', 'amount', 'importe'] },
    ],
    run: async (orgId, rows, opts) => {
      const errors: string[] = [];
      const existing = new Map<string, string>();
      (await prisma.lead.findMany({ where: { organizationId: orgId, email: { not: null } }, select: { id: true, email: true } })).forEach((l) => existing.set(l.email!.toLowerCase(), l.id));
      let created = 0, updated = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!str(r.firstName) || !str(r.lastName)) { errors.push(`Fila ${i + 2}: falta nombre o apellidos`); continue; }
        const email = str(r.email);
        const key = email?.toLowerCase();
        const fields = {
          firstName: str(r.firstName)!, lastName: str(r.lastName)!, email, phone: str(r.phone),
          company: str(r.company), jobTitle: str(r.jobTitle), source: str(r.source), estimatedValue: num(r.estimatedValue),
        };
        if (key && existing.has(key)) {
          if (opts?.updateExisting) { await prisma.lead.update({ where: { id: existing.get(key)! }, data: patchNonEmpty({}, fields) }); updated++; }
          else skipped++;
          continue;
        }
        const l = await prisma.lead.create({ data: { ...fields, status: 'NEW', organizationId: orgId }, select: { id: true } });
        if (key) existing.set(key, l.id);
        created++;
      }
      return { created, updated, skipped, errors };
    },
  },

  deals: {
    label: 'Oportunidades',
    fields: [
      { key: 'title', label: 'Oportunidad', required: true, aliases: ['titulo', 'título', 'nombre', 'name', 'deal', 'opportunity', 'asunto'] },
      { key: 'amount', label: 'Importe', type: 'number', aliases: ['importe', 'amount', 'valor', 'value', 'monto'] },
      { key: 'currency', label: 'Moneda', aliases: ['moneda', 'currency', 'divisa'] },
      { key: 'company', label: 'Empresa', aliases: ['empresa', 'company', 'cuenta', 'account'] },
      { key: 'contactEmail', label: 'Email del contacto', aliases: ['email', 'correo', 'contacto', 'contact'] },
      { key: 'probability', label: 'Probabilidad %', type: 'number', aliases: ['probabilidad', 'probability', 'prob'] },
      { key: 'expectedCloseDate', label: 'Cierre previsto', aliases: ['cierre', 'fecha cierre', 'close date', 'expected close', 'closing date'] },
      { key: 'source', label: 'Origen', aliases: ['origen', 'source'] },
    ],
    run: async (orgId, rows) => {
      const errors: string[] = [];
      // Pipeline por defecto (o el primero) + su primera etapa
      const pipeline =
        (await prisma.pipeline.findFirst({ where: { organizationId: orgId, isDefault: true }, include: { stages: { orderBy: { order: 'asc' }, take: 1 } } })) ??
        (await prisma.pipeline.findFirst({ where: { organizationId: orgId }, include: { stages: { orderBy: { order: 'asc' }, take: 1 } } }));
      if (!pipeline || pipeline.stages.length === 0) {
        return { created: 0, updated: 0, skipped: 0, errors: ['No hay un pipeline con etapas configurado para importar oportunidades'] };
      }
      const stageId = pipeline.stages[0].id;

      // Resolver empresas por nombre (match o crear)
      const valid = rows.filter((r) => !!str(r.title));
      const companyNames = [...new Set(valid.map((r) => str(r.company)).filter(Boolean) as string[])];
      const companyIdByName = new Map<string, string>();
      if (companyNames.length > 0) {
        const found = await prisma.company.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } });
        for (const c of found) companyIdByName.set(c.name.toLowerCase(), c.id);
        for (const name of companyNames.filter((n) => !companyIdByName.has(n.toLowerCase()))) {
          const created = await prisma.company.create({ data: { name, organizationId: orgId }, select: { id: true, name: true } });
          companyIdByName.set(created.name.toLowerCase(), created.id);
        }
      }
      // Resolver contactos por email (solo match, no crear)
      const contactByEmail = new Map<string, string>();
      (await prisma.contact.findMany({ where: { organizationId: orgId, email: { not: null } }, select: { id: true, email: true } }))
        .forEach((c) => contactByEmail.set(c.email!.toLowerCase(), c.id));

      let created = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const title = str(r.title);
        if (!title) { errors.push(`Fila ${i + 2}: falta el título de la oportunidad`); continue; }
        const companyName = str(r.company);
        const email = str(r.contactEmail);
        await prisma.deal.create({
          data: {
            title,
            amount: num(r.amount) ?? 0,
            currency: str(r.currency) ?? 'EUR',
            probability: Math.min(100, Math.max(0, Math.round(num(r.probability) ?? 0))),
            status: 'OPEN',
            expectedCloseDate: date(r.expectedCloseDate),
            source: str(r.source),
            pipelineId: pipeline.id,
            stageId,
            companyId: companyName ? companyIdByName.get(companyName.toLowerCase()) ?? null : null,
            contactId: email ? contactByEmail.get(email.toLowerCase()) ?? null : null,
            organizationId: orgId,
          },
        });
        created++;
      }
      return { created, updated: 0, skipped: 0, errors };
    },
  },

  products: {
    label: 'Productos',
    fields: [
      { key: 'sku', label: 'SKU', required: true, aliases: ['codigo', 'code', 'referencia', 'ref'] },
      { key: 'name', label: 'Producto', required: true, aliases: ['nombre', 'name', 'producto', 'descripción corta'] },
      { key: 'category', label: 'Categoría', aliases: ['categoria', 'category', 'familia'] },
      { key: 'price', label: 'Precio', type: 'number', required: true, aliases: ['precio', 'price', 'pvp'] },
      { key: 'cost', label: 'Coste', type: 'number', aliases: ['coste', 'cost'] },
      { key: 'taxRate', label: 'IVA %', type: 'number', aliases: ['iva', 'tax', 'impuesto'] },
      { key: 'unit', label: 'Unidad', aliases: ['unidad', 'unit'] },
    ],
    run: async (orgId, rows, opts) => {
      const errors: string[] = [];
      const existing = new Map<string, string>();
      (await prisma.product.findMany({ where: { organizationId: orgId }, select: { id: true, sku: true } })).forEach((p) => existing.set(p.sku.toLowerCase(), p.id));
      let created = 0, updated = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const sku = str(r.sku), name = str(r.name), price = num(r.price);
        if (!sku || !name || price === null) { errors.push(`Fila ${i + 2}: falta SKU, nombre o precio`); continue; }
        const key = sku.toLowerCase();
        const fields = { sku, name, category: str(r.category), price, cost: num(r.cost), taxRate: num(r.taxRate) ?? 0, unit: str(r.unit) ?? 'unit' };
        if (existing.has(key)) {
          if (opts?.updateExisting) { await prisma.product.update({ where: { id: existing.get(key)! }, data: patchNonEmpty({}, fields) }); updated++; }
          else skipped++;
          continue;
        }
        const p = await prisma.product.create({ data: { ...fields, organizationId: orgId }, select: { id: true } });
        existing.set(key, p.id);
        created++;
      }
      return { created, updated, skipped, errors };
    },
  },

  'end-customers': {
    label: 'Clientes finales',
    fields: [
      { key: 'firstName', label: 'Nombre', aliases: ['nombre', 'first name'] },
      { key: 'lastName', label: 'Apellidos', aliases: ['apellidos', 'last name'] },
      { key: 'companyName', label: 'Empresa', aliases: ['empresa', 'company', 'razón social'] },
      { key: 'taxId', label: 'DNI/CIF', aliases: ['dni', 'cif', 'nif', 'tax id'] },
      { key: 'email', label: 'Email', aliases: ['correo', 'mail'] },
      { key: 'phone', label: 'Teléfono', aliases: ['telefono', 'tel'] },
      { key: 'mobile', label: 'Móvil', aliases: ['movil', 'celular'] },
      { key: 'address', label: 'Dirección', aliases: ['direccion', 'address'] },
      { key: 'city', label: 'Ciudad', aliases: ['ciudad'] },
      { key: 'postalCode', label: 'CP', aliases: ['codigo postal', 'cp', 'zip'] },
      { key: 'province', label: 'Provincia', aliases: ['provincia', 'state'] },
    ],
    run: async (orgId, rows, opts) => {
      const errors: string[] = [];
      // Dedupe por DNI/CIF (cuando existe)
      const existing = new Map<string, string>();
      (await prisma.endCustomer.findMany({ where: { organizationId: orgId, taxId: { not: null } }, select: { id: true, taxId: true } }))
        .forEach((c) => existing.set(c.taxId!.toLowerCase(), c.id));
      let created = 0, updated = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const companyName = str(r.companyName);
        const hasName = str(r.firstName) || str(r.lastName) || companyName;
        if (!hasName) { errors.push(`Fila ${i + 2}: sin nombre ni empresa`); continue; }
        const taxId = str(r.taxId);
        const key = taxId?.toLowerCase();
        const fields = {
          isCompany: !!companyName,
          firstName: str(r.firstName), lastName: str(r.lastName), companyName,
          taxId, email: str(r.email), phone: str(r.phone), mobile: str(r.mobile),
          address: str(r.address), city: str(r.city), postalCode: str(r.postalCode), province: str(r.province),
        };
        if (key && existing.has(key)) {
          if (opts?.updateExisting) { await prisma.endCustomer.update({ where: { id: existing.get(key)! }, data: patchNonEmpty({}, fields) }); updated++; }
          else skipped++;
          continue;
        }
        const c = await prisma.endCustomer.create({ data: { ...fields, country: 'España', organizationId: orgId }, select: { id: true } });
        if (key) existing.set(key, c.id);
        created++;
      }
      return { created, updated, skipped, errors };
    },
  },
};

export function importKeys(): string[] {
  return Object.keys(IMPORTS);
}
