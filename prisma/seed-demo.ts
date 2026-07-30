/**
 * Seed de demostración BrandHub.
 * Crea DOS organizaciones:
 *   1) "BrandHub Demo" — VACÍA. Usuario admin@brandhub.local / admin1234.
 *   2) "Nómada Agency" — LLENA. Usuario demo@brandhub.com / demo1234,
 *      con ~1 mes de uso real en TODOS los módulos.
 *
 * Se ejecuta contra una BD temporal y luego se vuelca a scripts/init-seed.sql
 * (ver scripts/dump-seed.ts) para hornearlo en el instalador.
 */
import { PrismaClient, WebhookEvent, ApiTokenScope, TicketPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NOW = Date.now();
const DAY = 86_400_000;
/** Fecha a `daysAgo` días (negativo = futuro), con hora fija. */
const d = (daysAgo: number, hour = 10, min = 0) => {
  const dt = new Date(NOW - daysAgo * DAY);
  dt.setHours(hour, min, 0, 0);
  return dt;
};
const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

async function main() {
  console.log('🌱 Seed de demo (org vacía + org llena)...');

  // ============================================================
  // 1) ORGANIZACIÓN VACÍA — admin@brandhub.local (IDs originales)
  // ============================================================
  const emptyOrg = await prisma.organization.create({
    data: {
      id: 'demo_org_brandhub',
      name: 'BrandHub Demo',
      slug: 'brandhub-demo',
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      locale: 'es',
    },
  });
  await prisma.user.create({
    data: {
      id: 'demo_user_admin',
      name: 'Administrador',
      email: 'admin@brandhub.local',
      password: await bcrypt.hash('admin1234', 10),
      role: 'OWNER',
      superAdmin: true,
      organizationId: emptyOrg.id,
    },
  });
  console.log('✓ Org vacía + admin@brandhub.local');

  // ============================================================
  // 2) ORGANIZACIÓN LLENA — Nómada Agency
  // ============================================================
  const org = await prisma.organization.create({
    data: {
      name: 'Nómada Agency',
      slug: 'nomada-agency',
      industry: 'Agencia multimarca de ciberseguridad',
      website: 'https://nomada.agency',
      phone: '+34 910 555 200',
      address: 'Calle Gran Vía 28, 28013 Madrid, España',
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      locale: 'es',
      rottingDays: 14,
    },
  });
  const pass = await bcrypt.hash('demo1234', 10);
  const owner = await prisma.user.create({
    data: { name: 'Marcos Morales', email: 'demo@brandhub.com', password: pass, role: 'OWNER', phone: '+34 600 111 001', organizationId: org.id, lastLoginAt: d(0, 8), createdAt: d(45) },
  });
  const manager = await prisma.user.create({
    data: { name: 'Lucía Fernández', email: 'lucia@nomada.agency', password: pass, role: 'MANAGER', phone: '+34 600 111 002', organizationId: org.id, lastLoginAt: d(0, 9), createdAt: d(44) },
  });
  const rep1 = await prisma.user.create({
    data: { name: 'Carlos Ruiz', email: 'carlos@nomada.agency', password: pass, role: 'AGENT', phone: '+34 600 111 003', organizationId: org.id, lastLoginAt: d(1, 18), createdAt: d(43) },
  });
  const rep2 = await prisma.user.create({
    data: { name: 'Sara Gómez', email: 'sara@nomada.agency', password: pass, role: 'AGENT', phone: '+34 600 111 004', organizationId: org.id, lastLoginAt: d(0, 12), createdAt: d(40) },
  });
  const rep3 = await prisma.user.create({
    data: { name: 'Diego Ramírez', email: 'diego@nomada.agency', password: pass, role: 'AGENT', phone: '+34 600 111 005', organizationId: org.id, lastLoginAt: d(2, 16), createdAt: d(30) },
  });
  const viewer = await prisma.user.create({
    data: { name: 'Auditoría Externa', email: 'auditor@nomada.agency', password: pass, role: 'VIEWER', organizationId: org.id, createdAt: d(20) },
  });
  const reps = [rep1, rep2, rep3];
  const team = [owner, manager, rep1, rep2, rep3, viewer];
  console.log(`✓ Org llena "${org.name}" + ${team.length} usuarios`);

  // Membresías multi-org (el owner también en la agencia)
  for (const u of team) {
    await prisma.organizationMembership.create({
      data: { userId: u.id, organizationId: org.id, role: u.role, joinedAt: u.createdAt },
    });
  }

  // Preferencias de notificación + 2FA del owner
  for (const u of team) {
    await prisma.notificationPreference.create({
      data: { userId: u.id, emailDigest: true, emailInstant: u.role !== 'AGENT', pushEnabled: true, events: { SALE_SIGNED: true, COMMISSION_PAID: true, TASK_DUE: true, MENTION: true } },
    });
  }
  await prisma.userTwoFactor.create({
    data: { userId: owner.id, secret: 'JBSWY3DPEHPK3PXP', backupCodes: ['a1b2c3d4', 'e5f6g7h8', 'i9j0k1l2'], enabled: true, enabledAt: d(40) },
  });

  // Suscripción SaaS
  await prisma.subscription.create({
    data: { organizationId: org.id, plan: 'PRO', status: 'ACTIVE', currentPeriodEnd: d(-20), stripeSubscriptionId: 'sub_demo_' + org.id.slice(0, 8), stripePriceId: 'price_pro_monthly' },
  });

  // ---------------------------------------------------------
  // MARCAS representadas + catálogos + comisiones
  // ---------------------------------------------------------
  const brandDefs = [
    { name: 'CyberShield', legalName: 'CyberShield Security S.L.', taxId: 'B12345678', description: 'EDR/XDR y MDR para empresas medianas', website: 'cybershield.io', contactPerson: 'Elena Vargas', contactEmail: 'partners@cybershield.io', contactPhone: '+34 91 123 4567', ct: 'PERCENTAGE' as const, cv: 15 },
    { name: 'CloudGuard', legalName: 'CloudGuard Technologies SA', taxId: 'A87654321', description: 'Backup en la nube y disaster recovery', website: 'cloudguard.es', contactPerson: 'Marcos Ruiz', contactEmail: 'channel@cloudguard.es', ct: 'PERCENTAGE' as const, cv: 20 },
    { name: 'PenTestPro', legalName: 'PenTestPro Consulting', taxId: 'B11223344', description: 'Auditorías de seguridad y pentesting', website: 'pentestpro.com', contactPerson: 'Daniela Pérez', ct: 'PERCENTAGE' as const, cv: 10 },
    { name: 'SOCWatch', legalName: 'SOCWatch 24/7 Services', taxId: 'B55667788', description: 'SOC gestionado 24/7 con respuesta a incidentes', contactPerson: 'Iván Castro', ct: 'FIXED_AMOUNT' as const, cv: 150 },
    { name: 'TrainSec', legalName: 'TrainSec Academy', description: 'Formación en ciberseguridad para empleados', ct: 'PERCENTAGE' as const, cv: 25 },
  ];
  const brands = [];
  for (const b of brandDefs) {
    brands.push(await prisma.brand.create({
      data: {
        name: b.name, legalName: b.legalName, taxId: b.taxId, description: b.description, website: b.website,
        contactPerson: b.contactPerson, contactEmail: b.contactEmail, contactPhone: b.contactPhone,
        defaultCommissionType: b.ct, defaultCommissionValue: b.cv, organizationId: org.id, createdAt: d(43),
      },
    }));
  }
  const [cybershield, cloudguard, pentestpro, socwatch, trainsec] = brands;

  const bpDefs = [
    { sku: 'CS-EDR-PRO', name: 'CyberShield EDR Pro', type: 'SAAS_SUBSCRIPTION' as const, bf: 'YEARLY' as const, price: 1800, brand: cybershield },
    { sku: 'CS-XDR-ENT', name: 'CyberShield XDR Enterprise', type: 'SAAS_SUBSCRIPTION' as const, bf: 'YEARLY' as const, price: 7500, brand: cybershield },
    { sku: 'CG-BCK-1TB', name: 'Backup 1TB mensual', type: 'SAAS_SUBSCRIPTION' as const, bf: 'MONTHLY' as const, price: 89, brand: cloudguard },
    { sku: 'CG-DRP-STD', name: 'Disaster Recovery estándar', type: 'MANAGED_SERVICE' as const, bf: 'MONTHLY' as const, price: 450, brand: cloudguard },
    { sku: 'PT-WEB-BASIC', name: 'Pentest web básico', type: 'AUDIT' as const, bf: 'ONE_TIME' as const, price: 2500, brand: pentestpro },
    { sku: 'PT-INFRA-FULL', name: 'Pentest infraestructura completo', type: 'AUDIT' as const, bf: 'ONE_TIME' as const, price: 8000, brand: pentestpro, ct: 'PERCENTAGE' as const, cv: 15 },
    { sku: 'SW-SOC-50EP', name: 'SOC 24/7 hasta 50 endpoints', type: 'MANAGED_SERVICE' as const, bf: 'MONTHLY' as const, price: 1200, brand: socwatch },
    { sku: 'SW-SOC-200EP', name: 'SOC 24/7 hasta 200 endpoints', type: 'MANAGED_SERVICE' as const, bf: 'MONTHLY' as const, price: 3500, brand: socwatch },
    { sku: 'TS-PHISH-PACK', name: 'Pack concienciación phishing (anual)', type: 'TRAINING' as const, bf: 'YEARLY' as const, price: 1500, brand: trainsec },
    { sku: 'TS-CISO-DAY', name: 'CISO as a Service (jornada)', type: 'CONSULTANCY' as const, bf: 'ONE_TIME' as const, price: 950, brand: trainsec },
  ];
  const brandProducts = [];
  for (const p of bpDefs) {
    brandProducts.push(await prisma.brandProduct.create({
      data: {
        sku: p.sku, name: p.name, description: p.name, type: p.type, billingFrequency: p.bf,
        basePrice: p.price, taxRate: 21, currency: 'EUR', brandId: p.brand.id, organizationId: org.id,
        commissionType: p.ct, commissionValue: p.cv, createdAt: d(43),
      },
    }));
  }

  // Reglas de comisión
  await prisma.commissionRule.createMany({
    data: [
      { name: 'Comisión base agencia', scope: 'AGENCY', type: 'PERCENTAGE', value: 12, organizationId: org.id },
      { name: 'CyberShield — 15%', scope: 'BRAND', type: 'PERCENTAGE', value: 15, brandId: cybershield.id, organizationId: org.id },
      { name: 'Pentest infra — 15% override', scope: 'PRODUCT', type: 'PERCENTAGE', value: 15, productId: brandProducts[5].id, organizationId: org.id },
      { name: 'Carlos — bonus SOC fijo', scope: 'REP', type: 'FIXED_AMOUNT', value: 200, repUserId: rep1.id, organizationId: org.id },
    ],
  });

  // Plantillas de contrato
  await prisma.contractTemplate.createMany({
    data: [
      { name: 'Contrato marco de servicios', htmlContent: '<h1>Contrato de servicios</h1><p>Entre {{cliente}} y Nómada Agency...</p>', organizationId: org.id },
      { name: 'Anexo CyberShield EDR', version: 2, htmlContent: '<h2>Anexo técnico EDR</h2><p>Cobertura de {{endpoints}} endpoints.</p>', brandId: cybershield.id, organizationId: org.id },
    ],
  });

  // Asignaciones rep ↔ marca
  const assignPairs: Array<[typeof rep1, typeof cybershield, string?]> = [
    [rep1, cybershield, 'Madrid'], [rep1, socwatch, 'Madrid'], [rep1, cloudguard, undefined],
    [rep2, cloudguard, 'Cataluña'], [rep2, trainsec, 'Cataluña'], [rep2, pentestpro, undefined],
    [rep3, pentestpro, 'Norte'], [rep3, cybershield, 'Norte'], [rep3, socwatch, undefined],
  ];
  for (const [u, b, t] of assignPairs) {
    await prisma.repBrandAssignment.create({ data: { userId: u.id, brandId: b.id, territory: t, organizationId: org.id, createdAt: d(42) } });
  }
  console.log(`✓ ${brands.length} marcas, ${brandProducts.length} productos de marca, comisiones y asignaciones`);

  // ---------------------------------------------------------
  // PIPELINE
  // ---------------------------------------------------------
  const pipeline = await prisma.pipeline.create({
    data: {
      name: 'Pipeline comercial', isDefault: true, organizationId: org.id,
      stages: { create: [
        { name: 'Nuevo', order: 0, probability: 10, color: '#94a3b8' },
        { name: 'Contactado', order: 1, probability: 25, color: '#3b82f6' },
        { name: 'Propuesta', order: 2, probability: 50, color: '#8b5cf6' },
        { name: 'Negociación', order: 3, probability: 75, color: '#f59e0b' },
        { name: 'Cerrado ganado', order: 4, probability: 100, color: '#10b981' },
      ] },
    },
    include: { stages: { orderBy: { order: 'asc' } } },
  });

  // ---------------------------------------------------------
  // EMPRESAS + CONTACTOS
  // ---------------------------------------------------------
  const companyDefs = [
    { name: 'Grupo Sanitas Digital', industry: 'Salud', city: 'Madrid', size: '200+', rev: 25_000_000 },
    { name: 'Bufete Alonso & Asociados', industry: 'Legal', city: 'Madrid', size: '11-50', rev: 3_500_000 },
    { name: 'Retail Ibérica SA', industry: 'Retail', city: 'Barcelona', size: '200+', rev: 40_000_000 },
    { name: 'Constructora Mediterráneo', industry: 'Construcción', city: 'Valencia', size: '50-200', rev: 18_000_000 },
    { name: 'FinTech Novabank', industry: 'Finanzas', city: 'Madrid', size: '50-200', rev: 30_000_000 },
    { name: 'Logística del Ebro', industry: 'Logística', city: 'Zaragoza', size: '50-200', rev: 12_000_000 },
    { name: 'EduTech Campus', industry: 'Educación', city: 'Sevilla', size: '11-50', rev: 2_000_000 },
    { name: 'Industrias Cárnicas Norte', industry: 'Alimentación', city: 'Bilbao', size: '200+', rev: 55_000_000 },
    { name: 'Turismo Costa Sol', industry: 'Turismo', city: 'Málaga', size: '50-200', rev: 9_000_000 },
    { name: 'AgroTech Andalucía', industry: 'Agricultura', city: 'Córdoba', size: '11-50', rev: 4_500_000 },
    { name: 'Seguros Peninsular', industry: 'Seguros', city: 'Madrid', size: '200+', rev: 60_000_000 },
    { name: 'Media Studios BCN', industry: 'Medios', city: 'Barcelona', size: '11-50', rev: 6_000_000 },
  ];
  const companies = [];
  for (const c of companyDefs) {
    companies.push(await prisma.company.create({
      data: {
        name: c.name, industry: c.industry, city: c.city, country: 'España', size: c.size,
        annualRevenue: c.rev, website: c.name.toLowerCase().replace(/[^a-z]/g, '') + '.es',
        phone: '+34 9' + rnd(10, 99) + ' ' + rnd(100, 999) + ' ' + rnd(100, 999),
        email: 'info@' + c.name.toLowerCase().replace(/[^a-z]/g, '') + '.es',
        organizationId: org.id, createdAt: d(rnd(20, 40)),
      },
    }));
  }

  const firstNames = ['Ana', 'Roberto', 'Patricia', 'Fernando', 'Sofía', 'Javier', 'Laura', 'Diego', 'Carmen', 'Pablo', 'Marta', 'Sergio', 'Elena', 'Raúl', 'Beatriz', 'Andrés', 'Cristina', 'Alberto', 'Nuria', 'Óscar', 'Silvia', 'Gonzalo', 'Rocío', 'Adrián', 'Lorena', 'Hugo', 'Irene', 'Víctor', 'Alicia', 'Rubén'];
  const lastNames = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Ruiz', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Torres', 'Navarro', 'Gil'];
  const jobTitles = ['CTO', 'CISO', 'Director de IT', 'Responsable de Sistemas', 'CEO', 'Director de Compras', 'Gerente', 'Responsable de Seguridad', 'CFO', 'Director de Operaciones'];
  const sources = ['Web', 'Referido', 'Evento', 'LinkedIn', 'Llamada fría', 'Webinar'];

  const contacts = [];
  for (let i = 0; i < 30; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = pick(lastNames);
    const company = i < 24 ? companies[i % companies.length] : undefined;
    contacts.push(await prisma.contact.create({
      data: {
        firstName: fn, lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g, '')}${i}@${company ? company.name.toLowerCase().replace(/[^a-z]/g, '') + '.es' : 'gmail.com'}`,
        phone: '+34 6' + rnd(10, 99) + ' ' + rnd(100, 999) + ' ' + rnd(100, 999),
        jobTitle: pick(jobTitles), source: pick(sources),
        companyId: company?.id, ownerId: pick(reps).id, organizationId: org.id, createdAt: d(rnd(1, 40)),
      },
    }));
  }
  console.log(`✓ ${companies.length} empresas, ${contacts.length} contactos`);

  // Tags + asignaciones
  const tagDefs = [
    { name: 'VIP', color: '#ef4444' }, { name: 'Renovación', color: '#f59e0b' }, { name: 'Upsell', color: '#10b981' },
    { name: 'Sector público', color: '#3b82f6' }, { name: 'Riesgo fuga', color: '#8b5cf6' }, { name: 'Champion', color: '#ec4899' },
  ];
  const tags = [];
  for (const t of tagDefs) tags.push(await prisma.tag.create({ data: { ...t, organizationId: org.id } }));
  for (const c of contacts.slice(0, 22)) {
    const chosen = [...tags].sort(() => Math.random() - 0.5).slice(0, rnd(1, 3));
    for (const t of chosen) await prisma.contactTag.create({ data: { contactId: c.id, tagId: t.id } });
  }

  // ---------------------------------------------------------
  // LEADS (+ scoring IA en algunos)
  // ---------------------------------------------------------
  const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const;
  const leadCompanies = ['Innova Startups', 'Grupo Textil Sur', 'Clínica Vet Madrid', 'Hostelería Premium', 'TechLab Solutions', 'Distribuciones Vega', 'Academia Idiomas Global', 'Inmobiliaria Central', 'Taller Mecánico Pro', 'Consultora RRHH Plus', 'Farmacia González', 'Estudio Arquitectura ML', 'Gimnasios FitZone', 'Notaría Ramírez', 'ONG Futuro Verde'];
  const leads = [];
  for (let i = 0; i < 25; i++) {
    const fn = pick(firstNames), ln = pick(lastNames);
    const status = leadStatuses[i % leadStatuses.length];
    const score = status === 'QUALIFIED' ? rnd(65, 95) : status === 'CONTACTED' ? rnd(40, 70) : status === 'NEW' ? rnd(5, 40) : rnd(0, 30);
    const lead = await prisma.lead.create({
      data: {
        firstName: fn, lastName: ln,
        email: `${fn.toLowerCase()}${i}@${leadCompanies[i % leadCompanies.length].toLowerCase().replace(/[^a-z]/g, '')}.es`,
        phone: '+34 6' + rnd(10, 99) + ' ' + rnd(100, 999) + ' ' + rnd(100, 999),
        company: leadCompanies[i % leadCompanies.length], jobTitle: pick(jobTitles),
        source: pick(sources), status, score,
        estimatedValue: [null, 15000, 25000, 40000, 60000, 90000][rnd(0, 5)] ?? undefined,
        notes: 'Interesado en ' + pick(['EDR', 'SOC gestionado', 'backup cloud', 'pentest', 'formación phishing']) + '.',
        convertedAt: status === 'CONVERTED' ? d(rnd(1, 15)) : undefined,
        ownerId: pick(reps).id, organizationId: org.id, createdAt: d(rnd(1, 35)),
      },
    });
    leads.push(lead);
    if (i < 8) {
      await prisma.leadScore.create({
        data: {
          leadId: lead.id, probability: score,
          priority: score >= 70 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW',
          reasoning: 'Cargo de decisión y sector regulado con obligaciones de ciberseguridad; encaja con el catálogo.',
          suggestion: 'Agendar demo de ' + pick(['CyberShield EDR', 'SOCWatch', 'PenTestPro']) + ' esta semana.',
          organizationId: org.id, computedAt: d(rnd(1, 10)),
        },
      });
    }
  }
  console.log(`✓ ${leads.length} leads (8 con scoring IA)`);

  // ---------------------------------------------------------
  // DEALS + line items
  // ---------------------------------------------------------
  const dealTitles = ['EDR para', 'SOC 24/7 para', 'Backup cloud para', 'Pentest anual para', 'Formación phishing para', 'Renovación licencias', 'Migración DR para', 'Auditoría RGPD para', 'XDR Enterprise para', 'Consultoría CISO para'];
  const deals = [];
  for (let i = 0; i < 22; i++) {
    const stageIdx = i < 5 ? 4 : rnd(0, 3);
    const won = stageIdx === 4;
    const lost = !won && i % 7 === 0;
    const company = pick(companies);
    const amount = pick([12000, 18000, 25000, 35000, 48000, 60000, 85000, 120000]);
    const lastAct = won || lost ? rnd(1, 20) : pick([1, 2, 3, 5, 8, 12, 16, 21, 25]); // algunos > rottingDays → "pudriéndose"
    const deal = await prisma.deal.create({
      data: {
        title: `${pick(dealTitles)} ${company.name}`,
        description: 'Oportunidad generada desde ' + pick(sources).toLowerCase() + '.',
        amount, currency: 'EUR',
        probability: pipeline.stages[stageIdx].probability,
        status: won ? 'WON' : lost ? 'LOST' : 'OPEN',
        stageId: pipeline.stages[stageIdx].id, pipelineId: pipeline.id,
        contactId: pick(contacts).id, companyId: company.id, ownerId: pick(reps).id,
        expectedCloseDate: d(-rnd(2, 45)), closedAt: won || lost ? d(rnd(1, 15)) : undefined,
        lostReason: lost ? pick(['Presupuesto', 'Eligió competencia', 'Proyecto aplazado']) : undefined,
        lastActivityAt: d(lastAct), source: pick(sources), organizationId: org.id, createdAt: d(rnd(10, 40)),
      },
    });
    deals.push(deal);
    if (i < 8) {
      const bp = pick(brandProducts);
      const qty = rnd(1, 10);
      const unit = Number(bp.basePrice);
      await prisma.dealLineItem.create({
        data: { dealId: deal.id, description: bp.name, quantity: qty, unitPrice: unit, discount: pick([0, 0, 5, 10]), total: unit * qty, productId: undefined },
      });
    }
  }
  console.log(`✓ ${deals.length} oportunidades (5 ganadas, con líneas)`);

  // ---------------------------------------------------------
  // ACTIVIDADES (timeline, ~120 sobre 30 días)
  // ---------------------------------------------------------
  const actTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'] as const;
  const actSubjects: Record<string, string[]> = {
    CALL: ['Llamada de seguimiento', 'Llamada de descubrimiento', 'Llamada de cierre', 'Llamada post-venta'],
    EMAIL: ['Envío de propuesta', 'Email de seguimiento', 'Respuesta a dudas técnicas', 'Envío de contrato'],
    MEETING: ['Reunión de demo', 'Reunión kickoff', 'Reunión de negociación', 'Revisión trimestral'],
    NOTE: ['Nota interna', 'Resumen de la reunión', 'Feedback del cliente', 'Recordatorio comercial'],
  };
  let actCount = 0;
  for (let i = 0; i < 120; i++) {
    const type = pick(actTypes);
    const target = pick(['contact', 'deal', 'lead']);
    await prisma.activity.create({
      data: {
        type, subject: pick(actSubjects[type]),
        description: type === 'NOTE' ? 'El cliente muestra interés; requiere seguimiento en 3-4 días.' : undefined,
        occurredAt: d(rnd(0, 30), rnd(9, 18), rnd(0, 59)),
        userId: pick(team.slice(0, 5)).id, organizationId: org.id,
        contactId: target === 'contact' ? pick(contacts).id : undefined,
        dealId: target === 'deal' ? pick(deals).id : undefined,
        leadId: target === 'lead' ? pick(leads).id : undefined,
      },
    });
    actCount++;
  }
  console.log(`✓ ${actCount} actividades en el timeline`);

  // ---------------------------------------------------------
  // TAREAS + plantillas
  // ---------------------------------------------------------
  const taskTitles = ['Llamar para seguimiento', 'Enviar propuesta', 'Preparar demo', 'Revisar contrato', 'Actualizar CRM', 'Confirmar reunión', 'Enviar factura', 'Cerrar renovación', 'Documentar caso', 'Escalar incidencia'];
  const taskStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
  const taskPr = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
  for (let i = 0; i < 32; i++) {
    const status = i < 12 ? 'COMPLETED' : taskStatuses[i % taskStatuses.length];
    const dueOffset = pick([-5, -3, -1, 0, 0, 1, 2, 3, 5, 8]); // negativos = vencidas o próximas
    await prisma.task.create({
      data: {
        title: `${pick(taskTitles)} — ${pick(contacts).firstName}`,
        description: pick(['', 'Prioritario para este mes.', 'Coordinar con el equipo técnico.']),
        priority: pick(taskPr), status,
        dueDate: d(dueOffset, rnd(9, 17)),
        completedAt: status === 'COMPLETED' ? d(rnd(0, 20)) : undefined,
        reminderSentAt: dueOffset <= 0 && status !== 'COMPLETED' ? d(0, 8) : undefined,
        assigneeId: pick(team.slice(0, 5)).id, creatorId: pick([owner, manager]).id,
        contactId: i % 3 === 0 ? pick(contacts).id : undefined,
        dealId: i % 3 === 1 ? pick(deals).id : undefined,
        leadId: i % 3 === 2 ? pick(leads).id : undefined,
        organizationId: org.id, createdAt: d(rnd(1, 25)),
      },
    });
  }
  await prisma.taskTemplate.createMany({
    data: [
      { title: 'Revisión semanal de pipeline', cadence: 'weekly', weekday: 1, assignedToId: manager.id, priority: 'MEDIUM', organizationId: org.id },
      { title: 'Cierre de comisiones mensual', cadence: 'monthly', monthDay: 1, assignedToId: owner.id, priority: 'HIGH', organizationId: org.id },
    ],
  });
  console.log('✓ 32 tareas + 2 plantillas recurrentes');

  // Notas + menciones
  for (let i = 0; i < 10; i++) {
    const c = pick(contacts);
    const note = await prisma.note.create({
      data: {
        content: pick(['Cliente clave, trato preferente.', 'Pendiente de firma del contrato marco.', 'Interesado en ampliar a XDR el próximo trimestre.', 'Sensible al precio, ofrecer descuento por volumen.']),
        authorId: pick([owner, manager, rep1]).id, organizationId: org.id, createdAt: d(rnd(1, 20)),
        contacts: { create: { contactId: c.id } },
      },
    });
    if (i < 3) await prisma.noteMention.create({ data: { noteId: note.id, mentionedUserId: pick(reps).id } });
  }

  // ---------------------------------------------------------
  // CATÁLOGO GENÉRICO + COTIZACIONES + FACTURAS + PAGOS
  // ---------------------------------------------------------
  const products = [];
  const prodDefs = [
    { sku: 'SRV-EDR', name: 'Despliegue EDR', category: 'Servicios', price: 3500 },
    { sku: 'SRV-SOC', name: 'Alta SOC gestionado', category: 'Servicios', price: 1200 },
    { sku: 'SRV-DRP', name: 'Plan Disaster Recovery', category: 'Servicios', price: 4800 },
    { sku: 'SRV-PENTEST', name: 'Pentest completo', category: 'Auditoría', price: 8000 },
    { sku: 'SRV-FORM', name: 'Formación in-company', category: 'Formación', price: 2500 },
    { sku: 'SUP-PREM', name: 'Soporte premium mensual', category: 'Soporte', price: 600 },
    { sku: 'LIC-EDR-U', name: 'Licencia EDR por usuario/año', category: 'Licencias', price: 42 },
    { sku: 'CON-CISO', name: 'Consultoría CISO (jornada)', category: 'Consultoría', price: 950 },
  ];
  for (const p of prodDefs) products.push(await prisma.product.create({ data: { ...p, taxRate: 21, unit: 'unidad', cost: p.price * 0.4, organizationId: org.id } }));

  const quoteStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;
  for (let i = 0; i < 8; i++) {
    const c = pick(companies);
    const p1 = pick(products), p2 = pick(products);
    const q1 = rnd(1, 20), q2 = rnd(1, 5);
    const sub = Number(p1.price) * q1 + Number(p2.price) * q2;
    const tax = sub * 0.21;
    await prisma.quote.create({
      data: {
        number: `COT-2026-${String(i + 1).padStart(4, '0')}`,
        status: quoteStatuses[i % quoteStatuses.length],
        issueDate: d(rnd(3, 28)), validUntil: d(-rnd(5, 25)),
        customerName: c.name, customerEmail: c.email ?? undefined,
        subtotal: sub, taxAmount: tax, total: sub + tax, currency: 'EUR',
        organizationId: org.id,
        lines: { create: [
          { description: p1.name, quantity: q1, unitPrice: Number(p1.price), taxRate: 21, total: Number(p1.price) * q1 * 1.21, order: 0 },
          { description: p2.name, quantity: q2, unitPrice: Number(p2.price), taxRate: 21, total: Number(p2.price) * q2 * 1.21, order: 1 },
        ] },
      },
    });
  }

  const invStatuses = ['PAID', 'PAID', 'SENT', 'PARTIAL', 'OVERDUE', 'DRAFT'] as const;
  for (let i = 0; i < 12; i++) {
    const c = pick(companies);
    const p = pick(products);
    const qty = rnd(1, 24);
    const sub = Number(p.price) * qty;
    const tax = sub * 0.21;
    const total = sub + tax;
    const status = invStatuses[i % invStatuses.length];
    const issue = d(rnd(5, 55));
    const paid = status === 'PAID';
    const partial = status === 'PARTIAL';
    const inv = await prisma.invoice.create({
      data: {
        number: `FAC-2026-${String(i + 1).padStart(4, '0')}`, status,
        issueDate: issue, dueDate: d(rnd(-20, 20)),
        paidDate: paid ? d(rnd(1, 30)) : undefined,
        customerName: c.name, customerEmail: c.email ?? undefined, customerTaxId: 'B' + rnd(10000000, 99999999),
        subtotal: sub, taxAmount: tax, total, amountPaid: paid ? total : partial ? total / 2 : 0,
        currency: 'EUR', organizationId: org.id,
        lines: { create: [{ description: p.name, quantity: qty, unitPrice: Number(p.price), taxRate: 21, total, order: 0 }] },
      },
    });
    if (paid) await prisma.payment.create({ data: { invoiceId: inv.id, amount: total, method: pick(['Transferencia', 'Tarjeta', 'Domiciliación']), reference: 'PAY-' + rnd(10000, 99999), paidAt: d(rnd(1, 30)) } });
    if (partial) await prisma.payment.create({ data: { invoiceId: inv.id, amount: total / 2, method: 'Transferencia', reference: 'PAY-' + rnd(10000, 99999), paidAt: d(rnd(1, 15)) } });
  }
  console.log('✓ 8 productos, 8 cotizaciones, 12 facturas con pagos');

  // ---------------------------------------------------------
  // CLIENTES FINALES + VENTAS + COMISIONES + ADJUNTOS
  // ---------------------------------------------------------
  const endCustomers = [];
  for (let i = 0; i < 15; i++) {
    const isComp = i % 3 !== 0;
    endCustomers.push(await prisma.endCustomer.create({
      data: {
        isCompany: isComp,
        companyName: isComp ? pick(['Despacho', 'Clínica', 'Taller', 'Estudio', 'Grupo', 'Comercial']) + ' ' + pick(lastNames) + ' SL' : undefined,
        firstName: !isComp ? pick(firstNames) : undefined,
        lastName: !isComp ? pick(lastNames) : undefined,
        taxId: (isComp ? 'B' : '') + rnd(10000000, 99999999) + (isComp ? '' : 'Z'),
        email: `cliente${i}@empresa.es`, mobile: '+34 6' + rnd(10, 99) + ' ' + rnd(100, 999) + ' ' + rnd(100, 999),
        address: 'Calle ' + pick(lastNames) + ' ' + rnd(1, 200), city: pick(['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao']),
        postalCode: String(rnd(1000, 52000)).padStart(5, '0'), province: pick(['Madrid', 'Barcelona', 'Valencia']),
        gdprConsent: true, gdprConsentAt: d(rnd(5, 40)), marketingConsent: i % 2 === 0,
        portalEnabled: i % 4 === 0, organizationId: org.id, createdAt: d(rnd(5, 40)),
      },
    }));
  }

  const saleStatuses = ['ACTIVE', 'ACTIVE', 'SIGNED', 'PENDING_SIGN', 'DRAFT', 'CANCELLED'] as const;
  const commStatuses = ['PAID', 'APPROVED', 'PENDING'] as const;
  for (let i = 0; i < 20; i++) {
    const bp = pick(brandProducts);
    const brand = brands.find((b) => b.id === bp.brandId)!;
    const rep = pick(reps);
    const ec = pick(endCustomers);
    const status = saleStatuses[i % saleStatuses.length];
    const qty = rnd(1, 5);
    const unit = Number(bp.basePrice);
    const sub = unit * qty;
    const tax = sub * 0.21;
    const commVal = bp.commissionValue ? Number(bp.commissionValue) : Number(brand.defaultCommissionValue);
    const commType = bp.commissionType ?? brand.defaultCommissionType;
    const commAmount = commType === 'FIXED_AMOUNT' ? commVal * qty : (sub * commVal) / 100;
    const saleDate = d(rnd(1, 30));
    const cancelled = status === 'CANCELLED';
    const signed = status === 'SIGNED' || status === 'ACTIVE';
    const cStatus = cancelled ? 'CANCELLED' : commStatuses[i % commStatuses.length];
    const sale = await prisma.sale.create({
      data: {
        number: `V-2026-${String(i + 1).padStart(5, '0')}`, status,
        saleDate, signedAt: signed ? saleDate : undefined,
        activatedAt: status === 'ACTIVE' ? d(rnd(0, 5)) : undefined,
        cancelledAt: cancelled ? d(rnd(0, 10)) : undefined, cancelReason: cancelled ? 'Cliente desistió' : undefined,
        currency: 'EUR', subtotal: sub, taxAmount: tax, total: sub + tax, totalCommission: cancelled ? 0 : commAmount,
        signatureMethod: signed ? 'canvas' : undefined,
        organizationId: org.id, brandId: brand.id, endCustomerId: ec.id, representativeId: rep.id, createdAt: saleDate,
        lines: { create: { description: bp.name, quantity: qty, unitPrice: unit, taxRate: 21, total: sub + tax, commissionType: commType, commissionValue: commVal, commissionAmount: commAmount, productId: bp.id, order: 0 } },
        commissions: cancelled ? undefined : { create: { amount: commAmount, currency: 'EUR', status: cStatus, paidAt: cStatus === 'PAID' ? d(rnd(0, 10)) : undefined, paidMethod: cStatus === 'PAID' ? 'Transferencia' : undefined, organizationId: org.id, representativeId: rep.id } },
      },
    });
    if (i < 4) {
      await prisma.attachment.create({
        data: { filename: `contrato-${sale.number}.pdf`, mimeType: 'application/pdf', size: rnd(80000, 400000), url: `/uploads/contrato-${sale.number}.pdf`, type: 'CONTRACT', uploaderId: rep.id, saleId: sale.id, organizationId: org.id },
      });
    }
  }
  console.log('✓ 15 clientes finales, 20 ventas con comisiones y adjuntos');

  // ---------------------------------------------------------
  // MARKETING: listas, campañas, secuencias, plantillas, web forms
  // ---------------------------------------------------------
  const listA = await prisma.emailList.create({ data: { name: 'Clientes activos', description: 'Cuentas con contrato vigente', organizationId: org.id } });
  const listB = await prisma.emailList.create({ data: { name: 'Leads cualificados', description: 'Interesados en EDR/SOC', organizationId: org.id } });
  const listC = await prisma.emailList.create({ data: { name: 'Newsletter', description: 'Suscriptores del boletín mensual', organizationId: org.id } });
  for (const c of contacts.slice(0, 18)) await prisma.emailListMember.create({ data: { listId: pick([listA, listB, listC]).id, contactId: c.id } });

  const campDefs = [
    { name: 'Lanzamiento SOCWatch', status: 'SENT' as const, sent: 22, rec: 850 },
    { name: 'Webinar RGPD 2026', status: 'SENT' as const, sent: 15, rec: 620 },
    { name: 'Oferta EDR fin de trimestre', status: 'SCHEDULED' as const, sent: null, rec: 0 },
    { name: 'Newsletter julio', status: 'DRAFT' as const, sent: null, rec: 0 },
    { name: 'Re-engagement inactivos (A/B)', status: 'SENT' as const, sent: 10, rec: 400, ab: true },
  ];
  for (const cm of campDefs) {
    const opened = cm.rec ? Math.round(cm.rec * 0.42) : 0;
    const clicked = cm.rec ? Math.round(cm.rec * 0.11) : 0;
    const camp = await prisma.campaign.create({
      data: {
        name: cm.name, subject: cm.name, fromName: 'Nómada Agency', fromEmail: 'marketing@nomada.agency',
        htmlContent: `<h1>${cm.name}</h1><p>Contenido de la campaña.</p>`, status: cm.status,
        sentAt: cm.sent ? d(cm.sent) : undefined, scheduledAt: cm.status === 'SCHEDULED' ? d(-3) : undefined,
        recipientsCount: cm.rec, openedCount: opened, clickedCount: clicked,
        abEnabled: !!cm.ab, abSubjectB: cm.ab ? cm.name + ' (variante B)' : undefined,
        recipientsA: cm.ab ? cm.rec / 2 : 0, recipientsB: cm.ab ? cm.rec / 2 : 0,
        openedA: cm.ab ? Math.round(opened * 0.45) : 0, openedB: cm.ab ? Math.round(opened * 0.55) : 0,
        clickedA: cm.ab ? Math.round(clicked * 0.4) : 0, clickedB: cm.ab ? Math.round(clicked * 0.6) : 0,
        winnerVariant: cm.ab ? 'B' : undefined,
        organizationId: org.id, createdById: manager.id, createdAt: cm.sent ? d(cm.sent + 2) : d(5),
        lists: { create: { listId: pick([listA, listB, listC]).id } },
      },
    });
    if (cm.status === 'SENT') {
      for (let k = 0; k < Math.min(30, cm.rec); k++) {
        const o = Math.random() < 0.42;
        await prisma.emailTracking.create({
          data: { email: `dest${k}@cliente.es`, variant: cm.ab ? (k % 2 ? 'B' : 'A') : undefined, sentAt: d(cm.sent!), openedAt: o ? d(cm.sent! - 0) : undefined, clickedAt: o && Math.random() < 0.3 ? d(cm.sent! - 0) : undefined, campaignId: camp.id },
        });
      }
    }
  }

  const seq = await prisma.emailSequence.create({
    data: {
      name: 'Onboarding nuevo cliente', description: 'Secuencia de bienvenida en 3 pasos', organizationId: org.id, createdById: manager.id,
      steps: { create: [
        { order: 0, delayDays: 0, subject: 'Bienvenido a Nómada Agency', bodyHtml: '<p>Gracias por confiar en nosotros.</p>' },
        { order: 1, delayDays: 3, subject: 'Configura tu primer servicio', bodyHtml: '<p>Te ayudamos a empezar.</p>' },
        { order: 2, delayDays: 7, subject: '¿Cómo va todo?', bodyHtml: '<p>¿Necesitas ayuda?</p>' },
      ] },
    },
    include: { steps: true },
  });
  for (const c of contacts.slice(0, 5)) {
    await prisma.emailSequenceEnrollment.create({ data: { sequenceId: seq.id, contactId: c.id, currentStep: rnd(0, 2), status: pick(['ACTIVE', 'ACTIVE', 'COMPLETED']), nextRunAt: d(-rnd(1, 5)), organizationId: org.id } });
  }

  await prisma.emailTemplate.createMany({
    data: [
      { name: 'Propuesta comercial', subject: 'Tu propuesta de {{marca}}', htmlContent: '<p>Adjuntamos la propuesta.</p>', category: 'Ventas', organizationId: org.id, createdById: owner.id },
      { name: 'Seguimiento post-demo', subject: '¿Qué te pareció la demo?', htmlContent: '<p>Quedamos a tu disposición.</p>', category: 'Ventas', organizationId: org.id, createdById: rep1.id },
      { name: 'Recordatorio de renovación', subject: 'Tu contrato vence pronto', htmlContent: '<p>Renueva con condiciones preferentes.</p>', category: 'Retención', organizationId: org.id, createdById: manager.id },
      { name: 'Bienvenida', subject: 'Bienvenido a bordo', htmlContent: '<p>¡Gracias!</p>', category: 'Onboarding', organizationId: org.id, createdById: owner.id },
      { name: 'Aviso de incidencia', subject: 'Actualización de tu ticket', htmlContent: '<p>Novedades sobre tu caso.</p>', category: 'Soporte', organizationId: org.id, createdById: rep2.id },
    ],
  });

  await prisma.webForm.createMany({
    data: [
      { slug: 'contacto-nomada', name: 'Formulario de contacto', title: 'Solicita información', description: 'Cuéntanos tu necesidad de ciberseguridad', fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'company', label: 'Empresa', type: 'text', required: false }, { key: 'message', label: 'Mensaje', type: 'textarea', required: false }], notifyEmails: 'demo@brandhub.com', submissions: 34, ownerId: manager.id, organizationId: org.id },
      { slug: 'demo-edr', name: 'Solicitud de demo EDR', title: 'Prueba CyberShield EDR', fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'email', label: 'Email corporativo', type: 'email', required: true }, { key: 'endpoints', label: 'Nº de endpoints', type: 'select', required: true, options: ['<50', '50-200', '200+'] }], submissions: 12, ownerId: rep1.id, organizationId: org.id },
    ],
  });
  console.log('✓ 3 listas, 5 campañas, secuencia, 5 plantillas, 2 web forms');

  // ---------------------------------------------------------
  // SOPORTE: SLA, tickets, base de conocimiento
  // ---------------------------------------------------------
  await prisma.slaPolicy.createMany({
    data: [
      { priority: 'URGENT', firstResponseMins: 30, resolutionMins: 240, organizationId: org.id },
      { priority: 'HIGH', firstResponseMins: 120, resolutionMins: 480, organizationId: org.id },
      { priority: 'MEDIUM', firstResponseMins: 480, resolutionMins: 1440, organizationId: org.id },
      { priority: 'LOW', firstResponseMins: 1440, resolutionMins: 4320, organizationId: org.id },
    ],
  });
  const ticketStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] as const;
  const ticketSubjects = ['Alerta EDR no gestionada', 'Solicitud de informe SOC', 'Fallo en backup nocturno', 'Consulta sobre factura', 'Alta de nuevos endpoints', 'Falso positivo en antivirus', 'Programar pentest', 'Duda sobre RGPD', 'Restauración de copia', 'Renovación de licencias', 'Acceso al portal', 'Incidencia de phishing', 'Cambio de plan', 'Reporte mensual', 'Actualización de agente'];
  for (let i = 0; i < 15; i++) {
    const status = ticketStatuses[i % ticketStatuses.length];
    const created = d(rnd(1, 28), rnd(9, 17));
    const resolved = status === 'RESOLVED' || status === 'CLOSED';
    await prisma.ticket.create({
      data: {
        number: i + 1, subject: ticketSubjects[i], description: 'Descripción detallada de la incidencia reportada por el cliente.',
        status, priority: pick([TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT]), category: pick(['Técnico', 'Facturación', 'Comercial', 'RGPD']),
        firstResponseAt: d(rnd(1, 27), rnd(10, 18)), resolvedAt: resolved ? d(rnd(0, 20)) : undefined,
        closedAt: status === 'CLOSED' ? d(rnd(0, 15)) : undefined,
        contactId: pick(contacts).id, agentId: pick([rep1, rep2, manager]).id, organizationId: org.id, createdAt: created,
        comments: { create: [
          { authorName: pick(['Carlos Ruiz', 'Sara Gómez', 'Lucía Fernández']), content: 'Hola, hemos recibido tu incidencia y la estamos revisando.', internal: false, createdAt: d(rnd(0, 20)) },
          { authorName: 'Equipo técnico', content: 'Reproducido en entorno de pruebas. Escalado a nivel 2.', internal: true, createdAt: d(rnd(0, 18)) },
        ] },
      },
    });
  }
  const articleDefs = [
    { title: 'Cómo desplegar el agente EDR', cat: 'Guías', views: 214 },
    { title: 'Interpretar las alertas del SOC', cat: 'SOC', views: 178 },
    { title: 'Política de retención de backups', cat: 'Backup', views: 96 },
    { title: 'Preparar tu empresa para un pentest', cat: 'Auditoría', views: 143 },
    { title: 'Buenas prácticas anti-phishing', cat: 'Formación', views: 305 },
    { title: 'Checklist de cumplimiento RGPD', cat: 'Cumplimiento', views: 260 },
  ];
  for (const a of articleDefs) {
    await prisma.article.create({
      data: { title: a.title, slug: a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), excerpt: a.title + '.', content: `<h2>${a.title}</h2><p>Contenido del artículo de la base de conocimiento.</p>`, category: a.cat, published: true, views: a.views, organizationId: org.id, authorId: pick([owner, manager]).id, createdAt: d(rnd(10, 40)) },
    });
  }
  console.log('✓ SLA (4), 15 tickets, 6 artículos');

  // ---------------------------------------------------------
  // METAS, INFORMES, VISTAS, RESERVAS, WORKFLOWS, WEBHOOKS, API, TIEMPO
  // ---------------------------------------------------------
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(NOW - 30 * DAY).toISOString().slice(0, 7);
  for (const u of reps) {
    for (const period of [lastMonth, thisMonth]) {
      await prisma.goal.create({ data: { userId: u.id, organizationId: org.id, period, metric: 'sales_amount', target: pick([20000, 30000, 40000]), current: pick([12000, 18000, 25000, 33000]) } });
      await prisma.goal.create({ data: { userId: u.id, organizationId: org.id, period, metric: 'deals_won', target: 5, current: rnd(1, 6) } });
    }
  }
  await prisma.savedReport.createMany({
    data: [
      { name: 'Ventas por marca (90 días)', config: { entity: 'sales', metric: 'sum', sumField: 'total', groupBy: 'brand', period: '90d', chart: 'bar' }, organizationId: org.id, createdById: owner.id },
      { name: 'Comisiones por representante', config: { entity: 'commissions', metric: 'sum', sumField: 'amount', groupBy: 'rep', period: '30d', chart: 'pie' }, organizationId: org.id, createdById: manager.id },
      { name: 'Leads por origen', config: { entity: 'leads', metric: 'count', groupBy: 'source', period: 'all', chart: 'bar' }, organizationId: org.id, createdById: manager.id },
    ],
  });
  await prisma.savedView.createMany({
    data: [
      { name: 'Ventas activas', entity: 'SALES', query: 'status=ACTIVE', shared: true, organizationId: org.id, userId: owner.id },
      { name: 'Mis leads calientes', entity: 'LEADS', query: 'status=QUALIFIED&minScore=70', organizationId: org.id, userId: rep1.id },
      { name: 'Comisiones pendientes', entity: 'COMMISSIONS', query: 'status=PENDING', shared: true, organizationId: org.id, userId: manager.id },
      { name: 'Tareas de hoy', entity: 'TASKS', query: 'due=today', organizationId: org.id, userId: rep2.id },
    ],
  });

  const bookingPage = await prisma.bookingPage.create({
    data: {
      slug: 'demo-nomada', title: 'Reserva una demo de 30 min', description: 'Elige el hueco que mejor te venga', durationMinutes: 30, bufferMinutes: 10,
      availability: { '1': ['09:00', '17:00'], '2': ['09:00', '17:00'], '3': ['09:00', '17:00'], '4': ['09:00', '17:00'], '5': ['09:00', '14:00'] },
      userId: rep1.id, organizationId: org.id,
    },
  });
  for (let i = 0; i < 6; i++) {
    const start = d(-rnd(1, 10), rnd(9, 16));
    await prisma.booking.create({ data: { bookingPageId: bookingPage.id, name: pick(firstNames) + ' ' + pick(lastNames), email: `reserva${i}@empresa.es`, phone: '+34 6' + rnd(10, 99) + rnd(1000000, 9999999), notes: 'Interesado en demo de EDR', startsAt: start, endsAt: new Date(start.getTime() + 30 * 60000), status: i === 5 ? 'CANCELLED' : 'CONFIRMED', organizationId: org.id } });
  }

  const wf = await prisma.workflow.create({
    data: {
      name: 'Aviso a managers al firmar venta', trigger: 'SALE_SIGNED', description: 'Notifica a gerencia cuando se firma una venta',
      conditions: [{ field: 'total', op: 'gt', value: 5000 }], actions: [{ type: 'notify_managers', params: {} }, { type: 'create_task', params: { title: 'Revisar venta firmada' } }],
      runsCount: 8, lastRunAt: d(2), organizationId: org.id, createdById: owner.id,
    },
  });
  const wf2 = await prisma.workflow.create({
    data: { name: 'Tarea de bienvenida a nuevo cliente', trigger: 'CUSTOMER_CREATED', actions: [{ type: 'create_task', params: { title: 'Llamar de bienvenida' } }], runsCount: 15, lastRunAt: d(1), organizationId: org.id, createdById: manager.id },
  });
  for (let i = 0; i < 6; i++) {
    await prisma.workflowRun.create({ data: { workflowId: pick([wf, wf2]).id, trigger: pick(['SALE_SIGNED', 'CUSTOMER_CREATED']), payload: { saleId: 'demo', total: rnd(5000, 50000) }, status: pick(['SUCCESS', 'SUCCESS', 'SKIPPED']), detail: 'Ejecución automática', organizationId: org.id, createdAt: d(rnd(1, 15)) } });
  }

  const hook = await prisma.webhookEndpoint.create({
    data: { name: 'ERP contabilidad', url: 'https://erp.nomada.internal/webhooks/crm', secret: 'whsec_' + rnd(100000, 999999), events: [WebhookEvent.SALE_SIGNED, WebhookEvent.COMMISSION_PAID], description: 'Sincroniza ventas firmadas con el ERP', organizationId: org.id },
  });
  await prisma.webhookEndpoint.create({
    data: { name: 'Slack #ventas', url: 'https://hooks.slack.com/services/DEMO/XXX', events: [WebhookEvent.SALE_CREATED, WebhookEvent.SALE_SIGNED], organizationId: org.id },
  });
  for (let i = 0; i < 8; i++) {
    const ok = i % 4 !== 0;
    await prisma.webhookDelivery.create({ data: { event: pick([WebhookEvent.SALE_SIGNED, WebhookEvent.COMMISSION_PAID, WebhookEvent.SALE_CREATED]), payload: { id: 'evt_' + rnd(1000, 9999) }, status: ok ? 'SUCCESS' : 'FAILED', httpStatus: ok ? 200 : 500, attempts: ok ? 1 : 3, lastError: ok ? undefined : 'Timeout', deliveredAt: ok ? d(rnd(1, 10)) : undefined, endpointId: hook.id, organizationId: org.id, createdAt: d(rnd(1, 12)) } });
  }

  await prisma.apiToken.createMany({
    data: [
      { name: 'Integración web pública', tokenHash: 'sha256_' + 'a'.repeat(40), prefix: 'nomd_pub', scopes: [ApiTokenScope.READ_SALES, ApiTokenScope.READ_CUSTOMERS], lastUsedAt: d(1), organizationId: org.id, createdById: owner.id },
      { name: 'Backoffice ERP', tokenHash: 'sha256_' + 'b'.repeat(40), prefix: 'nomd_erp', scopes: [ApiTokenScope.ADMIN_ALL], lastUsedAt: d(3), organizationId: org.id, createdById: owner.id },
    ],
  });

  for (let i = 0; i < 15; i++) {
    const start = d(rnd(1, 25), rnd(9, 16));
    const secs = rnd(900, 7200);
    await prisma.timeEntry.create({ data: { description: pick(['Preparación de propuesta', 'Reunión con cliente', 'Configuración de servicio', 'Soporte técnico']), startedAt: start, endedAt: new Date(start.getTime() + secs * 1000), seconds: secs, billable: i % 2 === 0, userId: pick(team.slice(0, 5)).id, organizationId: org.id, taskId: undefined } });
  }
  console.log('✓ metas, 3 informes, 4 vistas, reservas, workflows, webhooks, API tokens, time tracking');

  // ---------------------------------------------------------
  // CHAT INTERNO
  // ---------------------------------------------------------
  const conv1 = await prisma.conversation.create({ data: { title: null, organizationId: org.id, participants: { create: [{ userId: owner.id }, { userId: rep1.id }] } } });
  const conv2 = await prisma.conversation.create({ data: { title: 'Equipo comercial', organizationId: org.id, participants: { create: [{ userId: owner.id }, { userId: manager.id }, { userId: rep1.id }, { userId: rep2.id }, { userId: rep3.id }] } } });
  const chat = [
    { conv: conv1, author: owner, text: 'Carlos, ¿cómo va la propuesta de SOCWatch para Retail Ibérica?' },
    { conv: conv1, author: rep1, text: 'La envío hoy mismo, cerrando números de comisión.' },
    { conv: conv2, author: manager, text: 'Equipo, recordad cerrar las ventas firmadas antes del día 30 para las comisiones.' },
    { conv: conv2, author: rep2, text: '¡Hecho! Yo ya tengo 3 firmadas este mes 🎉' },
    { conv: conv2, author: rep3, text: 'Me falta una de PenTestPro, la firmo mañana.' },
  ];
  for (const m of chat) await prisma.message.create({ data: { conversationId: m.conv.id, authorId: m.author.id, content: m.text, createdAt: d(rnd(0, 5), rnd(9, 18)) } });

  // ---------------------------------------------------------
  // CAMPOS PERSONALIZADOS + VALORES
  // ---------------------------------------------------------
  const cfContactSector = await prisma.customField.create({ data: { entity: 'CONTACT', key: 'nivel_decision', label: 'Nivel de decisión', type: 'SELECT', options: ['Decisor', 'Prescriptor', 'Usuario'], order: 0, organizationId: org.id } });
  const cfDealCompetitor = await prisma.customField.create({ data: { entity: 'DEAL', key: 'competidor', label: 'Competidor', type: 'STRING', order: 0, organizationId: org.id } });
  const cfSaleRenewal = await prisma.customField.create({ data: { entity: 'SALE', key: 'auto_renovacion', label: 'Auto-renovación', type: 'BOOLEAN', order: 0, organizationId: org.id } });
  await prisma.customField.create({ data: { entity: 'LEAD', key: 'presupuesto_estimado', label: 'Presupuesto estimado', type: 'NUMBER', order: 0, organizationId: org.id } });
  await prisma.customField.create({ data: { entity: 'COMPANY', key: 'num_empleados', label: 'Nº empleados', type: 'NUMBER', order: 0, organizationId: org.id } });
  for (const c of contacts.slice(0, 12)) {
    await prisma.customFieldValue.create({ data: { entity: 'CONTACT', entityId: c.id, fieldId: cfContactSector.id, value: pick(['Decisor', 'Prescriptor', 'Usuario']), organizationId: org.id } });
  }
  for (const dl of deals.slice(0, 8)) {
    await prisma.customFieldValue.create({ data: { entity: 'DEAL', entityId: dl.id, fieldId: cfDealCompetitor.id, value: pick(['Palo Alto', 'CrowdStrike', 'Sophos', 'Ninguno']), organizationId: org.id } });
  }
  console.log('✓ chat interno + campos personalizados con valores');

  // ---------------------------------------------------------
  // NOTIFICACIONES + AUDITORÍA
  // ---------------------------------------------------------
  const notifTypes = ['SALE_SIGNED', 'COMMISSION_PAID', 'COMMISSION_APPROVED', 'TASK_ASSIGNED', 'TASK_DUE', 'MENTION', 'SYSTEM'] as const;
  for (let i = 0; i < 22; i++) {
    const t = notifTypes[i % notifTypes.length];
    await prisma.notification.create({
      data: {
        type: t, title: {
          SALE_SIGNED: 'Venta firmada', COMMISSION_PAID: 'Comisión pagada', COMMISSION_APPROVED: 'Comisión aprobada',
          TASK_ASSIGNED: 'Nueva tarea asignada', TASK_DUE: 'Tarea vence hoy', MENTION: 'Te han mencionado', SYSTEM: 'Aviso del sistema',
        }[t],
        message: 'Detalle de la notificación.', read: i > 6, readAt: i > 6 ? d(rnd(0, 5)) : undefined,
        userId: i % 2 === 0 ? owner.id : pick(reps).id, organizationId: org.id, createdAt: d(rnd(0, 15), rnd(8, 20)),
      },
    });
  }
  const auditActions = ['USER_LOGIN', 'SALE_CREATED', 'SALE_SIGNED', 'COMMISSION_APPROVED', 'COMMISSION_PAID', 'BRAND_CREATED', 'TEMPLATE_CREATED', 'CUSTOMERS_IMPORTED'] as const;
  for (let i = 0; i < 30; i++) {
    const actor = pick(team);
    await prisma.auditLog.create({
      data: { action: auditActions[i % auditActions.length], actorId: actor.id, actorName: actor.name, actorRole: actor.role, entity: pick(['Sale', 'Commission', 'Brand', 'ContractTemplate']), entityId: 'demo_' + rnd(1000, 9999), ip: `88.${rnd(0, 255)}.${rnd(0, 255)}.${rnd(1, 254)}`, organizationId: org.id, createdAt: d(rnd(0, 30), rnd(8, 20)) },
    });
  }
  console.log('✓ 22 notificaciones + 30 registros de auditoría');

  // ---------------------------------------------------------
  // RESUMEN
  // ---------------------------------------------------------
  const totals = {
    Organizaciones: await prisma.organization.count(),
    Usuarios: await prisma.user.count(),
    Empresas: await prisma.company.count(),
    Contactos: await prisma.contact.count(),
    Leads: await prisma.lead.count(),
    Oportunidades: await prisma.deal.count(),
    Actividades: await prisma.activity.count(),
    Tareas: await prisma.task.count(),
    Ventas: await prisma.sale.count(),
    Comisiones: await prisma.commission.count(),
    Facturas: await prisma.invoice.count(),
    Tickets: await prisma.ticket.count(),
    Notificaciones: await prisma.notification.count(),
  };
  console.log('\n✅ Seed de demo completado:\n', totals);
  console.log('\n📧 Accesos:');
  console.log('   admin@brandhub.local / admin1234  → organización VACÍA');
  console.log('   demo@brandhub.com    / demo1234   → organización LLENA (Nómada Agency)\n');
}

main()
  .catch((e) => { console.error('❌ Error en seed-demo:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
