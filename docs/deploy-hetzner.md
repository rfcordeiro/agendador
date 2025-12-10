# Deploy em Hetzner (staging e produção)

Guia para preparar as VMs (Hetzner) e usar os workflows do GitHub Actions para staging e produção.

## Visão geral dos workflows
- `ci.yml`: lint/type/test backend e frontend em `push`/`pull_request` (branches `master` e `feature/*`).
- `deploy-staging.yml`: build/push imagens no GHCR e deploy automático em staging ao dar push na `master` (também pode ser disparado manualmente).
- `deploy-prod.yml`: build/push imagens no GHCR e deploy manual para produção via `workflow_dispatch` (com ambiente protegido).

Imagens publicadas:
- Backend: `ghcr.io/<org>/agendador-backend:{staging|prod}-{sha}`, `{staging|prod}-latest`
- Frontend: `ghcr.io/<org>/agendador-frontend:{staging|prod}-{sha}`, `{staging|prod}-latest`

## Preparar cada VM (staging e produção)
1) Criar VM Ubuntu 22.04/24.04 na Hetzner:
   - Defina hostname (ex.: `agendador-stg` / `agendador-prod`).
   - Anexe sua chave SSH pública.
   - Abra portas necessárias (HTTP/HTTPS/SSH) no firewall da Hetzner.
2) Acessar via SSH e preparar ambiente:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   sudo apt-get install -y git ca-certificates curl gnupg
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # Reabra o shell para aplicar o grupo docker
   docker --version && docker compose version
   ```
3) Criar diretório da app e clonar o repo (se privado, use token com scope `repo`):
   ```bash
   mkdir -p ~/agendador
   git clone https://github.com/<org>/<repo>.git ~/agendador
   ```
   > Os workflows atualizam o código via `git fetch/reset`. Se o repo for privado, configure um PAT em `~/.git-credentials` ou passe via secrets `REPO_READ_TOKEN`.
4) Configurar `.env` (o Actions escreve este arquivo a cada deploy, mas você pode validar antes):
   - Backend: `SECRET_KEY`, `POSTGRES_*`, `REDIS_*`, URLs, credenciais Google, etc.
   - Frontend: variáveis de API (se necessárias).
5) Storage e volumes:
   - O `docker-compose.yml` cria volume `pgdata`. Certifique-se de ter espaço em disco e backups para produção.

## Secrets necessários no GitHub (Settings > Secrets and variables > Actions)
Comuns (GHCR):
- `GHCR_USER`: usuário para `docker login` no host (pode ser o mesmo do repo).
- `GHCR_TOKEN`: token/PAT com permissão de `read:packages` para pull no host.
- `REPO_READ_TOKEN`: (opcional) PAT com permissão de leitura do repo, se privado.

Staging:
- `HETZNER_STAGING_HOST`: IP ou hostname.
- `HETZNER_STAGING_USER`: usuário SSH (ex.: `root` ou `deploy` no grupo `docker`).
- `HETZNER_STAGING_SSH_KEY`: chave privada para SSH.
- `STAGING_ENV_FILE`: conteúdo completo do `.env` (multilinha).

Produção:
- `HETZNER_PROD_HOST`, `HETZNER_PROD_USER`, `HETZNER_PROD_SSH_KEY`.
- `PROD_ENV_FILE`: conteúdo do `.env` de produção (multilinha).

## Fluxo de deploy
1) Staging: push na `master` → `deploy-staging.yml` builda/pusha imagens → conecta na VM staging, atualiza o repo, grava `.env` com `STAGING_ENV_FILE`, gera `docker-compose.override.yml` com tags de staging, roda `docker compose pull && docker compose up -d`.
2) Produção: acione `Deploy Production` via `workflow_dispatch` (opcional input `ref`). Build/push imagens com tags de prod → conecta na VM prod, atualiza repo, grava `.env` com `PROD_ENV_FILE`, gera override com tags de prod e sobe com `docker compose up -d`.

## Troubleshooting rápido
- Falha de pull no host: verifique `docker login ghcr.io` e validade de `GHCR_TOKEN`.
- Repo privado: confirme `REPO_READ_TOKEN` e se o git remoto no host usa o token.
- Compose não encontra imagem: cheque se as tags (`staging-<sha>` / `prod-<sha>`) foram publicadas e se o host tem acesso.
- Portas não abrindo: revise firewall da Hetzner e regras locais (ufw/firewalld).
