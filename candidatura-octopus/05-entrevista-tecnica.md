# Guion de entrevista técnica — CRM Software Engineer @ Octopus

## Estructura típica del proceso (lo que esperar)

1. **Screening con Talento** (30 min) — fit cultural + salario + disponibilidad
2. **Entrevista técnica** (60 min) — preguntas Zoho, casos, código
3. **Test técnico** (puede ser asíncrono o live) — ejercicio Deluge o integración API
4. **Entrevista final con manager / equipo** (45 min) — visión, encaje, preguntas finales

Octopus a veces incluye una ronda en inglés. Prepárate para eso.

---

## Preguntas frecuentes y cómo responderlas

### Bloque 1 — Sobre Zoho

**P: ¿Cuánta experiencia tienes con Zoho CRM?**
> Profesional, ninguna. He estado las últimas semanas estudiando en una cuenta sandbox y construyendo un proyecto demo end-to-end. Puedo defender Deluge básico-intermedio, la suite de automatización (Workflows, Blueprints, Schedules), APIs REST con OAuth2, webhooks, y Zoho Flow. ¿Quieres que entremos en alguna parte concreta?

**P: ¿Cuándo usarías Deluge vs Zoho Flow vs Catalyst?**
> - **Deluge:** lógica dentro de Zoho que necesita acceder/modificar registros, automatizaciones disparadas por eventos del CRM, scripts programados. Es lo más cercano al "core" de Zoho.
> - **Zoho Flow:** integraciones entre apps SaaS sin necesidad de código complejo. Ideal para conectar Zoho con Gmail, Slack, Sheets cuando no necesitas transformación pesada de datos.
> - **Catalyst:** cuando necesitas serverless real (Node, Python, Java) con base de datos, autenticación propia, lógica que escapa al límite de ejecución de Deluge (10s) o que va a servir a múltiples consumidores externos.

**P: ¿Cómo manejarías el límite de 10 segundos de ejecución de una función Deluge?**
> Dividiendo el trabajo: si tengo que procesar 5000 registros, hago el disparo desde un Schedule, proceso lotes de 100-200, persisto progreso en un campo del módulo o en un registro custom de control, y reencolo el siguiente lote. Para algo pesado de verdad, lo saco a Catalyst o a un servicio externo y dejo Deluge solo como orquestador.

**P: ¿Qué es un Blueprint y cuándo lo usarías?**
> Es un flujo de transiciones de estado para un registro — defines qué estados son válidos, qué acciones se permiten en cada uno y qué validaciones aplican al pasar de uno a otro. Lo uso cuando hay un proceso de negocio con etapas estrictas (típico en sales pipelines complejos o procesos de onboarding de clientes). Diferente de un Workflow, que es disparado por un evento — el Blueprint controla qué transiciones son legales.

### Bloque 2 — Integraciones y arquitectura

**P: Cómo integrarías Zoho CRM con un sistema de facturación externo?**
> Depende del flujo. Si es unidireccional (Zoho → facturación), un Workflow que dispare una función Deluge que llame al API del sistema externo via `invokeurl` con autenticación. Si es bidireccional, además expongo un webhook en el lado externo que actualice Zoho cuando cambia el estado de pago, llamando al API REST de Zoho con OAuth2. Para volúmenes altos uso Bulk APIs. Siempre con manejo de errores, retry con backoff, y un módulo custom "Sync log" para trazabilidad.

**P: ¿Cómo manejas autenticación OAuth2 con Zoho desde un servicio externo?**
> Self Client para servicios server-to-server. Genero el refresh token una vez, lo guardo cifrado en variables de entorno o secrets manager, y un wrapper renueva access tokens cada hora (caché en memoria/Redis). Validar siempre el scope correcto al generar el token.

**P: ¿Qué harías si un webhook de Zoho falla?**
> Zoho reintenta automáticamente 5 veces con backoff. Pero no me fío de eso solo. Implemento idempotencia en mi endpoint receptor (clave única por evento), guardo un log de cada webhook recibido, y monto un job de reconciliación que cada N minutos compare el último ID procesado vs el último creado en Zoho para detectar eventos perdidos.

### Bloque 3 — Casos de uso reales

**P: Un manager pide que los Leads que llevan 30 días sin tocar se reasignen automáticamente.**
> Schedule de Deluge diario. Query con COQL o `searchRecords` para Leads con `Modified_Time < hoy-30d` y `Lead_Status != 'Lost'`. Para cada uno, reasigno owner según una lógica (round-robin, por carga del equipo, por región...). Notifico al nuevo owner y al anterior. Logueo la acción. Importante: añadir un campo "Reasignado por automatización" para que se note y no sea opaco.

**P: ¿Cómo abordarías un proyecto donde la dirección comercial dice "necesitamos saber por qué pierden los Deals"?**
> Primero entendería el "por qué" del por qué — qué decisiones quieren tomar con esa información. Luego propondría:
> 1. Campo custom obligatorio "Reason for loss" al pasar Deal a "Lost" (validación)
> 2. Lista cerrada de razones consensuada con comercial (no texto libre)
> 3. Reporte mensual con distribución y tendencia
> 4. Workflow que avise al manager cuando se pierda un Deal > X importe
> 5. Dashboard con drill-down por owner, sector, motivo
>
> El error sería ir directo a la solución técnica sin hablar con los usuarios. Eso es la mitad del trabajo.

### Bloque 4 — Comportamental y soft skills

**P: Cuéntame de un proyecto técnico donde tuviste que coordinarte con varios stakeholders no técnicos.**
> [Cuenta un ejemplo real tuyo con formato STAR: Situación, Tarea, Acción, Resultado. Si no tienes uno laboral, usa tu proyecto CRM: tuviste que tomar decisiones de diseño pensando como un usuario comercial, no como un dev]

**P: ¿Cómo gestionas un tiquet urgente cuando ya estás en un proyecto importante?**
> Triage rápido: cuánto bloquea, cuánto cuesta resolverlo, hay workaround temporal. Si es bloqueante y rápido, lo resuelvo y vuelvo al proyecto. Si es bloqueante y complejo, lo comunico explícitamente al PM/manager para que ellos decidan prioridad — no asumo unilateralmente que cambio de prioridad. Documento siempre el incidente para detectar patrones.

**P: ¿Por qué Octopus?**
> [Genuino. Recomendación: escucha el podcast del CEO que mencionan en la oferta. Saca 2-3 puntos que conecten con tus valores. Algo como: "Vuestro enfoque de honestidad radical en una industria que históricamente ha sido opaca con el cliente me parece raro y valioso. Quiero trabajar donde la tecnología sirva a un propósito tangible — no construir CRM por construir CRM."]

---

## Test técnico — qué esperar

Posibles formatos:

**Formato A — Live coding (60-90 min)**
- Pedirán que escribas una función Deluge para resolver un caso (ej: dado un Lead, calcular un score y reasignar owner)
- Tendrán abierto Zoho compartido por pantalla
- **Cómo prepararte:** practica en tu sandbox los snippets de Deluge más comunes (loops, llamadas zoho.crm, llamadas a APIs externas con invokeurl, manejo de errores con try/catch)

**Formato B — Take-home asíncrono (3-5 días)**
- Te darán un caso real ("queremos sincronizar Zoho con X")
- Entregable: documento + código + diagrama
- **Cómo prepararte:** plantilla mental: contexto → assumptions → arquitectura → código → trade-offs → siguientes pasos. Ese formato les encanta porque ven cómo piensas, no solo el resultado.

**Formato C — Pair-programming review**
- Te dan código Deluge feo y te piden refactor + explicar
- **Cómo prepararte:** lee 20 ejemplos de Deluge en el repo de la comunidad, aprende a oler malas prácticas

---

## Preguntas que TÚ debes hacerles

Reservar las últimas para mostrar interés real:

1. ¿Cómo es el stack actual de Zoho de Octopus? ¿Qué módulos custom tenéis? ¿Cuántos workflows / scripts en producción aproximadamente?
2. ¿Con qué otros sistemas se integra el CRM? (billing, soporte, energy data)
3. ¿Cuál es el siguiente proyecto grande del equipo en los próximos 3-6 meses?
4. ¿Cómo medís el éxito de esta posición en 6 meses?
5. ¿Cómo es el día a día — más mantenimiento + soporte interno, o más desarrollo nuevo?
6. ¿Hay margen para proponer mejoras de arquitectura, o el roadmap viene 100% definido?
7. ¿Cómo es el formato híbrido en concreto? (días concretos en oficina)

---

## Antes de la entrevista — checklist

- [ ] Vídeo demo del proyecto Zoho listo y accesible
- [ ] CV en pantalla por si lo piden
- [ ] Test de cámara y micro 30 min antes
- [ ] Vaso de agua a mano
- [ ] 3 ejemplos STAR preparados (proyecto técnico exitoso, dificultad superada, trabajo en equipo)
- [ ] Tabla de salario investigada (Glassdoor, Levels.fyi, comparable Junior/Mid CRM España: 30-50k bruto/año depende experiencia)
- [ ] 5 preguntas tuyas listas
- [ ] Conexión estable, fondo limpio si es videocall

## Si no te sale algo

- Es **mejor decir "no lo sé"** que inventar. Te perdonan no saber, no te perdonan farolear.
- Pero añade: "No lo sé, pero así lo investigaría / así lo abordaría sin saberlo."
- Pide reformular la pregunta si no la entiendes. Es legítimo.

## Después

- Manda un email de agradecimiento en 24h al recruiter — corto, profesional, mencionando 1 cosa específica de la conversación.
- Si te rechazan, pide feedback honesto. La mitad de las veces te lo dan y vale oro.
