# Confluence-ready Documentation — Index & Mapping

> **Status: the Atlassian Confluence connector is not installed on `influuc.atlassian.net`** (API returned `403 — app not installed`; granted scopes are Jira-only). These documents are authored to be **push-ready**: once Confluence is authorized (install the Atlassian app / grant Confluence scopes), each maps 1:1 to a Confluence page and can be published in one pass.

## Required Confluence pages → source of truth
| Confluence page | Source doc | Status |
|---|---|---|
| Product Overview | `/docs/product.md` + `/docs/00-discovery.md` | ready |
| Architecture | `/docs/architecture/01-system-architecture.md` | ready |
| Founder Brain | `/docs/design/03-founder-brain.md` | ready |
| Opportunity Engine | `/docs/design/04-opportunity-engine.md` | ready |
| Onboarding | `/docs/design/05-onboarding.md` | ready |
| Extension | `/docs/design/06-extension.md` | ready |
| Security | `/docs/design/07-implementation-plan.md` §6 | ready |
| Infrastructure | `/docs/architecture/01-system-architecture.md` §1–5 + `/docs/available-infrastructure.md` | ready |
| Deployment | `/docs/design/07-implementation-plan.md` §5 (CI/CD + rollback) | ready |
| Analytics | `/docs/product.md` (Analytics Layer) + `/docs/design/07` (outcome metrics) | ready |
| Database Design | `/docs/database/02-database-design.md` | ready |

## Suggested Confluence space structure
```
Space: INFLUUC (Engineering)
├─ Product Overview            (home)
├─ Architecture
│   ├─ System & Infrastructure
│   ├─ Database Design
│   ├─ Event/Queue/Agent
│   └─ Security
├─ Founder Brain
├─ Opportunity Engine
├─ Onboarding
├─ Browser Extension
├─ Deployment & CI/CD
└─ Analytics
```

## To publish live
1. Install the Atlassian/Confluence app on `influuc.atlassian.net` and grant Confluence read/write scopes.
2. Re-run: create space `INFLUUC`, then create one page per row above (HTML body converted from the source Markdown).
3. Cross-link pages and link each to its Jira Epic (`SCRUM`).
