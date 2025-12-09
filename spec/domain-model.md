# Modelo de Domínio

## Entidades principais
- **Profissional**
  - Campos: id, nome, email_agenda, turno_preferencial (manhã/tarde), dias_bloqueados, turnos_bloqueados, locais_preferidos/vetados, carga_semana_max (70h inicial), max_dobras_semana, tags, ativo.
  - Regras: não ultrapassar carga máxima; preferências são soft, bloqueios são hard; dobras limitadas por semana.
- **Local**
  - Campos: id, nome, endereço, região, prioridade_cobertura, ativo.
- **Sala**
  - Campos: id, local_id, nome_sala, ativo.
- **CapacidadeSala**
  - Campos: id, sala_id, dia_semana, turno, capacidade (1), restrições (ex.: requer treinador), data_especial (opcional para exceções).
  - Regras: pode variar por dia/turno e por semana via datas especiais.
- **PremissaGlobal**
  - Janela_planejamento (4 semanas), politicas_revezamento, distancia_repeticao_local, confirmacao_diaria (bool), limite_horas (default 70).
- **Alocacao**
  - Campos: id, profissional_id, local_id, sala_id, data, turno, origem (sistema/manual/google), status (gerado, revisado, confirmado, ajustado, manual), inseguranca (baixa/média/alta), metadata (pesos/heurística).
  - Regras: uma alocação por sala/turno; evitar duplicidade por profissional/turno; semanas futuras 3-4 podem ser marcadas como alta incerteza.
- **ExecucaoJob**
  - Campos: id, tipo (geracao semanal, confirmacao diaria, sync), status, iniciou_em, terminou_em, diff_resumo, log_path, autor (job/prompt/manual).
- **PromptHistory**
  - Campos: id, prompt_texto, resposta, data, autor, acao (gerar, ajustar, limpar futuro), diff_resumo, publicada (bool).
- **Troca**
  - Campos: id, data, turno, local_id/sala_id (se aplicável), profissional_origem_id, profissional_destino_id, motivo, origem (whatsapp/manual), status (registrada, aplicada).
  - Regras: validar conflitos e limites antes de aplicar; manter histórico.
- **AgendaGoogle**
  - Campos: id, profissional_id (ou geral), calendar_id, nome (ex.: “[Tetê Araújo] Camila”), ultima_sync, source_tag (`agendador`), pode_publicar (bool).
  - Observação: agendas são criadas/compartilhadas com o profissional; não dependem do e-mail principal como agenda nativa.
- **EventoCalendar**
  - Campos: id, agenda_id, alocacao_id (opcional), google_event_id, status (gravado, atualizado, conflito), origem (sistema/manual/google), data_sync.

## Particularidades de sábado (Savassi/Lourdes)
- Escala mensal é inserida manualmente (origem=manual, status=manual).
- Trocas entre profissionais são registradas como `Troca`; sistema valida conflitos e atualiza alocações/eventos (sem sobrescrever acordos sem confirmação).
- Jobs automáticos não reescrevem sábados dessas localidades; apenas leem para detectar conflitos.

## Restrições e validações
- Único profissional por sala/turno; sem sobreposição de turnos para a mesma pessoa.
- Respeitar bloqueios de dia/turno/local; preferências apenas como peso.
- Limitar horas semanais e número de dobras configurado.
- Destacar inconsistências: sobreposição, estouro de horas, violação de bloqueios, falta de sala, conflito com Google.
