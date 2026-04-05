.PHONY: up up-fg down build logs ps restart clean help

COMPOSE = docker compose -f ../compose.yaml

## up       — build images and start all services in the background
up:
	$(COMPOSE) up --build -d

## up-fg    — build images and start all services (foreground, with logs)
up-fg:
	$(COMPOSE) up --build

## down     — stop and remove containers
down:
	$(COMPOSE) down

## build    — build all images without starting
build:
	$(COMPOSE) build

## logs     — follow logs for all services (or: make logs s=stakeholders)
logs:
	$(COMPOSE) logs -f $(s)

## ps       — show running containers
ps:
	$(COMPOSE) ps

## restart  — restart a specific service: make restart s=blog
restart:
	$(COMPOSE) restart $(s)

## clean    — stop containers and remove volumes (full reset)
clean:
	$(COMPOSE) down -v

help:
	@grep -E '^## ' Makefile | sed 's/## //'
