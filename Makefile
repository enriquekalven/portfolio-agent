# --- Enrique K Chan Portfolio Agent Unified Makefile ---

# Project Variables
PROJECT_ID ?= $(shell gcloud config get-value project)
REGION ?= us-central1
SERVICE_NAME = enriq-portfolio-agent
IMAGE_TAG = $(REGION)-docker.pkg.dev/$(PROJECT_ID)/agent-repo/$(SERVICE_NAME):latest

.PHONY: help dev build deploy-backend deploy-frontend deploy-all audit

help:
	@echo "Enrique K Chan Portfolio Agent - Unified Deployment"
	@echo "Available commands:"
	@echo "  make dev               - Start local development (Vite + API + Agent)"
	@echo "  make build             - Build frontend assets"
	@echo "  make deploy-backend    - Deploy Agent to Vertex AI Agent Engine"
	@echo "  make deploy-frontend   - Deploy UI Bridge to Cloud Run & Firebase Hosting"
	@echo "  make deploy-all        - Full deployment (Backend + Frontend)"

dev:
	npm run start:all

build:
	python3 scripts/sync_data.py
	npm run build

# 🚀 Backend: Vertex AI Agent Engine
# Using the Agent Starter Pack deployment pattern
deploy-backend:
	@echo "📦 Preparing requirements..."
	cp agent/requirements.txt agent/app_utils/.requirements.txt
	@echo "📦 Deploying Portfolio Agent to Vertex AI Agent Engine..."
	# Export requirements for Agent Engine
	# Note: We use the existing agent directory as the source package
	./venv/bin/python3 -m agent.app_utils.deploy \
		--project $(PROJECT_ID) \
		--location $(REGION) \
		--source-packages=./agent \
		--entrypoint-module=agent.agent_engine_app \
		--entrypoint-object=agent_engine \
		--requirements-file=agent/app_utils/.requirements.txt \
		--display-name="Portfolio Agent"

# 🚀 Frontend: Cloud Run + Firebase Hosting
# Using the Agent UI Starter Pack deployment pattern
deploy-frontend: build
	@echo "📦 Deploying UI Bridge to Cloud Run..."
	gcloud run deploy $(SERVICE_NAME) --source . --region $(REGION) --allow-unauthenticated --memory 1Gi \
		--set-env-vars GOOGLE_CLOUD_PROJECT=$(PROJECT_ID),AGENT_ENGINE_RESOURCE_ID=2034955229966893056,AGENT_ENGINE_PROJECT_NUMBER=697625214430,USE_LOCAL_AGENT=FALSE,GENAI_MODEL=gemini-2.5-flash
	@echo "🔥 Deploying static assets to Firebase Hosting..."
	firebase deploy --only hosting --project $(PROJECT_ID)

# 🏁 The Full Monte
deploy-all: deploy-backend deploy-frontend
	@echo "✅ Full deployment complete!"
	@echo "🌍 Live at: https://$(PROJECT_ID).web.app"

# 🧪 Testing
test-core:
	PYTHONPATH=. ./venv/bin/python3 -m pytest agent/tests/test_edge_cases.py
