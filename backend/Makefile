# =============================================================================
# ActNexus Backend - Makefile
# =============================================================================

.PHONY: help install dev test lint format clean docker-up docker-down migrate setup

# Default target
.DEFAULT_GOAL := help

# Variables
PYTHON := python3
PIP := pip
PYTEST := pytest
BLACK := black
ISORT := isort
FLAKE8 := flake8
MYPY := mypy
ALEMBIC := alembic
DOCKER_COMPOSE := docker-compose

# Help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Setup and Installation
setup: ## Run initial setup script
	./setup.sh

install: ## Install dependencies
	$(PYTHON) -m venv venv
	. venv/bin/activate && $(PIP) install --upgrade pip
	. venv/bin/activate && $(PIP) install -r requirements.txt

install-dev: install ## Install development dependencies
	. venv/bin/activate && $(PIP) install pytest-cov coverage

# Development
dev: ## Start development server
	. venv/bin/activate && $(PYTHON) -m app.main

dev-reload: ## Start development server with auto-reload
	. venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

shell: ## Start Python shell with app context
	. venv/bin/activate && $(PYTHON) -c "from app.main import app; import IPython; IPython.embed()"

# Database
migrate: ## Run database migrations
	. venv/bin/activate && $(ALEMBIC) upgrade head

migration: ## Create new migration (usage: make migration MESSAGE="description")
	. venv/bin/activate && $(ALEMBIC) revision --autogenerate -m "$(MESSAGE)"

db-reset: ## Reset database (WARNING: destroys all data)
	. venv/bin/activate && $(ALEMBIC) downgrade base
	. venv/bin/activate && $(ALEMBIC) upgrade head

db-seed: ## Seed database with test data
	. venv/bin/activate && $(PYTHON) -m app.scripts.seed_data

# Testing
test: ## Run all tests
	. venv/bin/activate && $(PYTEST)

test-unit: ## Run unit tests only
	. venv/bin/activate && $(PYTEST) -m "unit"

test-integration: ## Run integration tests only
	. venv/bin/activate && $(PYTEST) -m "integration"

test-e2e: ## Run end-to-end tests only
	. venv/bin/activate && $(PYTEST) -m "e2e"

test-cov: ## Run tests with coverage report
	. venv/bin/activate && $(PYTEST) --cov=app --cov-report=html --cov-report=term

test-watch: ## Run tests in watch mode
	. venv/bin/activate && $(PYTEST) -f

# Code Quality
lint: ## Run all linting tools
	. venv/bin/activate && $(FLAKE8) app/
	. venv/bin/activate && $(MYPY) app/

format: ## Format code with black and isort
	. venv/bin/activate && $(BLACK) app/
	. venv/bin/activate && $(ISORT) app/

format-check: ## Check code formatting
	. venv/bin/activate && $(BLACK) --check app/
	. venv/bin/activate && $(ISORT) --check-only app/

flake8: ## Run flake8 linter
	. venv/bin/activate && $(FLAKE8) app/

mypy: ## Run mypy type checker
	. venv/bin/activate && $(MYPY) app/

# Docker
docker-build: ## Build Docker image
	$(DOCKER_COMPOSE) build

docker-up: ## Start all services with Docker
	$(DOCKER_COMPOSE) up -d

docker-up-dev: ## Start development services with Docker
	$(DOCKER_COMPOSE) up -d postgres minio redis

docker-down: ## Stop all Docker services
	$(DOCKER_COMPOSE) down

docker-logs: ## Show Docker logs
	$(DOCKER_COMPOSE) logs -f

docker-clean: ## Clean Docker containers and volumes
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -f

# Production
build: ## Build production image
	$(DOCKER_COMPOSE) build --target production

deploy: ## Deploy to production (customize as needed)
	@echo "Customize this target for your deployment process"

# Utilities
clean: ## Clean temporary files and caches
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf dist/
	rm -rf build/

clean-logs: ## Clean log files
	rm -rf logs/*.log

clean-uploads: ## Clean uploaded files
	rm -rf uploads/*

requirements: ## Update requirements.txt
	. venv/bin/activate && pip freeze > requirements.txt

security: ## Run security checks
	. venv/bin/activate && pip install safety bandit
	. venv/bin/activate && safety check
	. venv/bin/activate && bandit -r app/

# Documentation
docs: ## Generate API documentation
	. venv/bin/activate && $(PYTHON) -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > docs/openapi.json

docs-serve: ## Serve API documentation
	. venv/bin/activate && $(PYTHON) -m app.main &
	@echo "API documentation available at: http://localhost:8000/docs"

# Monitoring
health: ## Check application health
	curl -f http://localhost:8000/health || echo "Application not running"

status: ## Show service status
	@echo "=== Application Status ==="
	@curl -s http://localhost:8000/health | jq . || echo "API not responding"
	@echo "\n=== Docker Services ==="
	@$(DOCKER_COMPOSE) ps

# Development helpers
shell-db: ## Connect to database shell
	. venv/bin/activate && psql $$DATABASE_URL

shell-redis: ## Connect to Redis shell
	redis-cli

logs: ## Show application logs
	tail -f logs/actnexus.log

logs-error: ## Show error logs only
	grep ERROR logs/actnexus.log | tail -20

# Backup and restore
backup-db: ## Backup database
	. venv/bin/activate && pg_dump $$DATABASE_URL > backup_$$(date +%Y%m%d_%H%M%S).sql

restore-db: ## Restore database (usage: make restore-db FILE=backup.sql)
	. venv/bin/activate && psql $$DATABASE_URL < $(FILE)

# Performance
profile: ## Run performance profiling
	. venv/bin/activate && $(PYTHON) -m cProfile -o profile.stats -m app.main

load-test: ## Run load tests (requires locust)
	. venv/bin/activate && pip install locust
	. venv/bin/activate && locust -f tests/load_test.py --host=http://localhost:8000

# Git hooks
install-hooks: ## Install git hooks
	cp scripts/pre-commit .git/hooks/
	chmod +x .git/hooks/pre-commit

# All-in-one commands
full-setup: setup install-dev migrate ## Complete setup for new development environment

ci: format-check lint test ## Run all CI checks

release: clean test build ## Prepare for release