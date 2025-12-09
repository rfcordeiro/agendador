# Arquitetura Técnica (proposta)

## Stack sugerida
- **Backend**: Python + Django/DRF (admin e ORM prontos), Celery para jobs (geração semanal, confirmações diárias), Gunicorn para produção.
- **Frontend**: React (Next.js ou Vite) para dashboard web com componentes simples, acessíveis e suporte a drag-and-drop estilo quadro para edição manual (inclusive entrada de sábados Savassi/Lourdes).
- **Banco**: PostgreSQL para persistência; Redis para filas e cache de geração/sync.
- **Infra**: Docker Compose para dev/prod (web, worker, db, redis); pronto para subir em VPS Hetzner.

## Integração Google Calendar
- Serviço dedicado para OAuth/credenciais, leitura/escrita e resolução de conflitos.
- Marcar eventos do sistema com um prefixo e metadados (ex.: `source=agendador`) para deletar apenas os gerados.
- Respeitar rate limits; batch de operações por agenda; publicação pode ser acionada manualmente após aprovação.

## Prompts/Codex
- Endpoint interno que recebe prompt, registra histórico e invoca executor (CLI ou serviço) para gerar comandos de replanejamento.
- Guardar prompts e resultados em tabela/versionamento de texto para replays e auditoria.
- UI com templates de prompts, pré-visualização de diffs antes de aplicar e botões de aprovação/publicação no Google.

## Segurança e Operação
- Variáveis sensíveis via `.env`; `.env.example` documenta chaves (Postgres, Redis, Google API).
- Logs estruturados (JSON) para jobs e sincronizações; métricas básicas (tempo de geração, eventos escritos), painel de inconsistências (sobreposição, bloqueio violado, estouro de horas).
- Backups do Postgres em cron; snapshots de configurações de salas e premissas.
- Registrar manualmente a escala de sábados (Savassi/Lourdes) e trocas; não sobrescrever via job automático.

## Roadmap técnico inicial
1) Modelar entidades: Profissional, Local, Sala, Premissa, Alocação, Execução (job), PromptHistory.  
2) API CRUD + sync Google; job semanal e confirmação diária.  
3) Dashboard: calendário geral + filtros + prompt box + diff viewer + painel de inconsistências + drag-and-drop para edição manual (incluindo lançamentos de sábado e trocas).  
4) Heurística de geração e testes automáticos das regras.  
5) Hardening: logs, backups, limites de deleção, rate limiting de prompts.
