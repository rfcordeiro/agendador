# Heurística de Geração (MVP)

## Objetivos
- Cobrir todas as salas/turnos configurados, evitando gaps.
- Revezar locais por profissional, minimizando repetição da semana anterior.
- Balancear carga de horas (limite inicial 70h/semana; alvo configurável) e dobras (limite por profissional).
- Respeitar bloqueios duros (dias/turnos/locais vetados) e considerar preferências como pesos.

## Abordagem inicial
- Round-robin ponderado:
  - Peso negativo para repetir o mesmo local na semana seguinte.
  - Peso positivo para preferência de turno/local.
  - Penalidade por ultrapassar alvo de horas; bloqueio por limite máximo.
  - Penalidade forte para dobras; permitir apenas se houver gap.
- Marcar semanas 3-4 com incerteza maior; fácil reexecução parcial.

## Regras especiais
- Sábados Savassi/Lourdes: alocações manuais não são tocadas; se houver falta, apenas sinalizar gap.
- Distância/Região (opcional): evitar dois turnos consecutivos em regiões distantes.

## Inconsistências a detectar
- Sobreposição de profissional no mesmo turno.
- Violação de bloqueios de dia/turno/local.
- Estouro de horas semanais ou de dobras.
- Falta de sala/turno configurado.
- Conflito com eventos já existentes no Google.

## Saídas
- Lista de alocações propostas com pesos e motivo (por transparência).
- Diff contra agenda atual.
- Lista de inconsistências e sugerir ações (trocar profissional, abrir dobra, deixar gap explícito).
