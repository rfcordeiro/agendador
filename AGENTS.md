# Guia de Contribuição e Convenções

**Idioma**: Português. Objetivo: consistência total entre backend (Django/DRF) e frontend (React/Vite), com comandos previsíveis, código tipado e pronto para CI/CD.

## Stack e ferramentas (decisões firmes)
- Backend: Python 3.12+, Django/DRF. Gerenciamento de deps com `pip` + `requirements.txt`/`requirements-dev.txt` e venv local (`python -m venv`). Sem Poetry/uv por padrão (simplicidade e compatibilidade); se usar alternativo, mantenha locks em sincronia.
- Frontend: React/Vite com **TypeScript** já habilitado. `npm` (Node 20) + `package-lock.json` fixam versões.
- Lint/format: `ruff` (lint + format) no backend; `mypy` para tipos. Frontend com `eslint` + `prettier` + `tsc --noEmit`.
- Containers: Docker Compose é o caminho preferencial (dev/homolog/prod); dev local via venv/SQLite é permitido para ciclos rápidos.
- CI: GitHub Actions com jobs separados (backend lint/type/test; frontend lint/format/type/test). Deploys via pipeline segmentada (staging Hetzner → produção) com imagens versionadas e aprovação manual.

## Organização de pastas
- `backend/`: código Django. Projeto e apps vivem em `backend/src/`. Tests espelhados em `backend/tests/<app>/`. Evite poluir o root.
- `frontend/`: código React/Vite; componentes por feature em `src/` com testes em `src/__tests__/` ou `src/<feature>/__tests__/`.
- `docs/`: documentação operacional/visão; `spec/`: detalhamento funcional/técnico. ADRs em `docs/adr/` com prefixo numérico (`0001-<slug>.md`).
- `infra/`: assets de CI/CD, scripts de deploy, manifests. `scripts/`: utilitários pontuais de dev.
- `.env.example`: manter variáveis necessárias para rodar; nenhuma credencial real em VCS.

## Fluxo de desenvolvimento
- Sempre que possível, use `make compose-up` e `make compose-migrate`. Para desenvolvimento rápido, `make backend-migrate` + `make backend-run` (SQLite) são válidos.
- Crie branches a partir de `master`: `feature/<issue>-<slug>`, `fix/<issue>-<slug>`, `chore/<slug>`, `docs/<slug>`. Commits seguem Conventional Commits.
- PRs pequenas e focadas; descreva objetivo, riscos, e comandos de teste executados. Inclua screenshots ou logs para mudanças de UI/operacionais.

## Estilo de código (backend)
- Formatação/Lint: `ruff format` e `ruff check` (ativar regras de segurança/performance). Rodar antes de abrir PR.
- Tipagem: use type hints em funções públicas e models; valide com `mypy` + `django-stubs`. Evite `Any`; prefira `TypedDict`/`dataclass` para payloads internos.
- Convenções: 4 espaços, linhas ≤ 100 colunas, snake_case para módulos/variáveis, PascalCase para classes, SCREAMING_SNAKE_CASE para constantes. 
- Imports: stdlib → terceiros → internos; ordenar automaticamente (`ruff --select I`).
- Migrations: sempre versionadas. Não editar migrações aplicadas; se errar, crie nova. Revisar nomes legíveis para `verbose_name` e `help_text`.

## Estilo de código (frontend)
- Preferir TypeScript em novos componentes; manter `strict: true`.
- Formatação: `prettier` + `eslint` (plugin React/TS). Rodar antes do commit.
- Em todo desenvolvimento, validar lint/format/tipos com os alvos do Makefile: `make frontend-lint`, `make frontend-format`, `make frontend-typecheck`, `make backend-lint`, `make backend-format`, `make backend-typecheck`.
- Estrutura: componentes por feature; evite “mega-componentes”. Hooks compartilhados em `src/lib` ou `src/common`. CSS Modules ou styled-system simples; evitar styles globais não necessários.
- Acessibilidade: sempre a11y nos controles (aria-label, roles). Testes com React Testing Library.

## UI/Design tokens
- Tipografia: família primária `"Space Grotesk", "Manrope", system` (importar no frontend). Usar pesos 400/500/600; títulos com tracking leve. Evitar pilhas genéricas (Inter/Roboto).
- Paleta sugerida: 
  - Primária: `#1f6feb`; Acento: `#f97316`;
  - Neutros: `#0f172a`, `#1e293b`, `#334155`, `#e2e8f0`, `#f8fafc`;
  - Sucesso/Erro/Aviso: `#16a34a`, `#dc2626`, `#f59e0b`.
- Definir variáveis CSS (e.g. `--color-primary`) e reutilizar. Animações só quando agregam clareza (entradas de seção, feedback de ação). Layouts responsivos desde o início.

## Testes
- Cobertura: sem meta numérica fixa; escreva testes suficientes para fluxos críticos e validações de domínio. Preferir unitários determinísticos.
- Backend: usar `pytest` + `pytest-django` (ou `manage.py test` até migrarmos). Fixtures explícitas. Mockar integrações externas.
- Frontend: React Testing Library + Vitest. Para integrações, isolar chamadas de rede via mocks/fakes.
- Google Calendar/Redis/Postgres: em testes, usar fakes/localstack ou calendários de sandbox dedicados; nunca apontar para produção.

## Infra, CI/CD e deploy
- CI: GitHub Actions rodando `ruff check/format --check`, `mypy`, testes backend; `npm test`, `npm run lint`, `npm run typecheck` (quando TypeScript) no frontend.
- Deploy: build de imagens Docker versionadas. Pipeline futura: `master` → staging (Hetzner homolog) → produção com aprovação manual. `.env` separado por ambiente.
- Observabilidade: logs estruturados; não logar dados sensíveis. Registrar execuções de jobs e diffs de escala.

## Segurança e dados
- Nunca versionar segredos (tokens, senhas, keys). Use variáveis de ambiente e `.env.example` com placeholders seguros.
- Sanitizar dados sensíveis em logs e fixtures. Evitar PII em exemplos.

## Documentação
- Todo comportamento novo deve vir com doc curta em `docs/` (operacional) ou `spec/` (domínio/API/algoritmo). Atualize fluxos, endpoints e decisões.
- ADRs para decisões relevantes (infra, libs, arquitetura). Formato: contexto → decisão → implicações.
- Manter `README` e `docs/operacao.md` alinhados com comandos de execução/migração.

## Revisão e merge
- Checklist de PR: lint/format, testes rodados, migrações revisadas, docs atualizadas, screenshots/logs incluídos.
- Prefira merges sem squash para preservar histórico de commits coerentes; squash apenas para branches ruidosos.
