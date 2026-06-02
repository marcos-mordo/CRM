# CRM Pro

CRM SaaS profesional multi-tenant para gestión completa de clientes, ventas, marketing y soporte.

## Características

### CRM Core
- Gestión de **Contactos**, **Empresas** y **Leads** con búsqueda, filtros y CSV
- **Pipeline kanban** drag-and-drop con etapas configurables
- **Oportunidades (deals)** con monto, probabilidad y cierre esperado
- **Tareas y actividades** vinculadas a contactos/empresas/deals
- Conversión automática de Lead → Contacto

### Ventas
- Catálogo de **Productos** con SKU, precio, costo, IVA y stock
- **Cotizaciones** con líneas dinámicas, impuestos y descuentos
- **Facturas** con vencimiento, estados de pago y registro de cobros
- Exportación a **PDF** profesional de cotizaciones y facturas
- Conversión Cotización → Factura

### Marketing
- **Listas de email** y segmentación de contactos
- **Campañas de email** con editor HTML, vista previa y envío SMTP
- Tracking de envíos y métricas

### Soporte
- Sistema de **Tickets** con prioridad, estado, agente y categoría
- Comentarios públicos y notas internas
- **Base de conocimiento** con artículos publicables

### Plataforma
- **Multi-tenant** (varias organizaciones con datos aislados)
- **Autenticación** segura con NextAuth + bcrypt
- **Roles** (Owner, Admin, Manager, Agent) con permisos granulares
- **Internacionalización** Español / Inglés
- **Modo claro/oscuro**
- **Dashboard** con KPIs y gráficos en tiempo real
- Interfaz responsive (mobile-friendly)

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| Backend | Next.js Server Actions + API Routes |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 14+ |
| Auth | NextAuth v5 |
| i18n | next-intl |
| Email | Nodemailer |
| PDF | @react-pdf/renderer |

## Requisitos previos

- **Node.js** 18.17+ o 20+
- **PostgreSQL** 14+ instalado y corriendo
- **npm** 10+ o **pnpm** o **yarn**

## Instalación

### 1. Clonar / descomprimir el proyecto

```bash
cd S:\Proyectos\CRM
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear base de datos en PostgreSQL

```sql
CREATE DATABASE crm_pro;
CREATE USER crm_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE crm_pro TO crm_user;
```

### 4. Configurar variables de entorno

Copia el archivo de ejemplo y edita los valores:

```bash
cp .env.example .env
```

Edita `.env`:

```env
DATABASE_URL="postgresql://crm_user:tu_password_seguro@localhost:5432/crm_pro?schema=public"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="GENERA_UN_SECRET_LARGO"
# Genera el secret con: openssl rand -base64 32

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-app-password"
SMTP_FROM="CRM Pro <noreply@tudominio.com>"
```

> **Nota SMTP:** Para Gmail, genera una "App Password" en https://myaccount.google.com/apppasswords

### 5. Ejecutar migraciones y seed

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

O bien, usa el atajo todo-en-uno:

```bash
npm run setup
```

### 6. Iniciar el servidor

#### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

#### Producción

```bash
npm run build
npm start
```

## Credenciales de demostración

Tras el seed se crean estos usuarios:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@acme.com` | `admin1234` | Propietario |
| `maria@acme.com` | `admin1234` | Gerente |
| `luis@acme.com` | `admin1234` | Agente |

**⚠️ Importante:** Cambia estas contraseñas o elimina los usuarios demo antes de subir a producción.

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/           # Login y registro
│   ├── (dashboard)/      # Layout autenticado + módulos
│   │   ├── dashboard/    # KPIs y gráficos
│   │   ├── contacts/
│   │   ├── companies/
│   │   ├── leads/
│   │   ├── pipeline/     # Kanban
│   │   ├── tasks/
│   │   ├── products/
│   │   ├── quotes/
│   │   ├── invoices/
│   │   ├── campaigns/
│   │   ├── lists/
│   │   ├── tickets/
│   │   ├── knowledge/
│   │   └── settings/
│   └── api/              # API routes (auth, PDF, register)
├── components/
│   ├── ui/               # Primitivos shadcn/ui
│   ├── dashboard/        # Layout shell
│   └── [módulo]/         # Componentes por módulo
├── lib/                  # utils, prisma, auth, mailer, PDF
├── i18n/                 # Routing y carga de mensajes
└── types/                # Tipos compartidos
messages/
├── es.json
└── en.json
prisma/
├── schema.prisma
└── seed.ts
```

## Despliegue en producción

### Opción A: Vercel (recomendado)

1. Crear cuenta en [vercel.com](https://vercel.com) y conectar el repositorio
2. Crear base de datos PostgreSQL en [neon.tech](https://neon.tech) o [supabase.com](https://supabase.com)
3. Configurar variables de entorno en el panel de Vercel
4. Hacer push — el build se ejecuta automáticamente

### Opción B: VPS (Ubuntu / Debian)

```bash
# Instalar Node y PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx
sudo npm i -g pm2

# Configurar la app
git clone <repo> /var/www/crm
cd /var/www/crm
npm ci
npm run prisma:deploy
npm run build

# Levantar con PM2
pm2 start npm --name crm -- start
pm2 startup
pm2 save

# Configurar Nginx como reverse proxy
sudo nano /etc/nginx/sites-available/crm
```

Ejemplo de `nginx.conf`:

```nginx
server {
  listen 80;
  server_name tudominio.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL gratuito con Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

### Opción C: Docker

Próximamente — el proyecto está listo para contenerizarse.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Iniciar servidor de producción |
| `npm run lint` | Linter |
| `npm run prisma:generate` | Regenerar cliente Prisma |
| `npm run prisma:migrate` | Crear/aplicar migraciones (dev) |
| `npm run prisma:deploy` | Aplicar migraciones (producción) |
| `npm run prisma:studio` | UI visual de la base de datos |
| `npm run db:seed` | Cargar datos demo |
| `npm run setup` | Instala + migra + seed (todo-en-uno) |

## Personalización

### Logo / Marca

Edita `src/components/dashboard/sidebar.tsx` y el bloque del header en login/registro para cambiar el nombre y el ícono.

### Colores

Edita las variables HSL en `src/app/globals.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;   /* Azul → cambia aquí */
  --primary-foreground: 210 40% 98%;
}
```

### Etapas del pipeline

Se crean automáticamente al registrarse una organización. Edita en la base de datos o crea una UI de configuración.

### Idiomas

Añade nuevos idiomas en `src/i18n/routing.ts` y crea el archivo `messages/<locale>.json`.

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt (cost 10)
- ✅ Sesiones JWT con TTL de 30 días
- ✅ Aislamiento multi-tenant por `organizationId` en toda consulta
- ✅ Validación de inputs con Zod en todos los Server Actions
- ✅ Roles con verificación en backend (no solo UI)
- ✅ CSRF protegido por NextAuth
- ✅ Headers de seguridad por defecto de Next.js

## Soporte

Para dudas técnicas o personalización:

- **Email:** soporte@tudominio.com
- **Documentación interna:** módulo "Base de conocimiento" dentro del CRM

## Licencia

Software propietario. Todos los derechos reservados.

---

**CRM Pro** — Construido con Next.js, TypeScript y mucho café ☕
