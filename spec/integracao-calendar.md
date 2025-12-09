# Integração com Google Calendar

## Agendas
- Uma agenda adicional por profissional (nomeada, ex.: “[Tetê Araújo] Camila”), criada e compartilhada com ele; uma agenda geral de controle.
- Campo `source=agendador` nos eventos do sistema para identificar/limpar apenas o que foi gerado.

## Leitura (sync)
- Ler eventos futuros e recentes para detectar conflitos.
- Se houver conflito, o evento do Google prevalece; marcar status de conflito e logar.
- Não tocar em eventos manuais (sem `source=agendador`).

## Escrita (publish)
- Ação manual após revisão; escreve apenas eventos com origem sistema e status revisado/ajustado.
- Opção de limpar eventos futuros do sistema antes de republicar (dupla confirmação).
- Nunca apaga eventos passados; nunca altera eventos sem `source=agendador`.

## Sábados Savassi/Lourdes
- Entradas manuais; publicação segue registro manual. Jobs não sobrescrevem.

## Rate limits e lote
- Batch por agenda; respeitar limites da API; retries com backoff.

## Conflitos
- Tipos: sobreposição com evento manual, evento deletado no Google, alteração de horário.
- Resposta: manter evento do Google, marcar conflito e sugerir ajuste na escala.

## Segurança
- Credenciais via `.env`; escopos mínimos necessários.
- Tokens de acesso armazenados com proteção; callback OAuth configurado.
