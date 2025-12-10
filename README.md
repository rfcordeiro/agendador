# Agendador

Ferramenta de apoio para montar e revisar a escala das profissionais da clínica Tetê Araújo, gerando sugestões para 4 semanas, sincronizando com Google Calendar e permitindo ajustes manuais (drag-and-drop) antes de publicar.

## Documentação
- Visão geral e atores: `docs/visao-geral.md`
- Requisitos funcionais e não funcionais: `docs/requisitos-funcionais.md`
- Regras e heurística de escala: `docs/regras-escala.md`
- Fluxos de usuário (admins) e publicação: `docs/fluxos-usuario.md`
- Dashboard e métricas: `docs/dashboard.md`
- Arquitetura técnica proposta: `docs/tecnica.md`
- Operação e rotinas (dev/prod): `docs/operacao.md`
- Guia de contribuição: `AGENTS.md`

## Makefile (atalhos)
- `make backend-install` — cria venv em `backend/.venv` e instala deps (pip).
- `make backend-install-dev` — instala deps de dev (ruff, mypy, pytest).
- `make backend-migrate` — aplica migrations (SQLite por padrão ou Postgres se `POSTGRES_*` setados).
- `make backend-test` — roda testes do Django.
- `make backend-lint` — lint com ruff.
- `make backend-format` — format com ruff.
- `make backend-typecheck` — mypy.
- `make backend-run` — sobe servidor dev em `localhost:8000`.
- `make backend-superuser` — cria superusuário (interativo).
- `make frontend-install` — instala deps do frontend (Vite/React/TypeScript).
- `make frontend-dev` — roda dev server em `localhost:5173`.
- `make frontend-lint` — eslint.
- `make frontend-format` — prettier.
- `make frontend-typecheck` — `tsc --noEmit`.
- `make compose-up` — sobe stack (backend, frontend, Postgres, Redis).
- `make compose-down` — derruba stack.
- `make compose-reset` — derruba stack removendo volumes e sobe de novo (zera Postgres).
- `make compose-migrate` — roda migrations dentro do container backend.
- `make compose-superuser` — cria superusuário dentro do container backend.

## Ambiente de desenvolvimento (sem Docker)
1. Copie `.env.example` para `.env` (opcional se usar SQLite).
2. Backend (Django/DRF, código em `backend/src/`): `make backend-migrate` e `make backend-run` (servidor em `http://localhost:8000/health`). Crie admin com `make backend-superuser` para acessar `/admin/`.
3. Frontend (React/Vite/TypeScript): `make frontend-install` e `make frontend-dev` (servidor em `http://localhost:5173`).
4. Para usar Postgres local, exporte `POSTGRES_*` apontando para seu serviço antes de rodar migrate/run.

## Ambiente com Docker Compose
1. `make compose-up` para subir backend/frontend/Postgres/Redis.
2. `make compose-migrate` para criar as tabelas.
3. `make compose-superuser` para criar usuário do admin.
4. Acesse backend em `http://localhost:8000/health` e admin em `/admin/`; frontend em `http://localhost:5173`.
5. Para resetar o banco: `make compose-reset` (apaga volumes e recria).
