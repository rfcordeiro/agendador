# Requisitos Funcionais

## Cadastros
- Profissionais: nome, email (para agenda), turno preferencial, dias/turnos indisponíveis, locais proibidos/preferidos, carga semanal alvo (até 70h inicialmente, para ser reduzido depois), máximo de dobras/semana, tags (treinador, júnior, etc.).
- Locais: nome, endereço, zonas/áreas, prioridade de cobertura, salas configuráveis por dia/turno (ex.: seg manhã 2 salas, seg tarde 1 sala).
- Salas: identificador local + sala, capacidade (1 prof), restrições (ex.: somente treinador).
- Premissas globais: política de revezamento, distância mínima entre repetições no mesmo local, janela de planejamento (4 semanas), confirmação diária.
- Sábados (Savassi e Lourdes): importação/lançamento manual da escala enviada pelas profissionais; registrar trocas acordadas entre profissionais.

## Geração e Ajustes de Escala
- Geração semanal automática todo sábado (rolling 4 semanas) como sugestão; publicação em agenda é ação manual (após revisão/diff).
- Heurística inicial: round-robin ponderado, evitando repetir o mesmo local da semana anterior e balanceando horas entre profissionais.
- Permitir dobras pontuais para cobrir gaps, respeitando limite de dobras/semana por profissional.
- Estados: gerado → revisado → confirmado diário; replanejamento dispara regeneração apenas do futuro (com confirmação).
- Detecção e destaque de inconsistências: profissional em dois locais no mesmo turno, estouro de horas/semana, quebra de bloqueios.
- Edição manual suportada via UI (drag-and-drop) e respeitada nas próximas gerações.
- Sábados Savassi/Lourdes: entrada manual de escala completa do mês; trocas pontuais registradas (sem sobrescrever o acordo entre profissionais).

## Integração Google Calendar
- Leitura de eventos existentes para detectar conflitos.
- Escrita de eventos gerados; atualização e deleção apenas para eventos futuros e marcados como do sistema, disparadas manualmente após aprovação.
- Em conflito, prevalece o evento do Google; logar divergências. Opção de “apagar futuro e regerar” com dupla confirmação.

## Dashboard e Estatísticas
- Visão geral por janela de tempo (passado/futuro): alocações por profissional e por local, carga de horas, dobras, gaps (salas sem cobertura), conflitos e inconsistências.
- Colorir horizonte conforme distância: semana atual, próximas 2 semanas, semanas 3-4 (maior incerteza).
- Filtros por profissional, local, turno, status (gerado/confirmado/ajustado).

## Replanejamento via Prompt
- Campo de prompt no dashboard que envia instruções para o motor (Codex) para regerar ou ajustar a escala.
- Histórico de prompts e execuções armazenado (texto) para auditoria e replays.
- Sugestões de comandos pré-prontos (ex.: “Balancear horas desta semana”, “Refazer próxima semana ignorando preferências de turno”, “Preencher gaps só com quem aceita dobra”).
- Fluxo de aprovação: prompt gera plano/diff; admin revisa e decide publicar (ou não) nas agendas.

## Não Funcionais
- Usabilidade simples: operações guiadas e confirmadas; sem dependência de linha de comando para admins; destaque visual forte para conflitos.
- Observabilidade: logs dos jobs de geração, conflitos com Google Calendar, e ações de ajuste manual.
- Persistência em PostgreSQL; performance suficiente para replanejar 4 semanas rapidamente.
