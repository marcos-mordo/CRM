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
  skipped: number;
  errors: string[];
}

export interface ImportDef {
  label: string;
  fields: ImportField[];
  run: (organizationId: string, rows: Record<string, string>[]) => Promise<ImportResult>;
}

const num = (v: string | undefined): number | null => {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};
const str = (v: string | undefined): string | null => {
  const s = (v ?? '').trim();
  return s === '' ? null : s;
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
    run: async (orgId, rows) => {
      const errors: string[] = [];
      const valid = rows.filter((r, i) => {
        if (!str(r.firstName) || !str(r.lastName)) { errors.push(`Fila ${i + 2}: falta nombre o apellidos`); return false; }
        return true;
      });

      // Dedupe por email ya existente
      const existing = new Set(
        (await prisma.contact.findMany({ where: { organizationId: orgId, email: { not: null } }, select: { email: true } }))
          .map((c) => c.email!.toLowerCase())
      );

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

      let created = 0, skipped = 0;
      for (const r of valid) {
        const email = str(r.email);
        if (email && existing.has(email.toLowerCase())) { skipped++; continue; }
        const companyName = str(r.company);
        await prisma.contact.create({
          data: {
            firstName: str(r.firstName)!, lastName: str(r.lastName)!,
            email, phone: str(r.phone), mobile: str(r.mobile), jobTitle: str(r.jobTitle),
            department: str(r.department), city: str(r.city), country: str(r.country), source: str(r.source),
            companyId: companyName ? companyIdByName.get(companyName.toLowerCase()) ?? null : null,
            organizationId: orgId,
          },
        });
        if (email) existing.add(email.toLowerCase());
        created++;
      }
      return { created, skipped, errors };
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
    run: async (orgId, rows) => {
      const errors: string[] = [];
      const existing = new Set((await prisma.company.findMany({ where: { organizationId: orgId }, select: { name: true } })).map((c) => c.name.toLowerCase()));
      let created = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const name = str(rows[i].name);
        if (!name) { errors.push(`Fila ${i + 2}: falta el nombre`); continue; }
        if (existing.has(name.toLowerCase())) { skipped++; continue; }
        await prisma.company.create({
          data: {
            name, industry: str(rows[i].industry), website: str(rows[i].website), email: str(rows[i].email),
            phone: str(rows[i].phone), city: str(rows[i].city), country: str(rows[i].country), size: str(rows[i].size),
            organizationId: orgId,
          },
        });
        existing.add(name.toLowerCase());
        created++;
      }
      return { created, skipped, errors };
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
    run: async (orgId, rows) => {
      const errors: string[] = [];
      const existing = new Set(
        (await prisma.lead.findMany({ where: { organizationId: orgId, email: { not: null } }, select: { email: true } })).map((l) => l.email!.toLowerCase())
      );
      let created = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!str(r.firstName) || !str(r.lastName)) { errors.push(`Fila ${i + 2}: falta nombre o apellidos`); continue; }
        const email = str(r.email);
        if (email && existing.has(email.toLowerCase())) { skipped++; continue; }
        await prisma.lead.create({
          data: {
            firstName: str(r.firstName)!, lastName: str(r.lastName)!, email, phone: str(r.phone),
            company: str(r.company), jobTitle: str(r.jobTitle), source: str(r.source),
            estimatedValue: num(r.estimatedValue), status: 'NEW', organizationId: orgId,
          },
        });
        if (email) existing.add(email.toLowerCase());
        created++;
      }
      return { created, skipped, errors };
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
    run: async (orgId, rows) => {
      const errors: string[] = [];
      const existing = new Set((await prisma.product.findMany({ where: { organizationId: orgId }, select: { sku: true } })).map((p) => p.sku.toLowerCase()));
      let created = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const sku = str(r.sku), name = str(r.name), price = num(r.price);
        if (!sku || !name || price === null) { errors.push(`Fila ${i + 2}: falta SKU, nombre o precio`); continue; }
        if (existing.has(sku.toLowerCase())) { skipped++; continue; }
        await prisma.product.create({
          data: {
            sku, name, category: str(r.category), price, cost: num(r.cost),
            taxRate: num(r.taxRate) ?? 0, unit: str(r.unit) ?? 'unit', organizationId: orgId,
          },
        });
        existing.add(sku.toLowerCase());
        created++;
      }
      return { created, skipped, errors };
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
    run: async (orgId, rows) => {
      const errors: string[] = [];
      let created = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const companyName = str(r.companyName);
        const hasName = str(r.firstName) || str(r.lastName) || companyName;
        if (!hasName) { errors.push(`Fila ${i + 2}: sin nombre ni empresa`); continue; }
        await prisma.endCustomer.create({
          data: {
            isCompany: !!companyName,
            firstName: str(r.firstName), lastName: str(r.lastName), companyName,
            taxId: str(r.taxId), email: str(r.email), phone: str(r.phone), mobile: str(r.mobile),
            address: str(r.address), city: str(r.city), postalCode: str(r.postalCode), province: str(r.province),
            country: 'España', organizationId: orgId,
          },
        });
        created++;
      }
      return { created, skipped, errors };
    },
  },
};

export function importKeys(): string[] {
  return Object.keys(IMPORTS);
}
