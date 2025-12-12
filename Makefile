BACKEND_DIR=backend
FRONTEND_DIR=frontend
VENV=$(BACKEND_DIR)/.venv
REQ_DEV=$(BACKEND_DIR)/requirements-dev.txt
PY_BIN?=python3
PYTHON=$(VENV)/bin/python3
PIP=$(PYTHON) -m pip
RUFF=$(VENV)/bin/ruff
MYPY=$(VENV)/bin/mypy

.PHONY: help venv backend-install backend-install-dev backend-run backend-test backend-migrate backend-superuser backend-lint backend-format backend-typecheck frontend-install frontend-dev frontend-lint frontend-format frontend-typecheck compose-up compose-down compose-reset compose-migrate compose-makemigrations compose-superuser compose-backend-lint compose-backend-format compose-backend-typecheck compose-frontend-lint compose-frontend-format compose-frontend-typecheck

help:
	@echo "Comandos comuns:"
	@echo "  make backend-install      # cria venv e instala deps do backend"
	@echo "  make backend-install-dev  # instala deps de dev (ruff/mypy/pytest)"
	@echo "  make backend-run          # servidor Django dev"
	@echo "  make backend-test         # testes do backend"
	@echo "  make backend-migrate      # aplica migrations (SQLite por padrao)"
	@echo "  make backend-superuser    # cria superusuario"
	@echo "  make backend-lint         # lint com ruff"
	@echo "  make backend-format       # format com ruff"
	@echo "  make backend-typecheck    # mypy"
	@echo "  make frontend-install     # instala deps do frontend"
	@echo "  make frontend-dev         # servidor Vite"
	@echo "  make frontend-lint        # eslint"
	@echo "  make frontend-format      # prettier"
	@echo "  make frontend-typecheck   # tsc --noEmit"
	@echo "  make compose-up           # sobe stack (backend/frontend/db/redis)"
	@echo "  make compose-down         # derruba stack"
	@echo "  make compose-reset        # reseta volumes e sobe novamente"
	@echo "  make compose-makemigrations # cria migrations dentro do container backend"
	@echo "  make compose-migrate      # migrations dentro do container backend"
	@echo "  make compose-superuser    # superusuario dentro do container backend"
	@echo "  make compose-backend-lint # lint do backend dentro do container"
	@echo "  make compose-backend-format # format do backend dentro do container"
	@echo "  make compose-backend-typecheck # mypy dentro do container"
	@echo "  make compose-frontend-lint # eslint dentro do container"
	@echo "  make compose-frontend-format # prettier dentro do container"
	@echo "  make compose-frontend-typecheck # tsc --noEmit dentro do container"

$(VENV):
	$(PY_BIN) -m venv $(VENV)

backend-install: $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt

backend-install-dev: backend-install
	$(PIP) install -r $(REQ_DEV)

backend-run: backend-install
	$(PYTHON) backend/manage.py runserver 0.0.0.0:8000

backend-test: backend-install
	$(PYTHON) backend/manage.py test

backend-migrate: backend-install
	$(PYTHON) backend/manage.py migrate

backend-superuser: backend-install
	$(PYTHON) backend/manage.py createsuperuser

backend-lint: backend-install-dev
	$(RUFF) check backend

backend-format: backend-install-dev
	$(RUFF) format backend

backend-typecheck: backend-install-dev
	$(MYPY) backend/src backend/manage.py

frontend-install:
	cd $(FRONTEND_DIR) && npm install

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev -- --host --port 5173

frontend-lint:
	cd $(FRONTEND_DIR) && npm run lint

frontend-format:
	cd $(FRONTEND_DIR) && npm run format

frontend-typecheck:
	cd $(FRONTEND_DIR) && npm run typecheck

compose-up:
	docker compose up --build

compose-down:
	docker compose down

compose-reset:
	docker compose down -v --remove-orphans && docker compose up -d --build

compose-makemigrations:
	docker compose exec backend python manage.py makemigrations

compose-migrate:
	docker compose exec backend python manage.py migrate

compose-superuser:
	docker compose exec backend python manage.py createsuperuser

compose-backend-lint:
	docker compose run --rm \
		-v $(shell pwd)/ruff.toml:/app/ruff.toml:ro \
		backend sh -c "pip install -r requirements-dev.txt && ruff check ."

compose-backend-format:
	docker compose run --rm \
		-v $(shell pwd)/ruff.toml:/app/ruff.toml:ro \
		backend sh -c "pip install -r requirements-dev.txt && ruff format ."

compose-backend-typecheck:
	docker compose run --rm \
		-v $(shell pwd)/mypy.ini:/app/mypy.ini:ro \
		backend sh -c "pip install -r requirements-dev.txt && mypy --config-file mypy.ini src manage.py"

compose-frontend-lint:
	docker compose run --rm frontend npm run lint

compose-frontend-format:
	docker compose run --rm frontend npm run format

compose-frontend-typecheck:
	docker compose run --rm frontend npm run typecheck
