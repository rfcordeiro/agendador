# Regras de Escala

## Objetivos da Alocação
- Revezar locais entre profissionais, minimizando repetições semana a semana.
- Balancear carga de horas e turnos preferenciais, evitando concentração em um único local.
- Cobrir todas as salas configuradas; identificar gaps e propor dobras quando necessário.
- Respeitar restrições individuais (dias/turnos proibidos, locais vetados) e preferências (turno/local).
- Exceção: sábados nas clínicas Savassi e Lourdes seguem escala combinada pelas profissionais; o sistema apenas registra e valida conflitos.

## Heurística Inicial (MVP)
- Round-robin ponderado por carga já alocada na janela de 4 semanas.
- Penalizar repetir o mesmo local na semana seguinte para a mesma profissional.
- Considerar preferências de turno/local como pesos positivos; restrições são bloqueios duros.
- Permitir no máximo N dobras/semana por profissional (configurável). Em dobra, tag “horas extras”.
- Limite semanal inicial de 70h por profissional (a ser reduzido conforme maturidade).
- Marcar incerteza crescente para semanas mais distantes; permitir fácil reexecução parcial (ex.: só semanas 3-4).
- Sábados Savassi/Lourdes: entrada manual de escala mensal; se houver troca entre profissionais, registrar a troca e validar conflitos.

## Regras de Capacidade
- Cada sala acomoda 1 profissional por turno.
- Capacidade de salas pode variar por dia/turno; semanas podem ter configurações diferentes.
- Locais com prioridade alta devem ser preenchidos antes; se faltar gente, listar gaps explicitamente.

## Restrições e Preferências de Profissionais
- Dias/turnos bloqueados (irrevogáveis) e turnos preferidos (flexíveis, mas registrar quando contrariados).
- Locais proibidos e preferidos.
- Limite de horas semanais (inicialmente até 70h, ajustável depois) e máximo de dobras configurável.
- Evitar dois turnos consecutivos em locais distantes (se houver metadado de distância/região).

## Confirmação e Ajustes
- Geração inicial cria estado “gerado”; confirmação diária lê Google Calendar e marca conflitos.
- Ajustes manuais via prompt ou UI (drag-and-drop) devem registrar autor, motivo e diferenças.
- Reexecução limpa apenas eventos futuros do sistema, nunca os do Google, salvo confirmação dupla.
- Destacar inconsistências de alocação (mesmo turno em dois locais, estouro de horas, violação de bloqueios) antes de publicar.
