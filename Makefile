BACKEND_DIR=backend
FRONTEND_DIR=frontend
VENV=$(BACKEND_DIR)/.venv
PY_BIN?=python3
PYTHON=$(VENV)/bin/python3
PIP=$(VENV)/bin/pip

.PHONY: help venv backend-install backend-run backend-test backend-migrate backend-superuser frontend-install frontend-dev compose-up compose-down compose-reset compose-migrate compose-superuser

help:
	@echo "Common commands:"
	@echo "  make backend-install   # create venv and install backend deps"
	@echo "  make backend-run       # run Django dev server"
	@echo "  make backend-test      # run backend tests"
	@echo "  make backend-migrate   # apply migrations (local sqlite by default)"
	@echo "  make frontend-install  # install frontend deps"
	@echo "  make frontend-dev      # run frontend dev server"
	@echo "  make compose-up        # start stack with docker-compose"

$(VENV):
	$(PY_BIN) -m venv $(VENV)

backend-install: $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt

backend-run: backend-install
	$(PYTHON) backend/manage.py runserver 0.0.0.0:8000

backend-test: backend-install
	$(PYTHON) backend/manage.py test

backend-migrate: backend-install
	$(PYTHON) backend/manage.py migrate

backend-superuser: backend-install
	$(PYTHON) backend/manage.py createsuperuser

frontend-install:
	cd $(FRONTEND_DIR) && npm install

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev -- --host --port 5173

compose-up:
	docker compose up --build

compose-down:
	docker compose down

compose-reset:
	docker compose down -v --remove-orphans && docker compose up -d --build

compose-migrate:
	docker compose exec backend python manage.py migrate

compose-superuser:
	docker compose exec backend python manage.py createsuperuser
