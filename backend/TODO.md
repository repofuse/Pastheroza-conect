# TODO

## Phase 0: Infrastructure
- [x] Create .env and .env.example
- [x] Create compose.yml
- [x] Create deploy.sh
- [x] Configure port 11000 on conect.api.hurated.com
- [x] Create Dockerfile
- [x] Initialize Node.js + TypeScript + Express project
- [ ] Test deployment

## Phase 1: Core Setup
- [x] Set up Express server with CORS
- [ ] Create agent base class/interface
- [ ] Set up Git CLI integration for cloning

## Phase 2: Repo Analysis Agent
- [ ] Clone repos to temp directory
- [ ] Detect language/framework (package.json, requirements.txt, etc.)
- [ ] Find entry points (index.js, main.py, etc.)
- [ ] Extract API routes (Express routes, FastAPI endpoints)
- [ ] Parse config files and env vars
- [ ] Output structured JSON summary

## Phase 3: Interface Matching Agent
- [ ] Parse frontend API calls (fetch, axios, etc.)
- [ ] Parse backend route definitions
- [ ] Match calls to routes
- [ ] Detect mismatches:
  - Frontend calls with no backend endpoint
  - Backend endpoints not used by frontend
- [ ] Generate integration contracts (schemas, DTOs)

## Phase 4: Code Generation Agent
- [ ] Generate frontend API client (fetch/axios wrapper)
- [ ] Generate backend CORS configuration
- [ ] Generate shared type definitions
- [ ] Apply minimal, safe code modifications

## Phase 5: Integration Agent
- [ ] Choose strategy: monorepo vs docker-compose
- [ ] Generate .env files
- [ ] Generate startup scripts (npm scripts, docker-compose.yml)
- [ ] Merge repos into unified structure

## Phase 6: Validation & Repair Agent
- [ ] Run integrated project (npm install, npm start)
- [ ] Capture build/runtime errors
- [ ] Analyze errors with LLM
- [ ] Apply fixes iteratively
- [ ] Generate final integration report

## Phase 7: API & Orchestration
- [ ] Implement all REST endpoints
- [ ] Build orchestrator to run agents in sequence
- [ ] Log each agent step
- [ ] Stream progress to frontend

## Economic Utility Metrics
- [ ] Track time saved vs manual integration
- [ ] Count automated tasks (config, glue code, debugging)
- [ ] Generate comparison report

## Example Scenario (MVP Demo)
- [ ] React frontend + FastAPI backend integration
- [ ] Document success/failure criteria
