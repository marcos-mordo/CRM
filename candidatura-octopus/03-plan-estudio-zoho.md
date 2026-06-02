# Plan de estudio acelerado — Zoho CRM + Deluge + APIs

> **Objetivo:** Pasar de 0 a "puedo defender una entrevista técnica de Zoho" en 3 semanas.
> **Dedicación:** 2-3 horas/día entre semana + 4-5h fin de semana (≈ 15-20h/semana).

---

## Pre-requisito (día 1)

### Cuenta sandbox Zoho — gratis

1. Crear cuenta gratuita en https://www.zoho.com/crm/signup.html
2. Plan **Free** (3 usuarios, suficiente para aprender)
3. Familiarizarte 30 min con la UI: módulos por defecto (Leads, Contacts, Accounts, Deals)

### Bookmarks imprescindibles

- **Deluge reference:** https://www.zoho.com/deluge/help/
- **Zoho CRM Developer docs:** https://www.zoho.com/crm/developer/docs/
- **API REST v7:** https://www.zoho.com/crm/developer/docs/api/v7/
- **Zoho Catalyst (serverless):** https://catalyst.zoho.com/help/
- **Comunidad:** https://help.zoho.com/portal/en/community/zoho-crm

---

## Semana 1 — Fundamentos Zoho + Deluge

### Día 1 (lunes) — Tour completo de Zoho CRM
- Recorrer todos los módulos default: Leads, Contacts, Accounts, Deals, Activities, Reports, Analytics
- Crear 5 contactos manualmente, una empresa, un deal
- Mover el deal entre etapas — entender el "Sales Pipeline" nativo
- **Entrega del día:** screenshot de tu pipeline con 3 deals en distintas etapas

### Día 2 (martes) — Módulos custom + campos
- Crear un módulo custom "Instalaciones" (simulando que vendes paneles solares)
- Añadir campos: tipo, fecha, importe, técnico responsable (lookup a Users)
- Crear un layout y reglas de validación (ej: importe > 0)
- **Entrega del día:** módulo custom funcionando

### Día 3 (miércoles) — Workflows y reglas
- Workflow: cuando un Deal pase a "Won", crear automáticamente una Task
- Workflow: si un Lead lleva 7 días sin actividad, enviar alerta por email
- Estudiar diferencia Workflow vs Blueprint
- **Entrega del día:** 2 workflows activos

### Día 4 (jueves) — Introducción a Deluge
- Sintaxis básica: variables, condicionales, loops, listas, mapas
- Tipos de scripts: Function, Schedule, Workflow, Webhook
- Tutorial oficial: https://www.zoho.com/deluge/help/getting-started.html
- **Ejercicio:** función Deluge que reciba un Lead y devuelva su "score" basado en industria + tamaño empresa

### Día 5 (viernes) — Deluge intermedio
- Funciones invocables desde Workflows
- Llamadas zoho.crm.getRecordById / updateRecord / searchRecords
- Manejo de errores y logging
- **Ejercicio:** cuando un Deal pase a "Won", crear automáticamente un Contact relacionado si no existe

### Fin de semana 1 — Mini-proyecto consolidación
- Construir flujo completo: nuevo Lead → score automático → asignación a owner según score → notificación al owner → si convertido, crear Deal automáticamente
- **Grabar vídeo de 3 min** explicando lo que construiste (te servirá para la entrevista)

---

## Semana 2 — APIs, integraciones, webhooks

### Día 8 (lunes) — Autenticación OAuth2 de Zoho
- Crear "Self Client" en https://api-console.zoho.com/
- Generar tokens, refresh tokens
- Hacer primera llamada API desde Postman a `/crm/v7/Leads`
- **Entrega:** colección Postman con 5 llamadas funcionando (GET/POST/PUT/DELETE Leads)

### Día 9 (martes) — APIs avanzadas
- Bulk Read / Bulk Write APIs
- COQL (queries tipo SQL sobre datos Zoho)
- Search API con criterios complejos
- **Ejercicio:** script Node.js que descargue todos los Leads modificados las últimas 24h

### Día 10 (miércoles) — Webhooks
- Configurar Webhook outbound desde Zoho (cuando se crea un Deal → POST a tu endpoint)
- Crear endpoint receptor (puedes usar webhook.site o ngrok + tu CRM Next.js)
- **Entrega:** demo end-to-end Zoho → tu sistema

### Día 11 (jueves) — Zoho Flow
- Conectar Zoho CRM con: Gmail, Slack, Google Sheets
- Crear un flujo: nuevo Deal → mensaje a canal Slack + fila en Google Sheets
- Diferencia entre Zoho Flow vs Deluge vs Catalyst — cuándo usar cada uno
- **Entrega:** flujo funcionando

### Día 12 (viernes) — Reports + Analytics
- Crear reportes custom (tabular, matrix, gráficos)
- Dashboard con KPIs de ventas
- Bonus: Zoho Analytics para BI más serio
- **Entrega:** dashboard con 4 widgets

### Fin de semana 2 — Integración real
- Construir integración bidireccional: Zoho CRM ↔ Google Sheets (sincronización automática Deals → hoja)
- Documentar arquitectura en README
- **Grabar vídeo de 5 min** explicando el flujo

---

## Semana 3 — Proyecto final + entrevista

### Día 15-17 — Construir proyecto demo
Ver `04-proyecto-demo.md` para especificación detallada.

### Día 18-19 — Preparación entrevista
Ver `05-entrevista-tecnica.md`.

### Día 20-21 — Refinamiento
- Pulir vídeos, README de demos, código
- Practicar pitch de 2 min explicando tu portfolio Zoho
- Repasar preguntas frecuentes

---

## Recursos gratuitos clave

| Recurso | Para qué |
|---|---|
| [Zoho CRM Developer Guide](https://www.zoho.com/crm/developer/docs/) | Documentación oficial completa |
| [Deluge Examples](https://www.zoho.com/deluge/help/) | Snippets reales por caso de uso |
| [Zoho YouTube Channel](https://www.youtube.com/@Zoho) | Tutoriales en vídeo |
| [Pupilfirst Deluge course](https://www.pupilfirst.school/courses) | Curso gratuito (busca "Deluge") |
| [r/Zoho subreddit](https://reddit.com/r/Zoho) | Comunidad activa |
| [Zoho Community Forums](https://help.zoho.com/portal/en/community) | Resolución de dudas reales |

## Métricas para saber que vas bien

Al final de la semana 3 deberías poder:

- ✅ Explicar la diferencia entre Workflow, Blueprint, Schedule y Function en Zoho
- ✅ Escribir una función Deluge de 30 líneas que llame a 2 APIs y actualice registros
- ✅ Configurar OAuth2 y hacer llamadas autenticadas a la API REST
- ✅ Diseñar una integración Zoho ↔ otro sistema con webhooks
- ✅ Defender en entrevista por qué eliges Deluge vs Flow vs Catalyst para un caso dado

## Si no te llaman en 2 semanas

- Postula a posiciones similares para no quedarte parado:
  - CRM Developer (HubSpot, Salesforce, Pipedrive)
  - Integration Engineer
  - Sales Operations Engineer
  - Solutions Engineer

El aprendizaje Zoho te sirve para todas — el ecosistema low-code/CRM es transferible.
