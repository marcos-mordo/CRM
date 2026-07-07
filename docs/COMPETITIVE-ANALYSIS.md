# BrandHub vs el mercado CRM — Análisis competitivo

> Actualizado: julio 2026. Base: features públicas de los líderes del mercado.

## 1. El mercado

| CRM | Cuota aprox. | Fortaleza | Precio/usuario/mes |
|---|---|---|---|
| **Salesforce** | ~22% | Todo, a costa de complejidad brutal | 25–330 € |
| **HubSpot** | ~10% | Marketing + facilidad de uso | 0–150 € (sube rápido) |
| **Zoho CRM** | ~6% | Precio + suite integrada | 14–52 € |
| **Pipedrive** | ~3% | Pipeline visual, simplicidad para ventas | 14–99 € |
| **Monday CRM** | ~3% | Flexibilidad de boards | 12–28 € |
| **Attio** | emergente | Modelo de datos flexible, UX moderna | 29–119 € |
| **Close** | nicho | Llamadas/SMS integrados (inside sales) | 49–139 € |

**Insight clave**: ningún líder ofrece **instalación local con datos 100% en tu máquina**. Todos son SaaS puro. BrandHub es el único con .exe autocontenido + nube opcional — ventaja real para PYMEs europeas sensibles a RGPD y para venta en campo sin cobertura.

## 2. Lo que BrandHub YA tiene (inventario honesto)

### Paridad o superior al mercado
| Área | BrandHub | Comparable a |
|---|---|---|
| Contactos/Empresas/Leads/Deals + pipeline kanban | ✅ | Pipedrive |
| Tareas (+kanban, +recurrentes), calendario | ✅ | Todos |
| Cotizaciones, facturas, productos, PDF | ✅ | Zoho |
| Campañas email + A/B + tracking pixel + secuencias drip | ✅ | HubSpot Starter |
| Web forms embebibles → lead automático | ✅ | HubSpot |
| Lead scoring con IA + asistente conversacional con tools | ✅ | Einstein/Zia (mejor: usa Claude) |
| Tickets + base de conocimiento | ✅ | Zoho Desk básico |
| Goals/quotas + ranking + forecast pesado | ✅ | Salesforce básico |
| Time tracking integrado | ✅ | Ninguno lo trae de serie |
| Multi-tenant + RBAC 5 roles + 2FA + SSO + audit log | ✅ | Enterprise tier de todos |
| API REST + webhooks in/out + tokens | ✅ | Todos |
| Portal del cliente final (magic link) | ✅ | Salesforce Experience Cloud ($$$) |
| Offline-first PWA con cola de sync | ✅ | **Nadie** |
| App escritorio 100% local + Android + nube opcional | ✅ | **Nadie** |
| Firma digital en venta + bloqueo post-firma + link público | ✅ | Requiere DocuSign aparte |
| Comisiones automáticas multi-marca | ✅ | Requiere SPIFF/CaptivateIQ aparte |
| @menciones, adjuntos drag&drop, inline edit, bulk actions | ✅ | Attio/HubSpot |
| Telegram bot, WhatsApp helper, mapa clientes | ✅ | Nadie de serie |

### Brechas reales vs los líderes
| # | Falta | Quién lo tiene | Impacto |
|---|---|---|---|
| 1 | **Workflow automation** (si pasa X → haz Y) | Todos (es SU feature estrella) | 🔴 Crítico |
| 2 | **Report builder** (informes custom drag&drop) | Salesforce, Zoho | 🟠 Alto |
| 3 | **Meeting scheduler** (links de reserva tipo Calendly) | HubSpot | 🟠 Alto |
| 4 | **Merge de duplicados** (UI de fusión) | Todos | 🟡 Medio |
| 5 | Email 2-way sync (Gmail/Outlook por usuario) | Todos | 🟡 Medio (OAuth complejo) |
| 6 | SLAs en tickets | Zoho Desk, HubSpot Service | 🟡 Medio |
| 7 | Llamadas/SMS integrados | Close | 🟢 Bajo (nicho, requiere Twilio $$) |
| 8 | Custom objects completos | Attio, Salesforce | 🟢 Bajo (custom fields ya cubre 80%) |

## 3. Posicionamiento

**BrandHub = "El CRM que instalas como un programa"**

- Pipedrive-simple en UX, HubSpot-completo en features
- Único con modo local real (RGPD-friendly, sin cuota mensual obligatoria)
- IA de serie (Claude) sin addon de pago
- Vertical único: agencias multi-marca con comisiones automáticas

## 4. Roadmap de cierre de brechas

1. ✅→🔨 **Workflow automation** (en curso — este sprint)
2. Meeting scheduler con página pública de reservas
3. Merge de duplicados
4. Report builder simplificado (elegir entidad + columnas + filtro + gráfico)
5. SLAs en tickets
6. Email sync (fase 2, requiere OAuth Google/Microsoft por usuario)
