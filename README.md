# BrandHub — CRM multi-marca para agencias comerciales

CRM de nivel producto, multi-tenant, vendible como SaaS o desplegable
como app de escritorio/móvil. Diseñado para agencias que representan
varias marcas y venden sus servicios a clientes finales.

```
[ Agencia ] → representa → [ Marca 1, Marca 2, … Marca N ]
                                    ↓
                            [ Catálogo, comisiones, contratos ]
                                    ↓
                      vende a [ Clientes finales ]
                                    ↓
                          [ Comisiones liquidadas al rep ]
```

---

## 📦 Stack

- **Next.js 15** (App Router · Server Actions · Server Components)
- **TypeScript** estricto
- **Prisma 5** + **PostgreSQL** (embebido para dev, cualquier Postgres en prod)
- **NextAuth v5** (Credentials + Google + Microsoft Entra ID)
- **2FA TOTP** (otpauth + qrcode + backup codes)
- **Tailwind CSS** + **shadcn/ui**
- **Stripe** (checkout + webhook)
- **Anthropic Claude** (asistente conversacional con tool use, scoring de leads)
- **@react-pdf/renderer** (contratos + reportes ejecutivos)
- **Nodemailer** (transaccionales + campañas con tracking pixel)
- **Electron** + **electron-updater** (desktop con auto-update)
- **Capacitor** (Android APK)
- **next-intl** (ES / EN cookie-based)
- **SSE** para notificaciones en tiempo real
- **IndexedDB** para sync offline

---

## ⚡ Instalación rápida

```bash
git clone https://github.com/marcos-mordo/CRM.git brandhub
cd brandhub
npm install            # con .npmrc legacy-peer-deps
npm run db:start       # arranca Postgres embebido en :5433 (deja abierto)
npm run setup          # prisma generate + db push + seed demo
npm run dev            # http://localhost:3000
```

**Credenciales demo:** `admin@brandhub.demo` / `Demo1234!`

---

## 🚀 Empaquetado

### Desktop autocontenido (Windows / macOS / Linux)
```bash
npm run build
npm run electron:build:win    # → dist-electron/BrandHub-Setup-1.0.0.exe (~194 MB)
npm run electron:build:mac    # → dist-electron/*.dmg
npm run electron:build:linux  # → dist-electron/*.AppImage
```

El instalador `.exe` incluye Next.js standalone server + Prisma client
embebidos en `resources/app`. Al arrancar:

1. Detecta puerto libre desde 3000
2. Levanta `next start` como proceso hijo (`ELECTRON_RUN_AS_NODE=1`)
3. Espera al `/api/health`
4. Abre la ventana apuntando a `http://127.0.0.1:{puerto}`

Si configuras `DATABASE_URL` apuntando a un host externo, usa esa DB.
Si no, arranca Postgres embebido en `:5433` automáticamente. Al cerrar
la ventana, ambos procesos hijos se matan.

### Auto-update Electron
Publica releases a GitHub con `GH_TOKEN` configurado:
```bash
GH_TOKEN=ghp_xxx npm run electron:publish
```
La app comprueba updates al arrancar y cada 6 h. Pregunta
"Reiniciar ahora / Más tarde" al usuario cuando hay nueva versión.

### Android APK

Requiere Android SDK instalado. Ver [scripts/install-android-sdk.md](scripts/install-android-sdk.md).

```bash
# Primera vez (ya hecho en este repo):
npm run cap:add:android

# Cada build:
cp android/local.properties.example android/local.properties
# (editar local.properties con tu sdk.dir)
npm run android:build
# → android/app/build/outputs/apk/debug/app-debug.apk
```

El APK es un **cliente** que apunta al servidor Next del PC. Edita
`capacitor.config.ts` con la IP LAN de tu PC (`http://192.168.x.x:3000`)
o un dominio público.

### Producción Docker
```bash
docker compose up -d --build
```

---

## 🧩 Features (87 entregadas)

### CRM Core
- Multi-tenant con `organizationId` en todas las tablas
- RBAC con 5 roles (OWNER, ADMIN, MANAGER, AGENT, VIEWER)
- Contactos, Empresas, Leads, Pipeline Kanban, Deals, Tareas
- Calendario visual (tareas + ventas)
- Notas reutilizables, tags globales

### BrandHub (agencia multi-marca)
- Marcas con asignación a representantes
- Catálogos por marca con productos, precios y reglas de comisión
- Comisiones automáticas (% o fijo) al firmar venta
- Plantillas de contrato editables con variables
- Ventas con firma digital (canvas), bloqueo post-firma, PDF auto-generado

### Ventas
- Productos · Cotizaciones · Facturas
- Importación CSV de clientes finales
- Export CSV de ventas + comisiones
- **Sync offline** con cola IndexedDB (vende sin internet, sube al volver)
- **Link público** para compartir venta (read-only + PDF) por WhatsApp/email

### Marketing
- Listas + campañas email + plantillas
- **A/B testing**: subject B + html B opcional, reparto 50/50, métricas separadas
- Tracking pixel de apertura + redirección de clics
- Selección automática de variante ganadora por CTR

### Soporte
- Tickets con estados, prioridades, asignación
- Base de conocimiento

### IA (Claude)
- **Asistente conversacional** flotante con tool use:
  resumen ventas, ranking reps/marcas, comisiones pendientes,
  búsqueda clientes, leads sin actividad
- **Scoring automático** de leads con razones explicadas
- Prompt cacheado (ephemeral) para reducir coste

### Comunicaciones
- Email transaccional (SMTP)
- **WhatsApp helper** (deep-links wa.me)
- **Telegram bot** para notificaciones críticas (venta firmada, comisión pagada)
- SSE in-app + notificaciones persistentes

### SaaS / Multi-org
- Multi-org switcher real (memberships con rol por org)
- Stripe billing (checkout + webhook)
- Subscriptions con estados y plan
- API REST pública con API tokens (sha256, scopes, último uso)
- Webhooks salientes con HMAC-SHA256 + historial + retry
- Webhook entrante para captura de leads externos
- **Dashboard super-admin** (salud SaaS: orgs, churn, ARR)

### Auth & Seguridad
- 2FA TOTP (Google Authenticator / Authy / 1Password) + backup codes
- SSO Google + Microsoft Entra ID
- Magic-link auth para **Customer Portal** (cliente final ve sus contratos)
- Headers de seguridad (HSTS, CSP, X-Frame-Options, etc.)
- Rate limiting básico (in-memory)
- Audit log de acciones críticas, página de auditoría filtrable
- **Bloqueo de edición/borrado de ventas firmadas** (integridad legal)
- Rol VIEWER de solo lectura para auditor externo
- Banner explícito cuando estás en modo VIEWER

### UX
- **Búsqueda global Cmd+K** (rutas + entidades)
- **Keyboard shortcuts globales** (vim-style: `g d` dashboard, `g s` ventas…)
- **Modo presentación** sin sidebar/topbar (`/present`)
- **Mapa de clientes** geolocalizados (Leaflet) con popup
- **Bottom navigation** móvil + página `/more` con todas las secciones
- AI chat bubble flotante (gradient purple→pink)
- Vista kanban toggleable para tareas
- **Saved views** (filtros guardables por usuario)
- Tour interactivo onboarding
- i18n ES / EN cookie-based
- Tema claro/oscuro

### Reportes
- **PDF mensual ejecutivo** scheduled por email
- Comparativa YoY en dashboard
- Activity feed del equipo
- Dashboard personal del representante (`/me`)
- Email digest matinal

### DevOps
- CI GitHub Actions (lint + typecheck + build)
- Dockerfile multistage standalone
- docker-compose con DB + app
- Health endpoint
- Logo BrandHub real + favicon + PWA manifest

---

## 🔑 Variables de entorno

Mínimo viable (`.env`):
```
DATABASE_URL=postgresql://brandhub:brandhub_dev_2026@localhost:5433/brandhub?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=cambia-esto-por-algo-random
```

Opcional según feature:
```
ANTHROPIC_API_KEY=sk-ant-xxx           # AI chat + scoring
STRIPE_SECRET_KEY=sk_live_xxx          # billing
STRIPE_WEBHOOK_SECRET=whsec_xxx
GOOGLE_CLIENT_ID=...                   # SSO
GOOGLE_CLIENT_SECRET=...
AZURE_AD_CLIENT_ID=...                 # SSO Microsoft
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
SMTP_HOST=smtp.example.com             # email
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
TELEGRAM_BOT_TOKEN=...                 # notificaciones
TELEGRAM_WEBHOOK_SECRET=...
GH_TOKEN=...                           # publicar updates Electron
```

---

## 📐 Arquitectura

```
src/
├── app/
│   ├── (dashboard)/           # rutas autenticadas con sidebar
│   ├── api/                   # routes (REST pública, webhooks, AI, SSE)
│   ├── portal/                # Customer Portal (magic-link auth)
│   ├── share/sale/[token]/    # link público de venta + PDF
│   ├── login, register, …
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn primitives
│   ├── dashboard/             # sidebar, topbar, AI bubble, mobile-nav
│   ├── sales/, brands/, …     # por dominio
│   └── ai/                    # chat bubble
├── lib/
│   ├── prisma.ts, auth.ts, auth.config.ts
│   ├── ai.ts                  # Claude + tool use
│   ├── stripe.ts, telegram.ts, mailer.ts
│   ├── webhooks.ts, notifications.ts
│   ├── public-share.ts        # HMAC tokens venta compartida
│   └── portal-auth.ts         # JWT cookie cliente final
└── i18n/                      # ES + EN
prisma/
├── schema.prisma              # 37 modelos
└── seed.ts                    # datos demo
electron/main.js               # auto-update + window
```

---

## 📊 Endpoints REST públicos

Requieren header `Authorization: Bearer brh_xxx` (genera tokens en `/settings`).

| Método | Ruta | Descripción |
|---|---|---|
| GET  | `/api/v1/sales`             | Lista ventas org |
| POST | `/api/v1/sales`             | Crea venta |
| GET  | `/api/v1/contacts`          | Lista contactos |
| POST | `/api/v1/inbound/leads`     | Captura lead desde tu web |
| GET  | `/api/v1/me`                | Info del token |

---

## 🧪 Tests rápidos

| Caso | Cómo |
|---|---|
| Login | `admin@brandhub.demo` / `Demo1234!` |
| Crear venta | `/sales-orders/new`, firma con dedo o ratón |
| Compartir venta | dropdown ⋯ → "Copiar enlace público" |
| AI chat | bubble morado abajo derecha → "¿cuánto vendí?" |
| Mapa | `/end-customers/map` |
| 2FA | `/settings/security` → "Activar 2FA" |
| Customer Portal | `/portal/login` con email del cliente final |
| Super-admin | `/super-admin` (solo OWNER) |

---

## 📜 Licencia

Propietario. Marcos Morales © 2026.
