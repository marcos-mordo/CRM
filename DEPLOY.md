# Desplegar BrandHub en la nube (5 minutos, gratis)

Stack recomendado: **Vercel** (hosting) + **Neon** (PostgreSQL). Ambos
con planes gratuitos suficientes para empezar.

Una vez desplegado, tendrás una URL pública (`https://tuempresa.vercel.app`)
que tus empleados meten en el APK al primer arranque. Acceden desde
cualquier sitio con internet.

---

## Paso 1 · Base de datos en Neon (60 segundos)

1. Ve a https://neon.tech y crea cuenta (con GitHub o email)
2. Crea un proyecto:
   - **Name**: BrandHub
   - **Region**: Frankfurt (eu-central-1) para Europa
3. Copia el **Connection String** que te muestra. Tiene este formato:
   ```
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

> Plan free de Neon: 0.5 GB de almacenamiento + autostop tras inactividad.
> Cuando se quede pequeño (~50 mil contactos), upgrade a $19/mes.

---

## Paso 2 · Deploy a Vercel (3 minutos)

### Opción A — 1-click deploy

Click este botón (sustituye `marcos-mordo/CRM` por tu repo si forkeas):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/marcos-mordo/CRM)

### Opción B — Manual

1. Ve a https://vercel.com y conecta tu GitHub
2. **Import Project** → selecciona el repo `CRM`
3. **Framework Preset**: Next.js (auto-detect)
4. Antes de Deploy, **Environment Variables** (todas marcadas como
   *Production, Preview, Development*):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | el connection string que copiaste de Neon |
   | `NEXTAUTH_URL` | `https://TUPROYECTO.vercel.app` (lo sabrás tras el deploy) |
   | `NEXTAUTH_SECRET` | un valor random (ejemplo abajo) |

   Genera el secret con cualquiera de:
   ```bash
   # Mac/Linux
   openssl rand -base64 32
   # Windows PowerShell
   [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   # O simplemente
   https://generate-secret.vercel.app/32
   ```

5. **Deploy**. Tardará ~3 min. Verás:
   ```
   ✓ Build completed
   ✓ Deployment ready
   https://brandhub-xxx.vercel.app
   ```

6. Ve a Settings → Environment Variables y actualiza `NEXTAUTH_URL` con
   la URL real que te dio Vercel. Después: **Redeploy**.

---

## Paso 3 · Crear la primera cuenta

Visita tu URL `https://tuempresa.vercel.app/register` y crea la cuenta
de tu organización (será OWNER).

Después invita a empleados desde **Settings → Equipo**.

---

## Paso 4 · Configurar el APK de tus empleados

Cada empleado:

1. Descarga el APK desde tu página `https://tuempresa.vercel.app/download`
   (o desde GitHub Releases)
2. Instala (acepta "fuentes desconocidas" si Android pregunta)
3. Al abrir la app por primera vez verá:
   ```
   ┌─────────────────────────────────┐
   │  Conecta a tu BrandHub          │
   │                                 │
   │  URL del servidor               │
   │  [https://tuempresa.vercel.app] │
   │                                 │
   │  [Probar]    [Continuar]        │
   └─────────────────────────────────┘
   ```
4. Pone la URL → Probar (verifica conexión) → Continuar → login

A partir de ahí, **la app recuerda la URL**. No tiene que volver a
configurarla salvo que cambies el servidor.

---

## Costes esperados

Empresa con **20 empleados, 5,000 contactos, 100 ventas/mes**:

| Servicio | Plan | Coste |
|---|---|---|
| Vercel | Hobby | **0 €** (suficiente) |
| Neon | Free | **0 €** (suficiente) |
| Total | | **0 € / mes** |

Escala a Pro cuando:
- Vercel: tráfico > 100 GB/mes o equipos compartidos → $20/mes
- Neon: DB > 0.5 GB → $19/mes

---

## Cron jobs (digest, recurring tasks, monthly reports)

Vercel ejecuta automáticamente los cron definidos en `vercel.json`:

- **6:00 UTC diaria** → genera tareas recurrentes
- **7:00 UTC lun-vie** → email digest a cada rep
- **9:00 UTC día 1 de cada mes** → PDF mensual ejecutivo

No necesitas configurar nada extra.

---

## Backup automático

Neon hace **branching automático** y permite restaurar a cualquier punto
de los últimos 7 días (Free) / 30 días (Pro). Suficiente para no perder
datos por accidente.

Para backup manual semanal:
```bash
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
```

Cron rod tu PC, Google Drive, etc.

---

## Troubleshooting

### "Database connection failed" en /api/health
- Verifica que `DATABASE_URL` en Vercel apunta a Neon con `?sslmode=require`
- Neon hace autostop tras 5 min sin uso (Free): el primer request tras un
  rato puede tardar 2-3s en arrancar la DB. Normal.

### "UntrustedHost" en login
- `NEXTAUTH_URL` debe coincidir EXACTAMENTE con la URL pública de Vercel
- Sin trailing slash. Con https. Sin path.

### APK no conecta
- ¿La URL termina en `.vercel.app`? Debe ser https
- En el setup del APK, click "Probar" antes de "Continuar"
- Si "Probar" falla, prueba la URL desde un navegador móvil; quizá no
  está aún desplegada

### Empleado pierde la configuración del APK
- Settings de la app Android → BrandHub → Almacenamiento → Borrar datos
  → vuelve a abrir → pide URL nueva
