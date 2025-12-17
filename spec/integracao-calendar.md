# Integração com Google Calendar

## Escopo de agendas
- Uma agenda geral de controle por ambiente (dev/stg/prod) com nome/ID vindos de variáveis de ambiente.
- Uma agenda por profissional e uma por sala de cada clínica; locais e associações não têm agenda própria no momento.
- Campo de identificação em eventos (`source=agendador` em `extendedProperties.private`) para filtrar apenas o que é do sistema.

## Fonte de verdade e estado
- Backend é a fonte de verdade das alocações; calendários são espelhos e pontos de captura de ajustes manuais.
- Guardar por agenda: `sync_token`, `etag` dos eventos, `last_synced_at`, `status` (ok, needs_reauth, webhook_expired), `error_message`.
- Guardar por evento: `external_id`, `etag`, `origem` (sistema/manual/google), `last_synced_at`, `source_of_truth`.

## Estratégia de sincronismo
- Preferência por push (webhooks) com fallback de polling incremental.
- Incremental usa `syncToken` por agenda; primeira execução faz janela completa (futuro + últimos 30-60 dias). Se o token expirar, faz resync completo controlado.
- Idempotência: comparar `etag`/`updated` antes de gravar; não sobrescrever eventos sem `source=agendador`.

## Webhooks (primário)
- Um canal por agenda. Armazenar `channel_id`, `resource_id`, `expiration`, `token` (nonce), `last_webhook_at`.
- Endpoint dedicado valida assinatura/token e empilha `sync_calendar(calendar_id, reason=webhook)` no Celery.
- Rotina de renovação periódica (antes de `expiration`); se falhar, marca `webhook_expired` e aciona polling.
- Autorização: headers de verificação + comparação de `resource_id`; rejeitar callbacks desconhecidos.

## Polling (fallback)
- Celery beat agenda job a cada N minutos (ex.: 10) para agendas com webhook expirado ou desativado.
- Limite por execução (ex.: 100 eventos/agendas) e backoff exponencial em rate limit/409.

## Escrita (publish)
- Ação manual após revisão; escreve apenas eventos com origem sistema e status revisado/ajustado.
- Pode opcionalmente limpar eventos futuros do sistema antes de republicar (dupla confirmação).
- Nunca apaga eventos passados; nunca altera eventos sem `source=agendador`.

## Conflitos e política
- Conflitos: sobreposição com evento manual, evento deletado/alterado no Google, mudança de horário/participante.
- Regra: prevalece o evento do Google para evitar perda de edição manual; registrar conflito e sugerir ajuste na escala.
- Botão de “forçar sync” só para admin; dispara leitura pontual da agenda/evento e reprocessa estado.

## Rate limits e lote
- Batch por agenda; respeitar limites da API; retries com backoff e jitter.
- Locks por agenda (Redis/DB) para evitar sync concorrente na mesma agenda.

## Segurança
- Credenciais e IDs de agendas via variáveis de ambiente (`.env` em dev; secrets no GitHub Actions para stg/prod).
- Tokens de acesso/refresh armazenados com criptografia; escopos mínimos.
- Sanitizar logs: não registrar conteúdo de eventos, apenas metadados de sync.
