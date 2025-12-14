# TODO

## Phase 0: Infrastructure
- [x] Create .env and .env.example
- [x] Create compose.yml
- [x] Create deploy.sh
- [x] Configure port 11000 on conect.api.hurated.com
- [x] Create Dockerfile
- [x] Initialize Node.js + TypeScript + Express project
- [x] Test deployment
- [x] Configure nginx + SSL for https://conect.api.hurated.com

## Phase 1: Core Setup
- [x] Set up Express server with CORS
- [ ] Create agent base class/interface
- [ ] Set up Git CLI integration for cloning

## Phase 2: Repo Analysis Agent
- [x] Clone repos to temp directory
- [x] Detect language/framework (package.json, requirements.txt, etc.)
- [x] Find entry points (index.js, main.py, etc.)
- [x] Extract API routes (Express routes, FastAPI endpoints)
- [x] Parse config files and env vars
- [x] Output structured JSON summary

## Phase 3: Interface Matching Agent
- [x] Parse frontend API calls (fetch, axios, etc.)
- [x] Parse backend route definitions
- [x] Match calls to routes
- [x] Detect mismatches:
  - Frontend calls with no backend endpoint
  - Backend endpoints not used by frontend
- [ ] Generate integration contracts (schemas, DTOs)

## Phase 4: Code Generation Agent
- [x] Generate frontend API client (fetch/axios wrapper)
- [x] Generate backend CORS configuration
- [x] Generate shared type definitions
- [x] Generate missing endpoint stubs

## Phase 5: Integration Agent
- [x] Choose strategy: monorepo vs docker-compose
- [x] Generate .env files
- [x] Generate startup scripts (npm scripts, docker-compose.yml)
- [x] Generate project structure

## Phase 6: Validation & Repair Agent
- [x] Check repos for common issues
- [x] Detect missing dependencies
- [x] Generate fix suggestions with LLM
- [x] Generate final integration report
- [x] Calculate estimated time saved

## Phase 7: API & Orchestration
- [x] Implement all REST endpoints
- [x] Build orchestrator to run agents in sequence (/api/run-all)
- [x] Log each agent step
- [ ] Stream progress to frontend

## Economic Utility Metrics
- [ ] Track time saved vs manual integration
- [ ] Count automated tasks (config, glue code, debugging)
- [ ] Generate comparison report

## Example Scenario (MVP Demo)
- [ ] React frontend + FastAPI backend integration
- [ ] Document success/failure criteria
