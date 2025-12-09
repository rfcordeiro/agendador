# Operação e Implantação

## Desenvolvimento
- Rodar via Docker Compose (web, worker, db, redis). Scripts/Makefile recomendados: `make dev` (subir stack), `make migrate`, `make test`, `make lint`.
- Variáveis em `.env` (copiar de `.env.example`): credenciais Postgres/Redis, chaves Google API, URLs de callback OAuth.
- Seeds opcionais para profissionais, locais e salas de exemplo.

## Produção (VPS Hetzner)
- Desplegar com Compose ou systemd; separar processos web e worker. Publicação em agendas pode ser mantida manual (botão no dashboard) mesmo em produção.
- Backups automáticos do Postgres; snapshots semanais do diretório de configuração.
- Rotacionar logs; monitorar jobs de geração e sincronização (alerta se falhar).

## Rotinas
- Job semanal (sábado) para gerar 4 semanas (como sugestão); job diário para confirmação e sync com Google Calendar.
- Publicação em agendas é opcional/manual, recomendada após revisão de inconsistências. Entradas de sábado (Savassi/Lourdes) são manuais e não devem ser sobrescritas.
- Replanejamento manual pode ser feito a qualquer momento via dashboard/prompt; requer dupla confirmação para apagar eventos futuros gerados pelo sistema.

## Segurança/Conformidade
- Sem dados sensíveis de pacientes; ainda assim, proteger credenciais e restringir acesso ao dashboard a admins autenticados.
- Auditoria: registrar ações de geração, prompts executados e alterações manuais.
