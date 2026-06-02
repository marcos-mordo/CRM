import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos demo...');

  // Limpiar
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.invoiceLine.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.quoteLine.deleteMany(),
    prisma.quote.deleteMany(),
    prisma.emailTracking.deleteMany(),
    prisma.campaignList.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.emailListMember.deleteMany(),
    prisma.emailList.deleteMany(),
    prisma.ticketComment.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.article.deleteMany(),
    prisma.product.deleteMany(),
    prisma.task.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.noteList.deleteMany(),
    prisma.note.deleteMany(),
    prisma.contactTag.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.deal.deleteMany(),
    prisma.stage.deleteMany(),
    prisma.pipeline.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.company.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  // Organización demo
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Solutions',
      slug: 'acme-solutions',
      industry: 'Software',
      website: 'https://acme.com',
      phone: '+52 55 1234 5678',
      address: 'Av. Reforma 123, CDMX, México',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      locale: 'es',
    },
  });
  console.log(`✓ Organización creada: ${org.name}`);

  // Usuarios
  const hashedPassword = await bcrypt.hash('admin1234', 10);
  const owner = await prisma.user.create({
    data: {
      name: 'Carlos Rodríguez',
      email: 'admin@acme.com',
      password: hashedPassword,
      role: 'OWNER',
      organizationId: org.id,
    },
  });
  const manager = await prisma.user.create({
    data: {
      name: 'María González',
      email: 'maria@acme.com',
      password: hashedPassword,
      role: 'MANAGER',
      organizationId: org.id,
    },
  });
  const agent = await prisma.user.create({
    data: {
      name: 'Luis Hernández',
      email: 'luis@acme.com',
      password: hashedPassword,
      role: 'AGENT',
      organizationId: org.id,
    },
  });
  console.log('✓ Usuarios creados');

  // Pipeline
  const pipeline = await prisma.pipeline.create({
    data: {
      name: 'Pipeline principal',
      isDefault: true,
      organizationId: org.id,
      stages: {
        create: [
          { name: 'Nuevo', order: 0, probability: 10, color: '#94a3b8' },
          { name: 'Contactado', order: 1, probability: 25, color: '#3b82f6' },
          { name: 'Propuesta', order: 2, probability: 50, color: '#8b5cf6' },
          { name: 'Negociación', order: 3, probability: 75, color: '#f59e0b' },
          { name: 'Cerrado ganado', order: 4, probability: 100, color: '#10b981' },
        ],
      },
    },
    include: { stages: { orderBy: { order: 'asc' } } },
  });
  console.log('✓ Pipeline creado');

  // Empresas
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: 'Tecnología Innovadora SA',
        industry: 'Tecnología',
        website: 'tecnoinnova.com',
        phone: '+52 33 5555 1234',
        email: 'contacto@tecnoinnova.com',
        city: 'Guadalajara',
        country: 'México',
        size: '50-200',
        annualRevenue: 5000000,
        organizationId: org.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Distribuidora del Norte',
        industry: 'Retail',
        website: 'distnorte.com',
        phone: '+52 81 2222 8888',
        city: 'Monterrey',
        country: 'México',
        size: '11-50',
        annualRevenue: 2500000,
        organizationId: org.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Servicios Globales Ltd.',
        industry: 'Consultoría',
        website: 'serviciosglobales.com',
        phone: '+34 91 444 5555',
        city: 'Madrid',
        country: 'España',
        size: '200+',
        annualRevenue: 15000000,
        organizationId: org.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Inversiones Patagonia',
        industry: 'Finanzas',
        website: 'patagonia-inv.com',
        city: 'Buenos Aires',
        country: 'Argentina',
        size: '11-50',
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`✓ ${companies.length} empresas creadas`);

  // Contactos
  const contactsData = [
    { firstName: 'Ana', lastName: 'Martínez', email: 'ana.martinez@tecnoinnova.com', phone: '+52 33 1111 2222', jobTitle: 'CTO', companyId: companies[0].id },
    { firstName: 'Roberto', lastName: 'Silva', email: 'rsilva@tecnoinnova.com', phone: '+52 33 1111 3333', jobTitle: 'Director de Compras', companyId: companies[0].id },
    { firstName: 'Patricia', lastName: 'López', email: 'plopez@distnorte.com', phone: '+52 81 9999 1111', jobTitle: 'Gerente General', companyId: companies[1].id },
    { firstName: 'Fernando', lastName: 'Torres', email: 'ftorres@serviciosglobales.com', phone: '+34 600 111 222', jobTitle: 'CEO', companyId: companies[2].id },
    { firstName: 'Sofía', lastName: 'Ramírez', email: 'sofia@serviciosglobales.com', phone: '+34 600 333 444', jobTitle: 'Directora Comercial', companyId: companies[2].id },
    { firstName: 'Javier', lastName: 'Acosta', email: 'jacosta@patagonia-inv.com', phone: '+54 11 4444 5555', jobTitle: 'VP Operaciones', companyId: companies[3].id },
    { firstName: 'Laura', lastName: 'Fernández', email: 'lfernandez@gmail.com', phone: '+52 55 8888 9999', jobTitle: 'Consultor independiente' },
    { firstName: 'Diego', lastName: 'Morales', email: 'diego.morales@startup.io', jobTitle: 'Fundador' },
  ];

  const contacts = await Promise.all(
    contactsData.map((c, i) =>
      prisma.contact.create({
        data: {
          ...c,
          source: ['Web', 'Referido', 'Evento', 'LinkedIn'][i % 4],
          ownerId: i % 2 === 0 ? manager.id : agent.id,
          organizationId: org.id,
        },
      })
    )
  );
  console.log(`✓ ${contacts.length} contactos creados`);

  // Leads
  await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'Andrés',
        lastName: 'Vega',
        email: 'avega@nuevaempresa.mx',
        phone: '+52 55 1234 5555',
        company: 'Nueva Empresa SC',
        jobTitle: 'Director',
        source: 'Sitio web',
        status: 'QUALIFIED',
        score: 75,
        estimatedValue: 50000,
        organizationId: org.id,
        ownerId: agent.id,
      },
    }),
    prisma.lead.create({
      data: {
        firstName: 'Mariana',
        lastName: 'Castillo',
        email: 'mariana@negocio.com',
        company: 'Negocio Familiar',
        source: 'Referido',
        status: 'CONTACTED',
        score: 50,
        estimatedValue: 25000,
        organizationId: org.id,
        ownerId: manager.id,
      },
    }),
    prisma.lead.create({
      data: {
        firstName: 'Pedro',
        lastName: 'Salinas',
        email: 'pedro@empresax.com',
        company: 'Empresa X',
        source: 'Anuncio Google',
        status: 'NEW',
        score: 20,
        organizationId: org.id,
        ownerId: agent.id,
      },
    }),
    prisma.lead.create({
      data: {
        firstName: 'Carla',
        lastName: 'Núñez',
        email: 'cnunez@email.com',
        company: 'Consultora ABC',
        source: 'LinkedIn',
        status: 'QUALIFIED',
        score: 85,
        estimatedValue: 80000,
        organizationId: org.id,
        ownerId: manager.id,
      },
    }),
  ]);
  console.log('✓ Leads creados');

  // Deals (oportunidades)
  const dealsData = [
    { title: 'Implementación CRM - Tecno Innovadora', stage: 4, amount: 250000, probability: 100, contactId: contacts[0].id, companyId: companies[0].id },
    { title: 'Renovación licencias - Distribuidora Norte', stage: 3, amount: 80000, probability: 75, contactId: contacts[2].id, companyId: companies[1].id },
    { title: 'Plataforma analítica - Servicios Globales', stage: 2, amount: 450000, probability: 50, contactId: contacts[3].id, companyId: companies[2].id },
    { title: 'Consultoría inicial - Patagonia', stage: 1, amount: 35000, probability: 25, contactId: contacts[5].id, companyId: companies[3].id },
    { title: 'Setup ecommerce - Tecno', stage: 2, amount: 120000, probability: 50, contactId: contacts[1].id, companyId: companies[0].id },
    { title: 'Migración legacy - Servicios Globales', stage: 3, amount: 600000, probability: 75, contactId: contacts[4].id, companyId: companies[2].id },
    { title: 'Pilot data warehouse', stage: 0, amount: 45000, probability: 10, contactId: contacts[6].id },
    { title: 'Capacitación equipo', stage: 1, amount: 25000, probability: 25, contactId: contacts[7].id },
  ];

  for (const d of dealsData) {
    await prisma.deal.create({
      data: {
        title: d.title,
        amount: d.amount,
        currency: 'MXN',
        probability: d.probability,
        status: 'OPEN',
        pipelineId: pipeline.id,
        stageId: pipeline.stages[d.stage].id,
        contactId: d.contactId,
        companyId: d.companyId,
        ownerId: [owner.id, manager.id, agent.id][Math.floor(Math.random() * 3)],
        expectedCloseDate: new Date(Date.now() + (15 + Math.random() * 60) * 24 * 60 * 60 * 1000),
        organizationId: org.id,
      },
    });
  }
  console.log(`✓ ${dealsData.length} oportunidades creadas`);

  // Productos
  const products = await Promise.all([
    { sku: 'CRM-BASIC', name: 'Licencia CRM Básica', category: 'Software', price: 499, cost: 100, taxRate: 16, unit: 'usuario/mes' },
    { sku: 'CRM-PRO', name: 'Licencia CRM Pro', category: 'Software', price: 999, cost: 200, taxRate: 16, unit: 'usuario/mes' },
    { sku: 'CRM-ENT', name: 'Licencia CRM Enterprise', category: 'Software', price: 1999, cost: 400, taxRate: 16, unit: 'usuario/mes' },
    { sku: 'IMP-STD', name: 'Implementación estándar', category: 'Servicios', price: 25000, taxRate: 16, unit: 'proyecto' },
    { sku: 'IMP-PRE', name: 'Implementación Premium', category: 'Servicios', price: 75000, taxRate: 16, unit: 'proyecto' },
    { sku: 'CAP-8H', name: 'Capacitación grupal (8h)', category: 'Servicios', price: 12000, taxRate: 16, unit: 'sesión' },
    { sku: 'SOP-MES', name: 'Soporte premium mensual', category: 'Soporte', price: 5000, taxRate: 16, unit: 'mes' },
  ].map((p) => prisma.product.create({ data: { ...p, organizationId: org.id } })));
  console.log(`✓ ${products.length} productos creados`);

  // Cotización
  await prisma.quote.create({
    data: {
      number: 'COT-00001',
      status: 'SENT',
      customerName: 'Tecnología Innovadora SA',
      customerEmail: 'compras@tecnoinnova.com',
      customerAddress: 'Av. Vallarta 1500, Guadalajara, Jal.',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 75000,
      taxAmount: 12000,
      total: 87000,
      currency: 'MXN',
      organizationId: org.id,
      lines: {
        create: [
          { description: 'Licencia CRM Pro (10 usuarios)', quantity: 10, unitPrice: 999, taxRate: 16, discount: 0, total: 11588.4, order: 0 },
          { description: 'Implementación estándar', quantity: 1, unitPrice: 25000, taxRate: 16, discount: 0, total: 29000, order: 1 },
          { description: 'Capacitación equipo', quantity: 2, unitPrice: 12000, taxRate: 16, discount: 0, total: 27840, order: 2 },
        ],
      },
    },
  });
  console.log('✓ Cotización creada');

  // Factura
  await prisma.invoice.create({
    data: {
      number: 'FAC-00001',
      status: 'PAID',
      issueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      paidDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      customerName: 'Distribuidora del Norte',
      customerEmail: 'pagos@distnorte.com',
      subtotal: 60000,
      taxAmount: 9600,
      total: 69600,
      amountPaid: 69600,
      currency: 'MXN',
      organizationId: org.id,
      lines: {
        create: [
          { description: 'Licencia CRM Pro (5 usuarios x 12 meses)', quantity: 60, unitPrice: 999, taxRate: 16, discount: 0, total: 69530.4, order: 0 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      number: 'FAC-00002',
      status: 'SENT',
      issueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      customerName: 'Servicios Globales Ltd.',
      customerEmail: 'finanzas@serviciosglobales.com',
      subtotal: 100000,
      taxAmount: 16000,
      total: 116000,
      currency: 'MXN',
      organizationId: org.id,
      lines: {
        create: [
          { description: 'Implementación Premium', quantity: 1, unitPrice: 75000, taxRate: 16, discount: 0, total: 87000, order: 0 },
          { description: 'Capacitación', quantity: 2, unitPrice: 12000, taxRate: 16, discount: 0, total: 27840, order: 1 },
        ],
      },
    },
  });
  console.log('✓ Facturas creadas');

  // Tareas
  await Promise.all([
    prisma.task.create({
      data: {
        title: 'Llamar a Ana Martínez para seguimiento',
        priority: 'HIGH',
        status: 'PENDING',
        dueDate: new Date(),
        assigneeId: agent.id,
        creatorId: owner.id,
        contactId: contacts[0].id,
        organizationId: org.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Preparar propuesta para Servicios Globales',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        assigneeId: manager.id,
        creatorId: owner.id,
        organizationId: org.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Revisión semanal de pipeline',
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        assigneeId: owner.id,
        creatorId: owner.id,
        organizationId: org.id,
      },
    }),
  ]);
  console.log('✓ Tareas creadas');

  // Lista de email
  const list = await prisma.emailList.create({
    data: {
      name: 'Clientes activos',
      description: 'Todos los contactos de empresas con cuenta activa',
      organizationId: org.id,
    },
  });

  await Promise.all(
    contacts.slice(0, 6).map((c) =>
      prisma.emailListMember.create({ data: { listId: list.id, contactId: c.id } })
    )
  );
  console.log('✓ Lista de email creada con miembros');

  // Tickets
  await prisma.ticket.create({
    data: {
      number: 1,
      subject: 'Error al exportar reporte mensual',
      description: 'Al intentar exportar el reporte de ventas a Excel, la aplicación se cierra inesperadamente.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      category: 'Técnico',
      contactId: contacts[0].id,
      agentId: agent.id,
      organizationId: org.id,
      comments: {
        create: [
          {
            authorName: 'Luis Hernández',
            content: 'Hola Ana, ya recibí el ticket. ¿Puedes indicarme qué navegador estás usando?',
            internal: false,
          },
          {
            authorName: 'Luis Hernández',
            content: 'Reproducible en Chrome 119. Pasando a desarrollo.',
            internal: true,
          },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      number: 2,
      subject: 'Consulta sobre facturación',
      description: '¿Pueden enviarme las facturas de los últimos 3 meses?',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      category: 'Facturación',
      contactId: contacts[2].id,
      agentId: manager.id,
      organizationId: org.id,
      resolvedAt: new Date(),
    },
  });
  console.log('✓ Tickets creados');

  // Artículos
  await prisma.article.create({
    data: {
      title: 'Cómo comenzar con el CRM',
      slug: 'como-comenzar',
      excerpt: 'Guía rápida para configurar tu cuenta y empezar a gestionar tus contactos.',
      content: '<h2>Bienvenido</h2><p>Esta guía te ayudará a configurar tu CRM en menos de 10 minutos.</p><h3>Paso 1: Importa tus contactos</h3><p>Ve a la sección de Contactos y haz clic en "Importar CSV".</p>',
      category: 'Primeros pasos',
      published: true,
      organizationId: org.id,
      authorId: owner.id,
    },
  });

  await prisma.article.create({
    data: {
      title: 'Gestión del pipeline de ventas',
      slug: 'gestion-pipeline',
      excerpt: 'Aprende a configurar etapas y mover oportunidades en tu pipeline.',
      content: '<h2>Pipeline visual</h2><p>El pipeline kanban permite arrastrar oportunidades entre etapas.</p>',
      category: 'Ventas',
      published: true,
      organizationId: org.id,
      authorId: manager.id,
    },
  });
  console.log('✓ Artículos creados');

  console.log('\n✅ Seed completado correctamente\n');
  console.log('📧 Usuarios disponibles:');
  console.log('   admin@acme.com  / admin1234  (Propietario)');
  console.log('   maria@acme.com  / admin1234  (Gerente)');
  console.log('   luis@acme.com   / admin1234  (Agente)');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
