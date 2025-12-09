BACKEND_DIR=backend
FRONTEND_DIR=frontend
VENV=$(BACKEND_DIR)/.venv
PY_BIN?=python3
PYTHON=$(VENV)/bin/python3
PIP=$(VENV)/bin/pip

.PHONY: help venv backend-install backend-run backend-test backend-migrate frontend-install frontend-dev compose-up compose-down

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

frontend-install:
	cd $(FRONTEND_DIR) && npm install

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev -- --host --port 5173

compose-up:
	docker compose up --build

compose-down:
	docker compose down
