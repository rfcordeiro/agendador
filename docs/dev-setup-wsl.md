# Ambiente de desenvolvimento no WSL (Ubuntu limpo)

Passo a passo para preparar o ambiente local em WSL (Ubuntu) do zero.

## Pré-requisitos
- Windows 10/11 com WSL2 instalado e distro Ubuntu configurada.
- Acesso à internet e permissão para instalar pacotes.

## Instalar dependências de sistema
```bash
sudo apt-get update
sudo apt-get install -y build-essential git curl \
  python3.12 python3.12-venv python3.12-dev \
  libpq-dev pkg-config
```

### Node.js 20 (NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

### (Opcional) Docker/Compose no WSL
- Se for usar Docker local: instale Docker Desktop (Windows) ou o Docker Engine no WSL:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  ```
  Reabra o shell e teste com `docker ps` / `docker compose version`.

## Clonar o repositório
```bash
git clone https://github.com/<org>/<repo>.git
cd <repo>
```

## Backend (Django/DRF)
```bash
make backend-install-dev   # venv + deps (pip)
make backend-migrate       # SQLite por padrão
make backend-run           # http://localhost:8000/health
# checagens
make backend-lint
make backend-typecheck
make backend-test
```

## Frontend (React/Vite/TypeScript)
```bash
make frontend-install
make frontend-dev          # http://localhost:5173
# checagens
make frontend-lint
make frontend-typecheck
npm test -- --runInBand
```

## Compose (stack completa)
```bash
make compose-up
make compose-migrate
# Depois, para encerrar:
make compose-down
```

## Variáveis de ambiente
- Copie `.env.example` para `.env` (se existir) e ajuste conforme necessário.
- Para usar Postgres local, exporte `POSTGRES_*` antes de rodar `make backend-migrate/run`.

## Dicas
- Se o VS Code for usado, instale extensões de Python e ESLint/Prettier, apontando para a venv `.venv`.
- Rodar `make backend-format` e `npm run format` antes de commitar ajuda a manter o padrão.
