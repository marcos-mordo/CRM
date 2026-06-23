# BrandHub

CRM multi-marca para **agencias comerciales** que representan varias empresas y venden sus servicios a clientes finales.

> **Caso típico:** una agencia de IT/ciberseguridad representa a 10+ marcas (CyberShield, CloudGuard, PenTestPro, SOCWatch, TrainSec…) y sus representantes venden licencias, auditorías, SOC gestionado y formación a empresas y autónomos, con firma digital en el sitio y comisión calculada automáticamente.

Distribuible como **web + app de escritorio (Windows/macOS/Linux) + APK Android** desde un solo codebase.

## Estado del proyecto

| Capa | Estado |
|---|---|
| Modelo de datos completo (CRM Core + BrandHub) | ✅ |
| Backend Next.js + Prisma + PostgreSQL embebido | ✅ |
| Autenticación NextAuth + RBAC + multi-tenant | ✅ |
| UI CRM Core (contactos, empresas, leads, pipeline, tareas, facturación, marketing, soporte) | ✅ |
| UI BrandHub (marcas, catálogo, clientes finales, ventas con firma, comisiones) | ✅ |
| Firma digital canvas + PDF contrato generado | ✅ |
| Empaquetado Electron PC (.exe/.dmg/.AppImage) | ✅ |
| Empaquetado Android APK con Capacitor | ✅ |
| Despliegue cloud (Vercel + Neon) | ⏳ pendiente |
| Sync offline (trabajo sin conexión) | ⏳ pendiente |

## Funcionalidades BrandHub

### Marcas representadas
- Alta de marcas con razón social, CIF, contacto
- Comisión por defecto configurable (% sobre venta / cantidad fija / escalonado)
- Asignación de representantes a marcas (con override de comisión por rep)

### Catálogo por marca
Tipos predefinidos para IT/ciberseguridad:
- Licencia software · Suscripción SaaS · Auditoría · Formación
- Hardware · Servicio gestionado (MSSP/SOC) · Soporte · Consultoría · Personalizado

Frecuencia de facturación: pago único / mensual / trimestral / anual.

### Clientes finales (B2B y B2C)
- Persona física o empresa
- Captura RGPD obligatoria con fecha y opt-in marketing separado
- Búsqueda por DNI/CIF/email

### Venta con firma digital
- Wizard 3 pasos: cliente → carrito → firma
- Cálculo de comisión en vivo (la más específica gana: producto > marca)
- Captura de firma manuscrita con canvas HTML5 (touch + ratón)
- Genera PDF de contrato profesional con firma incrustada y bloque legal RGPD
- Estados: Borrador / Pendiente firma / Firmada / Activa / Cancelada / Reembolsada

### Comisiones
- KPI Pendientes / Aprobadas / Pagadas
- Flujo Pending → Approved → Paid (solo managers+)
- Registro de método y referencia de pago
- Auto-cancelación al reembolsar la venta

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| Backend | Next.js Server Actions + API Routes |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 18 (embebida con `embedded-postgres`) |
| Auth | NextAuth v5 |
| i18n | next-intl (Español + Inglés) |
| Email | Nodemailer (SMTP) |
| PDF | `@react-pdf/renderer` |
| Firma digital | Canvas HTML5 con captura touch/mouse |
| Empaquetado PC | Electron + electron-builder |
| Empaquetado móvil | Capacitor (Android APK) |

## Quick start (5 minutos)

```bash
# 1. Clonar y entrar
git clone https://github.com/marcos-mordo/CRM.git brandhub
cd brandhub

# 2. Instalar dependencias
npm install
# (puede pedir --legacy-peer-deps; el .npmrc ya lo activa por defecto)

# 3. Crear archivo .env con la URL de la DB local
cp .env.example .env
# Edita .env y pon:
# DATABASE_URL="postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public"
# NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"

# 4. Arrancar PostgreSQL embebido (terminal 1, dejar abierta)
npm run db:start

# 5. Migrar y sembrar datos demo (terminal 2)
npx prisma migrate deploy
npm run db:seed

# 6. Arrancar la app
npm run dev

# 7. Abrir http://localhost:3000 y entrar con:
#    admin@acme.com  /  admin1234
```

## Comandos útiles

| Comando | Para qué |
|---|---|
| `npm run dev` | Dev server Next.js (web) |
| `npm run db:start` | PostgreSQL embebido local (puerto 5433) |
| `npm run db:seed` | Cargar datos demo (resetea la DB) |
| `npm run prisma:studio` | UI visual de la base de datos |
| `npm run prisma:migrate` | Crear nueva migración |
| `npm run electron:dev` | Backend + Electron en paralelo |
| `npm run electron:build:win` | Generar instalador .exe Windows |
| `npm run electron:build:mac` | Generar .dmg macOS |
| `npm run cap:add:android` | Inicializar proyecto Android |
| `npm run android:build` | Generar APK Debug |

Para empaquetado y distribución completa ver [PACKAGING.md](PACKAGING.md).

## Credenciales demo

Tras el seed se crean estos usuarios:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@acme.com` | `admin1234` | Propietario |
| `maria@acme.com` | `admin1234` | Manager |
| `luis@acme.com` | `admin1234` | Agente comercial |

Y datos BrandHub:
- 5 marcas (CyberShield, CloudGuard, PenTestPro, SOCWatch, TrainSec)
- 8 productos en catálogo
- 4 clientes finales (3 empresas + 1 persona física, todos con RGPD)
- 2 ventas firmadas (una pagada, otra pendiente de aprobar comisión)

⚠️ **Cambia o elimina estos usuarios antes de producción.**

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/                  # Login y registro
│   ├── (dashboard)/             # Layout autenticado
│   │   ├── dashboard/           # KPIs y gráficos
│   │   ├── contacts/            # CRM interno
│   │   ├── companies/
│   │   ├── leads/
│   │   ├── pipeline/            # Kanban deals
│   │   ├── tasks/
│   │   ├── brands/              # 🆕 BrandHub: marcas representadas
│   │   ├── catalog/             # 🆕 productos por marca
│   │   ├── end-customers/       # 🆕 clientes finales con RGPD
│   │   ├── sales-orders/        # 🆕 ventas con firma
│   │   ├── commissions/         # 🆕 cobros a representantes
│   │   ├── products/            # Catálogo interno (legacy)
│   │   ├── quotes/ invoices/    # Facturación interna
│   │   ├── campaigns/ lists/    # Email marketing
│   │   ├── tickets/ knowledge/  # Soporte
│   │   └── settings/            # Equipo + organización
│   └── api/                     # Auth, PDF endpoints
├── components/
│   ├── ui/                      # Primitivos shadcn
│   ├── dashboard/               # Layout shell
│   ├── brands/ catalog/         # 🆕 BrandHub UI
│   ├── end-customers/ sales/
│   ├── commissions/
│   └── …                        # CRM core
├── lib/                         # utils, prisma, auth, mailer, PDFs
└── i18n/                        # Mensajes ES/EN
electron/                        # main.js para wrap PC
capacitor.config.ts              # Config Android wrap
scripts/db-start.ts              # PostgreSQL embebido
prisma/
├── schema.prisma                # 11 modelos CRM + 11 modelos BrandHub
├── migrations/
└── seed.ts                      # Datos demo completos
messages/es.json / en.json       # i18n
```

## Próximos pasos para producción

1. **Desplegar backend en nube** (Vercel + Neon) → permite que tus amigos/clientes usen la app desde sus dispositivos
2. **Generar APK firmado** + subir a Play Store o distribuir por web
3. **Firmar Electron .exe** con certificado Code Signing (evita warnings Windows SmartScreen)
4. **Implementar sync offline** (IndexedDB + cola de mutaciones) para reps en zonas sin cobertura
5. **Crear plantillas de contrato editables** desde UI (módulo ContractTemplate ya en schema)
6. **Auto-update Electron** con `electron-updater`

## Licencia

Software propietario. Todos los derechos reservados.

---

**BrandHub** — Hub de marcas para agencias comerciales
