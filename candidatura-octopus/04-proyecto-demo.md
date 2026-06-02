# Proyecto demo Zoho — Para portfolio y entrevista

## Por qué este proyecto importa

En la entrevista te van a preguntar **"¿qué has hecho en Zoho?"**. Sin proyecto, tu respuesta es "estoy aprendiendo". Con proyecto, es **"déjame enseñártelo"**. Diferencia abismal.

## La idea: "Octopus Demo — Gestión de instalaciones solares"

Simulas ser un instalador de paneles solares que usa Zoho CRM. Es contextualmente relevante para Octopus (energía renovable, gestión comercial). Demuestra todas las capacidades que piden en la oferta.

---

## Alcance funcional

### Módulos custom en Zoho CRM

1. **Instalaciones** (módulo nuevo)
   - Campos: tipo (residencial / industrial), kWp, importe, fecha programada, técnico asignado (lookup Users), estado (planificada / en curso / completada)
   - Relación con Account (cliente) y Deal (venta que la originó)

2. **Visitas técnicas** (sub-módulo)
   - Campos: fecha, técnico, instalación (lookup), notas, foto adjunta

### Automatizaciones (Deluge + Workflows)

1. **Cuando un Deal pasa a "Won":**
   - Crear automáticamente una Instalación con datos del Deal
   - Calcular kWp estimado según importe (regla custom Deluge)
   - Asignar técnico según ciudad del cliente (round-robin entre técnicos)

2. **Cuando se crea una Instalación:**
   - Enviar email al cliente con confirmación
   - Crear Task al técnico ("Visita técnica preliminar")
   - Notificación Slack al canal del equipo

3. **Job programado diario:**
   - Buscar instalaciones sin actualizar en 7 días → escalar al manager
   - Recalcular pipeline forecast del mes

### Integraciones

1. **Webhook entrante:** simular un formulario web que crea Leads
   - Crear endpoint receptor en tu CRM Next.js (re-aprovechas lo construido)
   - Validación + dedupe + creación vía API Zoho

2. **Sincronización con Google Sheets:**
   - Cada Deal cerrado se replica en una hoja "Comisiones equipo comercial"
   - Vía Zoho Flow o Deluge schedule

3. **API REST custom:**
   - Endpoint `GET /instalaciones-activas` que tu app externa consume con OAuth2
   - Implementado como Function en Zoho con `<my_function>.publicUrl()`

### Reportes y dashboard

1. Reporte "Instalaciones por técnico (mes)" — barras
2. Reporte "Conversión Lead → Deal → Instalación" — embudo
3. Dashboard ejecutivo con 4 widgets KPI

---

## Plan de construcción (3 días, semana 3)

### Día 15 — Modelo de datos + workflows básicos
- Crear módulos custom + campos + layouts
- Workflows simples (sin Deluge todavía)
- Cargar 20 registros de prueba

### Día 16 — Deluge + integraciones
- Funciones Deluge para automatizaciones complejas
- Configurar OAuth2 + integración con tu CRM Next.js
- Webhook entrante + sincronización Google Sheets

### Día 17 — Reportes + documentación
- Crear reportes y dashboard
- Escribir README con arquitectura, decisiones de diseño, screenshots
- Grabar vídeo demo de 5-7 min explicándolo todo

---

## Entregables finales

1. **Repo público en GitHub** con:
   - README con arquitectura (diagrama incluido — usa Excalidraw o Mermaid)
   - Código Deluge en archivos `.deluge` o `.txt` (no es compilable, pero se lee bien)
   - Capturas de pantalla de cada módulo
   - Link al vídeo demo

2. **Vídeo demo en YouTube/Loom** (público, sin login):
   - 30s: contexto del proyecto
   - 2 min: tour de la UI (módulos, datos, workflows)
   - 2 min: ejecutar un escenario E2E (crear Lead → convertir → instalación creada → notificaciones)
   - 1 min: mostrar el código Deluge clave
   - 30s: cierre con lecciones aprendidas

3. **Slide deck de 5 slides** (opcional pero brutal):
   - Problema que resuelve
   - Arquitectura
   - Demo (link al vídeo)
   - Decisiones técnicas
   - Lo que aprenderías en producción real

---

## Cómo lo usas en la entrevista

**Pregunta:** "¿Has trabajado con Zoho?"

**Respuesta defensiva (mala):** "No, pero estoy aprendiendo."

**Respuesta ofensiva (la tuya):**
> "Profesionalmente todavía no, pero construí un proyecto end-to-end para aprender, simulando un negocio de instalaciones solares — contextualmente parecido a lo vuestro. Tengo módulos custom, automatizaciones en Deluge, integración con un sistema externo vía API, y reportes. ¿Te enseño en 3 minutos?"

Y abres el vídeo. Ahí cambia la conversación.

---

## Variantes si tienes menos tiempo

- **Mínimo viable (2 días):** Solo módulo custom + 2 workflows + 1 función Deluge + un reporte
- **Si tienes más tiempo:** Añade un cliente externo en React/Next que consuma la API Zoho — full-stack real
