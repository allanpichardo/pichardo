.DEFAULT_GOAL := help

PNPM ?= pnpm
ENV_FILE ?= infra/.env
APP ?= artist
REVISION ?= $(shell git rev-parse HEAD)

export ENV_FILE APP REVISION NAME BACKUP_ROOT BACKUP_DIR RESTORE_ROOT RESTORE_PROJECT

COMPOSE = docker compose --env-file "$$ENV_FILE" -f infra/compose.yaml

.PHONY: help install dev dev-artist dev-worker dev-professional infra-up infra-down \
	build build-artist build-professional check lint format format-check typecheck \
	test test-integration test-e2e test-containers browsers generate bootstrap \
	migrate migrate-create migrate-status prod-up prod-down prod-status prod-logs \
	deploy backup restore

help: ## List available commands. See README.md for environment setup.
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target> [VARIABLE=value]\n\n"} /^[a-zA-Z][a-zA-Z0-9_-]*:.*## / {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies from the pinned lockfile.
	$(PNPM) install --frozen-lockfile

dev: ## Run both applications with hot reload.
	$(PNPM) dev

dev-artist: ## Run only the artist application on port 3000.
	$(PNPM) dev:artist

dev-worker: ## Run the artist media worker alongside development servers.
	$(PNPM) dev:worker

dev-professional: ## Run only the professional application on port 3001.
	$(PNPM) dev:professional

infra-up: ## Start the development PostgreSQL container.
	$(PNPM) infra:up

infra-down: ## Stop development PostgreSQL and retain its data.
	$(PNPM) infra:down

build: ## Build both applications for production.
	$(PNPM) build

build-artist: ## Build only the artist application.
	$(PNPM) --filter @pichardo/artist build

build-professional: ## Build only the professional application.
	$(PNPM) --filter @pichardo/professional build

check: ## Run formatting checks, linting, type checking, and unit tests.
	$(PNPM) format:check
	$(PNPM) lint
	$(PNPM) typecheck
	$(PNPM) test

lint: ## Check ESLint rules.
	$(PNPM) lint

format: ## Format source files.
	$(PNPM) format

format-check: ## Check formatting without modifying files.
	$(PNPM) format:check

typecheck: ## Generate route types and check TypeScript.
	$(PNPM) typecheck

test: ## Run unit tests without a database.
	$(PNPM) test

test-integration: ## Run integration tests against a configured _test database.
	$(PNPM) test:integration

test-e2e: ## Run browser tests with a bootstrapped _test database.
	$(PNPM) test:e2e

test-containers: ## Build and verify disposable production containers and recovery.
	$(PNPM) test:containers

browsers: ## Install Chromium for Playwright tests.
	$(PNPM) exec playwright install chromium

generate: ## Generate Payload types and the admin import map.
	$(PNPM) generate

bootstrap: ## Create an administrator using ADMIN_EMAIL and ADMIN_PASSWORD.
	$(PNPM) bootstrap

migrate: ## Apply pending Payload migrations to the configured database.
	$(PNPM) migrate

migrate-create: ## Create a migration. Usage: make migrate-create NAME=describe_change
	@test -n "$$NAME" || { echo 'Supply NAME=describe_change.' >&2; exit 1; }
	$(PNPM) migrate:create "$$NAME"

migrate-status: ## Show Payload migration status.
	$(PNPM) migrate:status

prod-up: ## Start configured production images. Run migrations separately first.
	$(COMPOSE) up -d --wait

prod-down: ## Stop production containers and retain database and media.
	$(COMPOSE) down

prod-status: ## Show production service status. Override ENV_FILE as needed.
	$(COMPOSE) ps

prod-logs: ## Follow production logs. Override APP=artist or APP=professional.
	$(COMPOSE) logs --follow --tail=100 "$$APP"

deploy: ## Build and deploy APP=artist or professional at REVISION, default HEAD.
	bash scripts/deploy.sh "$$APP" "$$REVISION" "$$ENV_FILE"

backup: ## Back up production. Usage: make backup BACKUP_ROOT=/srv/backups/pichardo
	bash scripts/backup.sh "$$ENV_FILE" "$$BACKUP_ROOT"

restore: ## Restore in isolation. Set BACKUP_DIR, RESTORE_ROOT, and RESTORE_PROJECT.
	bash scripts/restore.sh "$$ENV_FILE" "$$BACKUP_DIR" "$$RESTORE_ROOT" "$$RESTORE_PROJECT"
