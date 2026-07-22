import { prisma } from './prisma';
import type { Column } from './xlsx';

/**
 * Registro universal de exportación. Cada entidad define su consulta (siempre
 * acotada a la organización) y sus columnas con tipo. Una sola fuente de verdad
 * para Excel y CSV. Sin límites de registros — a diferencia de Salesforce/
 * HubSpot/Zoho, que topan o gatean la exportación.
 */
export interface ExportDef {
  label: string; // nombre de la hoja / fichero
  fetch: (organizationId: string) => Promise<any[]>;
  columns: Column<any>[];
}

const fullName = (o: { firstName?: string | null; lastName?: string | null }) =>
  `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim();

export const EXPORTS: Record<string, ExportDef> = {
  contacts: {
    label: 'Contactos',
    fetch: (orgId) =>
      prisma.contact.findMany({
        where: { organizationId: orgId },
        include: { company: true, owner: true },
        orderBy: { createdAt: 'desc' },
      }),
    columns: [
      { key: 'firstName', label: 'Nombre' },
      { key: 'lastName', label: 'Apellidos' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'mobile', label: 'Móvil' },
      { key: 'jobTitle', label: 'Cargo' },
      { key: 'department', label: 'Departamento' },
      { key: 'company', label: 'Empresa', get: (r) => r.company?.name ?? '' },
      { key: 'city', label: 'Ciudad' },
      { key: 'country', label: 'País' },
      { key: 'source', label: 'Origen' },
      { key: 'owner', label: 'Responsable', get: (r) => r.owner?.name ?? '' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },

  companies: {
    label: 'Empresas',
    fetch: (orgId) =>
      prisma.company.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { contacts: true, deals: true } } },
        orderBy: { name: 'asc' },
      }),
    columns: [
      { key: 'name', label: 'Empresa' },
      { key: 'industry', label: 'Sector' },
      { key: 'website', label: 'Web' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'city', label: 'Ciudad' },
      { key: 'country', label: 'País' },
      { key: 'size', label: 'Tamaño' },
      { key: 'annualRevenue', label: 'Facturación anual', type: 'currency' },
      { key: 'contacts', label: 'Nº contactos', type: 'number', get: (r) => r._count?.contacts ?? 0 },
      { key: 'deals', label: 'Nº oportunidades', type: 'number', get: (r) => r._count?.deals ?? 0 },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },

  leads: {
    label: 'Leads',
    fetch: (orgId) =>
      prisma.lead.findMany({
        where: { organizationId: orgId },
        include: { owner: true },
        orderBy: { createdAt: 'desc' },
      }),
    columns: [
      { key: 'firstName', label: 'Nombre' },
      { key: 'lastName', label: 'Apellidos' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'company', label: 'Empresa' },
      { key: 'jobTitle', label: 'Cargo' },
      { key: 'status', label: 'Estado' },
      { key: 'score', label: 'Puntuación', type: 'number' },
      { key: 'estimatedValue', label: 'Valor estimado', type: 'currency' },
      { key: 'source', label: 'Origen' },
      { key: 'owner', label: 'Responsable', get: (r) => r.owner?.name ?? '' },
      { key: 'convertedAt', label: 'Convertido', type: 'date' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },

  deals: {
    label: 'Oportunidades',
    fetch: (orgId) =>
      prisma.deal.findMany({
        where: { organizationId: orgId },
        include: { contact: true, company: true, owner: true, stage: true },
        orderBy: { createdAt: 'desc' },
      }),
    columns: [
      { key: 'title', label: 'Oportunidad' },
      { key: 'stage', label: 'Etapa', get: (r) => r.stage?.name ?? '' },
      { key: 'status', label: 'Estado' },
      { key: 'amount', label: 'Importe', type: 'currency' },
      { key: 'currency', label: 'Moneda' },
      { key: 'probability', label: 'Probabilidad %', type: 'number' },
      { key: 'company', label: 'Empresa', get: (r) => r.company?.name ?? '' },
      { key: 'contact', label: 'Contacto', get: (r) => (r.contact ? fullName(r.contact) : '') },
      { key: 'owner', label: 'Responsable', get: (r) => r.owner?.name ?? '' },
      { key: 'expectedCloseDate', label: 'Cierre previsto', type: 'date' },
      { key: 'closedAt', label: 'Cerrado', type: 'date' },
      { key: 'lostReason', label: 'Razón de pérdida' },
      { key: 'lastActivityAt', label: 'Última actividad', type: 'date' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },

  tasks: {
    label: 'Tareas',
    fetch: (orgId) =>
      prisma.task.findMany({
        where: { organizationId: orgId },
        include: { assignee: true, creator: true, contact: true, deal: true },
        orderBy: { createdAt: 'desc' },
      }),
    columns: [
      { key: 'title', label: 'Tarea' },
      { key: 'status', label: 'Estado' },
      { key: 'priority', label: 'Prioridad' },
      { key: 'assignee', label: 'Asignada a', get: (r) => r.assignee?.name ?? '' },
      { key: 'creator', label: 'Creada por', get: (r) => r.creator?.name ?? '' },
      { key: 'contact', label: 'Contacto', get: (r) => (r.contact ? fullName(r.contact) : '') },
      { key: 'deal', label: 'Oportunidad', get: (r) => r.deal?.title ?? '' },
      { key: 'dueDate', label: 'Vencimiento', type: 'date' },
      { key: 'completedAt', label: 'Completada', type: 'datetime' },
      { key: 'createdAt', label: 'Creada', type: 'date' },
    ],
  },

  tickets: {
    label: 'Tickets',
    fetch: (orgId) =>
      prisma.ticket.findMany({
        where: { organizationId: orgId },
        include: { agent: true, contact: true },
        orderBy: { createdAt: 'desc' },
      }),
    columns: [
      { key: 'number', label: 'Nº', type: 'number' },
      { key: 'subject', label: 'Asunto' },
      { key: 'status', label: 'Estado' },
      { key: 'priority', label: 'Prioridad' },
      { key: 'category', label: 'Categoría' },
      { key: 'contact', label: 'Contacto', get: (r) => (r.contact ? fullName(r.contact) : '') },
      { key: 'agent', label: 'Agente', get: (r) => r.agent?.name ?? '' },
      { key: 'firstResponseAt', label: '1ª respuesta', type: 'datetime' },
      { key: 'resolvedAt', label: 'Resuelto', type: 'datetime' },
      { key: 'closedAt', label: 'Cerrado', type: 'datetime' },
      { key: 'createdAt', label: 'Creado', type: 'datetime' },
    ],
  },

  invoices: {
    label: 'Facturas',
    fetch: (orgId) =>
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        orderBy: { issueDate: 'desc' },
      }),
    columns: [
      { key: 'number', label: 'Número' },
      { key: 'status', label: 'Estado' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'customerTaxId', label: 'NIF/CIF' },
      { key: 'customerEmail', label: 'Email' },
      { key: 'issueDate', label: 'Emisión', type: 'date' },
      { key: 'dueDate', label: 'Vencimiento', type: 'date' },
      { key: 'paidDate', label: 'Pagada', type: 'date' },
      { key: 'subtotal', label: 'Subtotal', type: 'currency' },
      { key: 'taxAmount', label: 'Impuestos', type: 'currency' },
      { key: 'discount', label: 'Descuento', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'amountPaid', label: 'Pagado', type: 'currency' },
      { key: 'currency', label: 'Moneda' },
    ],
  },

  quotes: {
    label: 'Cotizaciones',
    fetch: (orgId) =>
      prisma.quote.findMany({
        where: { organizationId: orgId },
        orderBy: { issueDate: 'desc' },
      }),
    columns: [
      { key: 'number', label: 'Número' },
      { key: 'status', label: 'Estado' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'customerEmail', label: 'Email' },
      { key: 'issueDate', label: 'Emisión', type: 'date' },
      { key: 'validUntil', label: 'Válida hasta', type: 'date' },
      { key: 'subtotal', label: 'Subtotal', type: 'currency' },
      { key: 'taxAmount', label: 'Impuestos', type: 'currency' },
      { key: 'discount', label: 'Descuento', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'currency', label: 'Moneda' },
    ],
  },

  products: {
    label: 'Productos',
    fetch: (orgId) =>
      prisma.product.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' },
      }),
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Producto' },
      { key: 'category', label: 'Categoría' },
      { key: 'price', label: 'Precio', type: 'currency' },
      { key: 'cost', label: 'Coste', type: 'currency' },
      { key: 'taxRate', label: 'IVA %', type: 'number' },
      { key: 'unit', label: 'Unidad' },
      { key: 'stock', label: 'Stock', type: 'number' },
      { key: 'active', label: 'Activo', get: (r) => (r.active ? 'Sí' : 'No') },
    ],
  },

  'end-customers': {
    label: 'Clientes finales',
    fetch: (orgId) =>
      prisma.endCustomer.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      }),
    columns: [
      { key: 'name', label: 'Cliente', get: (r) => (r.isCompany ? r.companyName ?? '' : fullName(r)) },
      { key: 'isCompany', label: 'Tipo', get: (r) => (r.isCompany ? 'Empresa' : 'Particular') },
      { key: 'taxId', label: 'DNI/CIF' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'mobile', label: 'Móvil' },
      { key: 'address', label: 'Dirección' },
      { key: 'city', label: 'Ciudad' },
      { key: 'postalCode', label: 'CP' },
      { key: 'province', label: 'Provincia' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
};

export function exportKeys(): string[] {
  return Object.keys(EXPORTS);
}
