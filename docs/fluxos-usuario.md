# Fluxos de Usuário (Admins)

## Cadastro Inicial
1. Cadastrar locais e salas, incluindo capacidade por dia/turno e datas especiais.
2. Cadastrar profissionais com disponibilidade, preferências e restrições.
3. Definir premissas globais (janela de 4 semanas, limites de dobras, regras de revezamento).

## Geração Semanal (automática aos sábados)
1. Job lê Google Calendar (todas agendas) para coletar conflitos existentes.
2. Gera escala para 4 semanas à frente com heurística atual, marcando inconsistências (dobras, bloqueios, sobreposições).
3. Mostra diff/sugestão no dashboard; nada é publicado sem revisão.
4. Salva snapshot e logs da execução.
5. Sábados Savassi/Lourdes: manter entrada manual; job não sobrescreve o que foi lançado/validado manualmente.

## Confirmação Diária
1. Sincronizar com Google Calendar; se houver conflitos, Google prevalece.
2. Marcar conflitos e gaps no dashboard com destaque; sugerir dobras quando necessário.
3. Publicação em agendas pode ser manual (ação do admin) após revisar inconsistências.

## Replanejamento por Prompt
1. Admin insere prompt no dashboard (ex.: “Refaça semana 2 priorizando turno da manhã para Ana”).
2. Sistema interpreta, reexecuta geração (total ou parcial) e mostra diff antes de gravar.
3. Confirmação dupla para apagar/regenerar eventos futuros; nunca apaga eventos do Google sem autorização explícita.
4. Exemplos de prompts: “Balancear horas desta semana”, “Preencher gaps só com quem aceita dobra”, “Trocar locais de Ana e Bia na próxima terça à tarde”, “Refazer semanas 3-4 ignorando preferências de local”.
5. Aprovação: admin revisa diff, resolve inconsistências, então escolhe publicar (ou não) no Google.

## Publicação no Google
1. Após revisão/diff sem inconsistências bloqueadoras, admin aciona publicação manual.
2. Sistema escreve/atualiza apenas eventos futuros marcados como do sistema; nunca altera eventos do Google criados manualmente.
3. Opção de apagar eventos futuros do sistema antes de republicar exige dupla confirmação.

## Ajustes Manuais
- Edição pontual direto no Google Calendar é permitida; sistema lê no próximo sync e respeita.
- Ajustes na UI (drag-and-drop estilo quadro) devem registrar autor, data e motivo.
- Edição manual da escala antes da publicação em agendas é incentivada para resolver inconsistências.
- Trocas de sábado (Savassi/Lourdes) entre profissionais são lançadas manualmente; o sistema apenas registra e valida conflitos.
