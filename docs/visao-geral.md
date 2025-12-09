# Visão Geral

- **Objetivo**: gerar e manter a escala semanal da clínica Tetê Araújo, olhando ~4 semanas à frente e confirmando diariamente, como apoio (não automação completa) para admins ajustarem manualmente.
- **Atores**: administradores internos operam o sistema; profissionais apenas visualizam suas agendas no Google Calendar. Há uma agenda geral de controle.
- **Contexto**: turnos de 6h (manhã/tarde), com possibilidade de dobra ocasional. Locais podem ter múltiplas salas e capacidades variáveis por dia/turno.
- **Horizon scanning**: rotina automática todo sábado para sugerir/ajustar as próximas 4 semanas, com possibilidade de replanejar a qualquer momento; publicação em agendas pode ser acionada manualmente.
- **Interface**: dashboard web para cadastros, visualização, edição manual (drag-and-drop estilo quadro) e replanejamento via prompts (Codex). Geração é revisada antes de publicar, com detecção evidente de inconsistências (ex.: profissional em dois locais no mesmo turno) e respeito aos conflitos com o Google Calendar.
- **Sábados Savassi/Lourdes**: escala é combinada entre as profissionais (via WhatsApp) e lançada manualmente pelo admin; trocas acordadas são apenas registradas no sistema.

## Integração com Google Calendar
- Uma agenda adicional por profissional (nomeada, ex.: “[Tetê Araújo] Camila”) + uma agenda geral de controle; agendas são compartilhadas com cada profissional, não dependem do e-mail principal dele.
- Leitura e escrita bidirecional. Em caso de conflito, o Google Calendar é a fonte de verdade (passado e futuro).
- Possibilidade de apagar/regerar apenas eventos futuros mediante confirmação forte; eventos passados nunca são apagados pelo sistema.

## Principais Entidades
- **Profissional**: disponibilidade, preferências de turno, dias/locais bloqueados, limites semanais (inicialmente até 70h, a ajustar), histórico recente.
- **Local/Sala**: capacidade por dia e turno, datas/turnos especiais, restrições de equipe.
- **Escala**: alocação de profissional → local → sala → turno, com estado (gerado, confirmado, ajustado) e fonte (sistema, manual/Google).
