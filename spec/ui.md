# UI e Fluxos (dashboard)

## Componentes
- Calendário geral com legenda de status (gerado, revisado, confirmado, ajustado, manual) e cores por horizonte.
- Quadro drag-and-drop para editar alocações (incluindo lançamentos de sábado Savassi/Lourdes).
- Painel de inconsistências (sobreposição, bloqueio, estouro de horas, conflitos Google).
- Prompt box com templates e pré-visualização de diff.
- Diff viewer entre proposta e agenda atual.
- Botões de ação: gerar, reexecutar, aprovar/publicar no Google, limpar futuro (dupla confirmação).

## Fluxo de edição manual
1) Selecionar intervalo; editar por drag-and-drop ou formulário.
2) Salvar alterações com autor/motivo; atualizar estado para “ajustado” ou “manual”.
3) Revisar inconsistências; só então aprovar/publicar.

## Fluxo de publicação
1) Selecionar semanas/turnos a publicar.
2) Revisar diff; dupla confirmação se envolver limpar eventos futuros do sistema.
3) Publicar; status dos eventos passa para confirmado/gravado.

## Prompts
- Templates sugeridos:
  - “Balancear horas desta semana”
  - “Preencher gaps só com quem aceita dobra”
  - “Trocar locais de Ana e Bia na próxima terça à tarde”
  - “Refazer semanas 3-4 ignorando preferências de local”
- Execução gera plano/diff; admin aprova ou descarta.

## Sábados Savassi/Lourdes
- Formulário para lançar escala mensal (data, turno, local, profissional).
- Registrar trocas entre profissionais; validar conflitos; marcar origem (WhatsApp/manual).
- Visual destacado para garantir que jobs automáticos não sobrescrevem essas entradas.
