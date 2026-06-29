.PHONY: help up down build logs migrate seed test lint format ollama-pull minio-init status

DOCKER=docker compose

help:
	@echo ""
	@echo "  BV Reader AI — Dev Commands"
	@echo "  ─────────────────────────────────"
	@echo "  up            Start all services (dev)"
	@echo "  down          Stop all services"
	@echo "  build         Rebuild all Docker images"
	@echo "  logs          Follow combined log output"
	@echo "  migrate       Run Alembic migrations"
	@echo "  seed          Seed initial admin user"
	@echo "  test          Run backend test suite"
	@echo "  lint          Lint backend (ruff)"
	@echo "  format        Format backend (ruff format)"
	@echo "  ollama-pull   Pull llama3.1:8b model into Ollama"
	@echo "  minio-init    Create MinIO bucket"
	@echo "  status        Show running container status"
	@echo ""

up:
	@cp -n .env.example .env 2>/dev/null && echo "Created .env from .env.example" || true
	$(DOCKER) up -d
	@echo "\n  App running at http://localhost"
	@echo "  MinIO console at http://localhost:9001\n"

down:
	$(DOCKER) down

build:
	$(DOCKER) build --no-cache

logs:
	$(DOCKER) logs -f

migrate:
	$(DOCKER) exec backend alembic upgrade head

seed:
	$(DOCKER) exec backend python -m app.db.seed

test:
	$(DOCKER) exec backend pytest tests/ -v --tb=short

lint:
	$(DOCKER) exec backend ruff check app/

format:
	$(DOCKER) exec backend ruff format app/

ollama-pull:
	$(DOCKER) exec ollama ollama pull llama3.1:8b

minio-init:
	$(DOCKER) exec backend python -m app.db.minio_init

status:
	$(DOCKER) ps

shell-backend:
	$(DOCKER) exec -it backend bash

shell-frontend:
	$(DOCKER) exec -it frontend sh

shell-db:
	$(DOCKER) exec -it postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}
