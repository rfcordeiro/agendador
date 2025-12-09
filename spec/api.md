# API (esboço)

Base REST/JSON. Endpoints principais (prefixo `/api`):

## Cadastros
- `POST/GET/PUT/DELETE /profissionais`
- `POST/GET/PUT/DELETE /locais`
- `POST/GET/PUT/DELETE /salas`
- `POST/GET/PUT/DELETE /capacidade-salas`
- `GET/PUT /premissas-globais`

## Escala
- `POST /escala/gerar` — gera sugestões para janela (default 4 semanas). Body: `{ inicio?, semanas?, forcar?: { semanas?: [3,4] } }`
- `GET /escala` — lista alocações filtrando por data, profissional, local, status, horizonte.
- `PUT /escala/{id}` — ajusta alocação (manual/DnD), registra autor/motivo.
- `POST /escala/publicar` — publica eventos futuros marcados como do sistema. Body inclui range e confirmação dupla opcional para “limpar futuro e republicar”.
- `POST /escala/limpar-futuro` — remove eventos do sistema no futuro (não toca em eventos do Google). Requer confirmação dupla.
- `POST /escala/diff` — gera diff entre proposta e agenda atual (para revisão).

## Sábados Savassi/Lourdes
- `POST /sabados` — lança escala manual mensal (local, data, turno, profissional).
- `POST /sabados/troca` — registra troca entre profissionais (data, turno, local/sala, origem/destino, motivo).
- `GET /sabados` — consulta escala/trocas.

## Prompts e replanejamento
- `POST /prompts` — executa prompt de ajuste/geração. Body: `{ prompt: string }`. Retorna plano/diff para revisão.
- `GET /prompts` — histórico.

## Google Calendar
- `POST /calendar/sync` — lê agendas e traz conflitos.
- `POST /calendar/publish` — publica apenas o que foi aprovado (default: eventos com origem sistema e status revisado/ajustado).
- `POST /calendar/mark-conflict` — registra conflito detectado.

## Jobs
- `GET /jobs` — lista execuções (geração semanal, confirmação diária, sync).
- `POST /jobs/confirmacao-diaria` — força execução manual.

## Autenticação/Autorização
- Admin-only (JWT/session). Scopes: leitura/edição de cadastros, geração, publicação, trocas.

## Erros/códigos
- 400 validação (bloqueio violado, sobreposição, limite de horas).
- 409 conflito com Google ou duplicidade de sala/turno.
- 422 inconsistências bloqueantes na proposta.
- 503 quando job/serviço externo indisponível.
