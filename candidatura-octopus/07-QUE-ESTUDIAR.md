# Qué estudiar exactamente — Plan de 4 semanas

## Diagnóstico de TU situación

| Variable | Tu realidad | Implicación |
|---|---|---|
| Programación | Sólida | No pierdas tiempo en fundamentos JS/HTML/etc. — al grano con Zoho |
| Experiencia laboral | Cero | **El portfolio sustituye la experiencia**. Es tu único activo real. |
| Tiempo/día | 3-4h | 25h/semana → 100h/mes. Suficiente para llegar a entrevista con algo serio |
| Octopus pide | 2 años Zoho | No lo tienes. Tu apuesta: **demostrar capacidad con un proyecto concreto** que nadie con "2 años" se ha molestado en hacer |

**El paradigma a romper:** dejar de pensar "necesito experiencia para postular" y pensar "necesito un proyecto que demuestre que puedo hacer el trabajo, lo subo público, y eso es mi experiencia".

---

## Qué NO estudiar (te ahorra semanas)

- ❌ Cursos de programación general (ya sabes)
- ❌ React/Next/frontend (no es lo que piden)
- ❌ Cursos largos de Zoho de 40h (la mayoría son relleno)
- ❌ Certificaciones de pago (no las miran para junior)
- ❌ Algoritmos/LeetCode (no es entrevista FAANG, es CRM)

## Qué SÍ estudiar (en este orden exacto)

```
1. Zoho CRM como usuario              ← día 1-2
2. Deluge (lenguaje scripting Zoho)   ← día 3-7
3. APIs REST de Zoho + OAuth2         ← día 8-10
4. Webhooks + Zoho Flow               ← día 11-12
5. Reportes y Analytics               ← día 13-14
6. PROYECTO DEMO completo             ← semana 3 entera
7. Inglés técnico oral                ← paralelo, todos los días
```

---

# SEMANA 1 — Fundamentos Zoho + Deluge

## Día 1 (lunes) · 3h

**Objetivo:** Tener Zoho funcionando y entender qué es cada cosa.

1. **(20 min)** Cuenta gratis en https://www.zoho.com/crm/signup.html — plan Free
2. **(40 min)** Vídeo oficial "Zoho CRM in 50 minutes" — https://www.youtube.com/results?search_query=zoho+crm+overview+2024 (busca el más reciente del canal oficial Zoho)
3. **(60 min)** Crear datos de prueba en TU sandbox:
   - 10 Leads (manuales, distintos sectores)
   - 5 Accounts (empresas)
   - 5 Contacts asociados a esas Accounts
   - 5 Deals en distintas etapas del pipeline default
4. **(40 min)** Explorar TODAS las opciones del menú lateral. No estudiar, solo curiosear. Anota qué no entiendes — lo investigarás después.

**Entrega del día (foto/screenshot guardada en una carpeta `evidencias/`):**
- Pipeline con 5 deals visibles
- Un Lead con todos sus campos rellenos

## Día 2 (martes) · 3h

**Objetivo:** Personalizar Zoho como lo haría un developer.

1. **(60 min)** Crear un módulo custom "Instalaciones" con campos:
   - Tipo (picklist: Residencial / Comercial / Industrial)
   - Potencia kWp (decimal)
   - Importe (currency)
   - Fecha programada (date)
   - Estado (picklist: Planificada / En curso / Completada / Cancelada)
   - Cliente (lookup a Account)
   - Técnico responsable (lookup a Users)
2. **(40 min)** Layout custom para el módulo — secciones organizadas, campos obligatorios
3. **(40 min)** Reglas de validación:
   - Importe debe ser > 0
   - Si tipo = "Industrial", la potencia debe ser > 50 kWp
   - Fecha programada no puede ser en el pasado
4. **(40 min)** Documentación oficial leída entera (sí, entera, son 30 min):
   - https://www.zoho.com/crm/admin-guide/modules/custom-modules.html

**Entrega:** Módulo Instalaciones funcionando + 5 registros de prueba

## Día 3 (miércoles) · 4h

**Objetivo:** Primer contacto con Deluge.

1. **(45 min)** Lectura: https://www.zoho.com/deluge/help/getting-started.html
2. **(60 min)** Tutorial interactivo oficial (Zoho lo tiene gratis): https://www.zoho.com/deluge/help/tutorial.html
3. **(60 min)** Ejercicios básicos en el editor Deluge de tu sandbox:
   ```deluge
   // 1. Función que recibe nombre y edad, devuelve saludo personalizado
   // 2. Función que recibe lista de números, devuelve suma y promedio
   // 3. Función que recibe fecha de nacimiento, calcula edad actual
   // 4. Función que recibe string email, valida formato correcto
   ```
4. **(75 min)** Primera función conectada a Zoho:
   ```deluge
   // Función que recibe un Lead ID y devuelve un "score" calculado:
   // +20 si el lead tiene email
   // +20 si tiene teléfono
   // +30 si Company no está vacío
   // +30 si la industria está en una lista de prioritarias
   ```

**Entrega:** 4 ejercicios + función de score funcionando

## Día 4 (jueves) · 4h

**Objetivo:** Deluge intermedio — Workflows + Functions.

1. **(45 min)** Diferencias clave (lee y toma notas):
   - https://www.zoho.com/crm/developer/docs/server-script/functions.html
   - Workflow vs Schedule vs Function vs Blueprint
2. **(90 min)** Crear workflow:
   - **Trigger:** Cuando se crea un Lead
   - **Acción:** Ejecutar función Deluge que calcula score (la del día 3)
   - **Acción:** Actualizar campo "Lead Score" con el resultado
   - **Acción:** Si score > 70, asignar a usuario específico + enviar email
3. **(75 min)** Schedule (job programado):
   - Función que cada día a las 8am busca Leads sin actividad en 7 días
   - Por cada uno, crea una Task al owner: "Lead frío — contactar"
4. **(30 min)** Probar todo, capturar pantallazos, anotar errores

**Entrega:** Workflow + Schedule funcionando, vídeo de 2 min mostrando el flujo

## Día 5 (viernes) · 4h

**Objetivo:** Deluge avanzado — manipulación de datos y errores.

1. **(60 min)** API de zoho.crm dentro de Deluge:
   - `zoho.crm.getRecordById()`
   - `zoho.crm.updateRecord()`
   - `zoho.crm.searchRecords()` con criteria
   - `zoho.crm.createRecord()`
   - `zoho.crm.bulkCreate()`
2. **(60 min)** Manejo de errores:
   - try / catch en Deluge
   - Logueo a un módulo custom "Sync Log"
3. **(120 min)** Ejercicio integrador:
   - Cuando un Deal pase a "Closed Won":
   - Crear automáticamente un registro en Instalaciones con datos del Deal
   - Calcular kWp estimado: `importe / 1500` (€/kWp típico)
   - Asignar técnico según ciudad del cliente (round-robin)
   - Crear Task al técnico con asunto "Visita técnica preliminar"
   - Loguear toda la operación en Sync Log
   - Si algo falla, capturar error y loguearlo sin romper el flujo

**Entrega:** Función completa + tests manuales + screenshots

## Sábado (día 6) · 3h — Consolidación

- Repasa lo que NO entendiste esta semana
- Lee respuestas en https://help.zoho.com/portal/en/community/zoho-crm
- Resuelve tus propios bugs sin pedir ayuda

## Domingo (día 7) · DESCANSO o repaso ligero

No estudies. Tu cerebro consolida durmiendo y descansando.

---

# SEMANA 2 — APIs, integraciones, herramientas

## Día 8 (lunes) · 4h

**Objetivo:** OAuth2 y primera llamada API REST.

1. **(45 min)** Lectura: https://www.zoho.com/crm/developer/docs/api/v7/oauth-overview.html
2. **(45 min)** Crear "Self Client" en https://api-console.zoho.com/
3. **(60 min)** Postman:
   - Configurar Authorization OAuth2
   - GET /crm/v7/Leads
   - POST /crm/v7/Leads (crear uno desde la API)
   - PUT /crm/v7/Leads/{id} (actualizar)
   - DELETE /crm/v7/Leads/{id}
4. **(90 min)** Pequeño script Node.js:
   ```js
   // Lee todos los Leads de tu Zoho, los muestra en consola
   // Bonus: filtra solo los creados en los últimos 7 días
   ```

**Entrega:** Colección Postman + script Node funcionando

## Día 9 (martes) · 3h

**Objetivo:** APIs avanzadas + COQL.

1. **(45 min)** COQL — el "SQL de Zoho":
   - https://www.zoho.com/crm/developer/docs/api/v7/COQL-Overview.html
2. **(60 min)** Bulk Read API:
   - https://www.zoho.com/crm/developer/docs/api/v7/bulk-read.html
3. **(75 min)** Práctica:
   - Query COQL: "todos los Deals > 10.000€ ganados este mes, con su Account"
   - Bulk read: descargar TODOS los Leads (no importa el volumen) a un CSV local

**Entrega:** Script Node que ejecuta ambas queries

## Día 10 (miércoles) · 4h

**Objetivo:** Webhooks.

1. **(60 min)** Conceptos: outbound vs inbound webhook
2. **(60 min)** Outbound desde Zoho:
   - Crear workflow que cuando se crea un Deal, llama a un endpoint externo
   - Usa https://webhook.site como receptor temporal
   - Verifica que llega el payload correcto
3. **(120 min)** Inbound a Zoho:
   - Endpoint Node/Express simple que reciba un POST de un "formulario web"
   - Validar payload, llamar a la API Zoho para crear un Lead
   - Manejar duplicados (si ya existe email, actualizar en vez de crear)
   - Usar ngrok para exponer tu local

**Entrega:** Demo end-to-end formulario → tu endpoint → Lead en Zoho

## Día 11 (jueves) · 3h

**Objetivo:** Zoho Flow + integraciones no-code.

1. **(45 min)** Tour de Zoho Flow: https://www.zoho.com/flow/
2. **(75 min)** Crear 3 flujos reales:
   - **Flujo 1:** Nuevo Deal en Zoho → mensaje a Slack (canal del equipo)
   - **Flujo 2:** Nuevo Deal en Zoho → fila nueva en Google Sheets
   - **Flujo 3:** Nueva fila en Google Forms (simula lead capture) → crear Lead en Zoho
3. **(60 min)** Decisión técnica documentada:
   - "¿Cuándo uso Zoho Flow vs Deluge?"
   - Escribe tu respuesta en un .md de 1 página — te servirá para entrevista

**Entrega:** 3 flujos + documento de decisión

## Día 12 (viernes) · 4h

**Objetivo:** Reportes, dashboards, Analytics.

1. **(60 min)** Reportes nativos de Zoho:
   - Tabular, Summary, Matrix
   - Filtros, agrupaciones, totales
2. **(60 min)** Crear 5 reportes:
   - "Deals por etapa (con totales)"
   - "Leads por origen (mes actual)"
   - "Conversión Lead → Deal (embudo)"
   - "Top 10 deals abiertos por importe"
   - "Tickets resueltos por agente (si aplica)"
3. **(60 min)** Dashboard con widgets de los reportes anteriores
4. **(60 min)** Zoho Analytics (la versión BI):
   - Cuenta gratis
   - Conectar con Zoho CRM
   - Replicar 1 reporte que en CRM normal sería difícil (ej: cohort de retención de clientes)

**Entrega:** Dashboard + reportes en Zoho CRM + 1 reporte en Analytics

## Sábado-Domingo · 4-6h totales

- Pulir todo lo de la semana
- Empezar a planificar el proyecto demo (semana 3)

---

# SEMANA 3 — PROYECTO DEMO (lo más importante)

**Esta semana es la que cambia tu candidatura.** Sin este proyecto, eres "junior sin experiencia". Con este proyecto, eres "junior con un proyecto que demuestra que sabe Zoho".

Ver `04-proyecto-demo.md` para la especificación completa.

## Día 15 (lunes) · 4h — Estructura y modelo

1. Documentar el proyecto en un README (qué problema resuelve, arquitectura, decisiones)
2. Crear todos los módulos custom necesarios
3. Cargar datos de prueba realistas (mínimo 30 registros)
4. Diagrama de arquitectura con Excalidraw o Mermaid

## Día 16 (martes) · 4h — Automatizaciones core

1. Implementar workflows + funciones Deluge principales (3-5 funciones)
2. Sync Log funcionando
3. Tests manuales de cada flujo

## Día 17 (miércoles) · 4h — Integraciones externas

1. Webhook entrante (formulario web → Lead)
2. Integración con Google Sheets vía Zoho Flow
3. API REST custom expuesta (Function publicada)

## Día 18 (jueves) · 4h — UI externa + reportes

1. App Next.js simple que consume tu API Zoho:
   - Lista deals abiertos
   - Crear deal nuevo
   - (Reusa código del CRM que ya construimos)
2. Dashboard con 4 widgets en Zoho

## Día 19 (viernes) · 4h — Documentación + grabación

1. README pulido con:
   - Problema que resuelve
   - Arquitectura (diagrama)
   - Decisiones técnicas y trade-offs
   - Capturas de pantalla
   - Lo que mejorarías con más tiempo
2. Subir todo a GitHub repo público
3. **Grabar vídeo demo de 5-7 min** (Loom gratis):
   - 30s: contexto
   - 2 min: tour de la UI
   - 2 min: escenario end-to-end
   - 1 min: código Deluge interesante
   - 30s: cierre
4. Subir vídeo a YouTube (no listado), link en README

**Entrega de la semana:** repo público + vídeo + slides opcionales

## Sábado-Domingo · descanso o pulir

---

# SEMANA 4 — Postulación + soft skills + inglés

## Día 22 (lunes) · 3h

1. Actualizar CV y carta con el proyecto demo
2. Actualizar LinkedIn (headline, About, proyecto pinned)
3. Actualizar GitHub (pinned repos, README de perfil)

## Día 23 (martes) · 3h — Postulación masiva

Postular a 10 ofertas en un día:
- Octopus Energy (LA principal)
- 3 ofertas CRM Junior en LinkedIn
- 3 ofertas Integration Engineer Junior
- 3 ofertas Solutions Engineer Junior

Usa el mismo CV base, ajusta carta 5-10 min por cada una.

## Día 24-25 (miércoles-jueves) · 3h/día — Preparación entrevista

Lee `05-entrevista-tecnica.md` y:
- Practica respuestas en voz alta
- Grábate con el móvil respondiendo 10 preguntas
- Critica tu lenguaje corporal, muletillas, claridad

## Día 26 (viernes) · 3h — Inglés técnico

- Escucha el podcast del CEO Octopus (mencionado en la oferta) — entero, en inglés
- Practica explicar tu proyecto demo EN INGLÉS (10 min, grabado)
- Si tu nivel es bajo, usa https://www.cambridgeenglish.org/test-your-english/ para autoevaluarte
- Si necesitas mejorar oral: italki o Cambly, 1 clase con profe nativo/semana

## Día 27-28 · Networking activo

- LinkedIn: buscar empleados de Octopus en 1er o 2do grado
- Conectar con CRM developers en España (ojo: mensaje personal, no spam)
- Comentar posts del CEO de Octopus España con insights reales
- Si conoces a alguien que te referee, pedir el favor

---

# Método de estudio — Cómo aprender efectivamente

## Reglas no negociables

1. **80% práctica, 20% lectura.** Si llevas 30 min leyendo sin tocar el sandbox, cierra el navegador y vuelve cuando vayas a construir algo.

2. **Aprende construyendo, no estudiando.** Cualquier hora dedicada al proyecto demo vale más que 5 horas viendo cursos.

3. **Documenta lo que aprendes.** Un Notion/Obsidian con tus notas. No para repasar — para forzarte a verbalizar. Si no puedes explicarlo escrito, no lo sabes.

4. **Sesión de 90 min máximo, descanso 15 min.** Pomodoro avanzado. Más de 90 min seguidos rinde menos.

5. **Errores son progreso.** Cuando algo te falla, NO busques la solución inmediata. 15 min de intentar entender por qué, luego buscas.

6. **Una cosa al día.** No saltes entre 5 temas. Un día = un objetivo claro.

## Trampas en las que NO caer

- ❌ "Tutorial hell": ver cursos sin construir nada propio
- ❌ Querer dominar todo antes de postular (nunca lo dominarás todo)
- ❌ Comparar tu día 5 con el día 5.000 de un senior
- ❌ Procrastinar postulando con "cuando aprenda X más, postulo"
- ❌ Pedir ayuda antes de intentar 15 min solo

## Cuando te bloquees

Orden de consulta:
1. Documentación oficial Zoho (siempre primero)
2. Stack Overflow (busca el error tal cual)
3. Reddit r/Zoho
4. Comunidad oficial Zoho
5. Pregúntame a mí — cuando ya intentaste todo lo demás

---

# Lo más importante de este documento

**Estás a 4 semanas de tener un perfil mejor que el 70% de juniors que postulen.** No porque sepas más Zoho que ellos (probablemente no), sino porque la mayoría:

- Postula sin proyecto demostrable
- No documenta nada de lo que construye
- No graba vídeos explicando su trabajo
- No prepara la entrevista
- No tiene un README profesional en GitHub

Tú vas a hacer las 5 cosas. Eso te separa.

---

# Acción para HOY (lunes — empieza ya)

1. **(20 min)** Crea cuenta sandbox Zoho ahora mismo: https://www.zoho.com/crm/signup.html
2. **(30 min)** Ve el primer vídeo del canal oficial Zoho sobre Zoho CRM
3. **(40 min)** Crea 5 Leads, 3 Accounts, 5 Deals manualmente
4. **(10 min)** Crea carpeta `S:\Proyectos\CRM\candidatura-octopus\evidencias\` y guarda tu primer screenshot del pipeline

Total: 1h40. Mañana sigues con día 2.

**Si solo haces UNA cosa hoy, que sea crear la cuenta y mover un deal por las etapas del pipeline.** Eso es más valioso que leer todo este documento sin tocar nada.
