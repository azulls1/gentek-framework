# Architecture: {{PROJECT_NAME}}

## Stack
| Capa | Tecnología | Justificación |
|------|------------|----------------|
| Lenguaje principal | {{LANGUAGE}} | {{LANG_REASON}} |
| Framework backend | {{BACKEND_FW}} | {{BACKEND_REASON}} |
| Framework frontend | {{FRONTEND_FW}} | {{FRONTEND_REASON}} |
| Base de datos | {{DATABASE}} | {{DB_REASON}} |
| Infra | {{INFRA}} | {{INFRA_REASON}} |

## Estructura del repo
```
{{REPO_TREE}}
```

## Componentes
```mermaid
flowchart LR
  {{COMPONENT_DIAGRAM}}
```

## Modelo de datos
```mermaid
erDiagram
  {{DATA_MODEL}}
```

## Contratos principales (API)
```
{{API_CONTRACTS}}
```

## Despliegue
- **Local:** {{LOCAL_DEPLOY}}
- **Prod:** {{PROD_DEPLOY}}

## Trade-offs explícitos
### Decisión 1: {{DECISION_1}}
- **Alternativas consideradas:** {{ALT_1}}
- **Por qué elegimos esta:** {{REASON_1}}
- **Costo:** {{COST_1}}

### Decisión 2: {{DECISION_2}}
- **Alternativas:** {{ALT_2}}
- **Por qué:** {{REASON_2}}
- **Costo:** {{COST_2}}

### Decisión 3: {{DECISION_3}}
- **Alternativas:** {{ALT_3}}
- **Por qué:** {{REASON_3}}
- **Costo:** {{COST_3}}

---
**Generado por:** Architect | **Aprobado por humano:** {{APPROVED_BY}} | **Fecha:** {{DATE}}
