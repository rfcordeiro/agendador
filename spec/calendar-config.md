# Configuração de Google Calendar por ambiente

## Variáveis de ambiente (exemplos)
- `GCAL_GENERAL_CALENDAR_ID` — agenda geral do ambiente (dev/stg/prod).
- `GCAL_GENERAL_CALENDAR_NAME` — nome amigável da agenda geral para logs/UI.
- `GCAL_OAUTH_CLIENT_ID` / `GCAL_OAUTH_CLIENT_SECRET` — credenciais OAuth.
- `GCAL_WEBHOOK_BASE_URL` — base pública para callbacks (ex.: `https://stg.agendador.com/calendar/webhook`).
- `GCAL_WEBHOOK_TTL_DAYS` — dias antes do vencimento para renovar o canal.
- `GCAL_SYNC_WINDOW_DAYS` — quantos dias para trás no primeiro sync (ex.: 60).
- `GCAL_SYNC_BATCH_SIZE` — limite de eventos por execução (para rate limit).

## Armazenamento
- `.env` para desenvolvimento local; `/.env.example` deve conter placeholders seguros.
- Secrets no GitHub Actions para stg/prod com os mesmos nomes das variáveis acima.
- Tokens de acesso/refresh de usuários ficam no banco, criptografados; nunca em arquivo.

## Convenções de nomes de agenda
- Agenda geral: `Agendador - {ENV}` (ENV=DEV/STG/PROD) — valor exato definido nas variáveis acima.
- Agenda de profissional: `[<gestor>] <profissional>` (mantém padrão atual).
- Agenda de sala: `<local> - Sala <nome>`; criação/ID registrada no banco no onboarding.

## Validação na inicialização
- Backend checa presença das variáveis obrigatórias (`GCAL_GENERAL_CALENDAR_ID`, credenciais OAuth, webhook base).
- Falta de variável => erro claro e bloqueio de boot em staging/prod; em dev, emitir warning mas não subir sync.
