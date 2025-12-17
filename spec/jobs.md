# Jobs e Rotinas

## Celery / Filas
- Filas dedicadas: `calendar_sync`, `calendar_publish`, `calendar_webhook`, `dead_letter`.
- Celery beat agenda rotinas: renovação de webhooks, fallback de polling para agendas vencidas, geração semanal e confirmação diária.
- Locks por agenda (Redis/DB) para evitar execuções concorrentes; TTL curto alinhado à duração esperada do sync.
- Retries com backoff e jitter; mover para `dead_letter` após limite configurado, com alerta.

## Geração semanal (sábado)
- Tarefa: gerar sugestão para próximas 4 semanas (rolling).
- Entrada: data de início (default próximo domingo), número de semanas (4), opções de forçar semanas 3-4.
- Saída: propostas de alocação com pesos/insegurança; diff com agenda atual; inconsistências listadas.
- Não publica automaticamente; aguarda revisão/aprovação.
- Não altera sábados Savassi/Lourdes (só lê para conflito).

## Confirmação diária
- Tarefa: ler Google Calendar, marcar conflitos (Google prevalece), atualizar estados (confirmado/ajustado).
- Saída: lista de inconsistências, gaps e eventos divergentes.
- Pode ser disparado manualmente.

## Sync/Publish Google
- `sync_calendar`: leitura incremental por agenda (trigger: webhook ou polling). Respeita rate limit, persiste `sync_token`, marca conflitos e estado do webhook.
- `publish_calendar`: opcional/manual; escreve apenas eventos revisados/ajustados; pode limpar futuro do sistema com dupla confirmação.
- Botão de “forçar sync” apenas para admin dispara `sync_calendar` imediato (by calendar ou por evento).
- Renovação de webhooks: task periódica que reabre canais próximos do `expiration`; se falhar, marca agenda para polling.

## Monitoramento/alertas
- Log estruturado por job (início, fim, duração, contagem de eventos, conflitos).
- Métricas por agenda: tempo desde último webhook, último sync, falhas consecutivas, eventos processados.
- Alertas: falha de job, excesso de inconsistências, rate limit do Google, tentativa de sobrescrever sábado manual, webhook expirado sem fallback.

## Rotina de limpeza
- Remover propostas antigas e logs/diffs após X dias (configurável), mantendo histórico de decisões.
- Limpar canais de webhook expirados e registrar revogação na agenda.
