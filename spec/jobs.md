# Jobs e Rotinas

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
- `sync`: leitura batch por agenda, respeitando rate limit; marca eventos do sistema e conflitos.
- `publish`: opcional/manual; escreve apenas eventos revisados/ajustados; pode limpar futuro do sistema com dupla confirmação.

## Monitoramento/alertas
- Log estruturado por job (início, fim, duração, contagem de eventos, conflitos).
- Alertas: falha de job, excesso de inconsistências, rate limit do Google, tentativa de sobrescrever sábado manual.

## Rotina de limpeza
- Remover propostas antigas e logs/diffs após X dias (configurável), mantendo histórico de decisões.
