# conect Backend

AI-powered multi-agent system that performs real remote software engineering labor by automatically integrating multiple GitHub repositories into a working system.

## Mission

Replace work typically done by a junior remote software engineer:
- Connect frontend repo to backend repo
- Integrate additional services (auth, payments, etc.)
- Generate glue code, configuration, and integration logic

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend UI                              │
│              (Repo URLs input → Integration output)              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Orchestrator                        │
│                  (Agent workflow management)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  Repo   │ │Interface│ │  Code   │ │Integration│ │Validation│
   │Analysis │ │Matching │ │  Gen    │ │  Agent  │ │& Repair │
   │ Agent   │ │ Agent   │ │ Agent   │ │         │ │  Agent  │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Agents

### 1. Repo Analysis Agent
- Clone repositories
- Detect: language, framework, entry points, API routes, config files, env vars
- Output: structured repo summary (JSON)

### 2. Interface Matching Agent
- Match frontend API calls to backend routes
- Detect missing endpoints or mismatches
- Propose integration contracts (REST schemas, DTOs)

### 3. Code Generation Agent
- Generate: frontend API clients, backend CORS/auth config, shared schemas
- Modify code safely and minimally

### 4. Integration Agent
- Decide strategy: monorepo or docker-compose
- Generate: .env files, startup scripts, service wiring
- Merge repositories into one project structure

### 5. Validation & Repair Agent
- Run the integrated project
- Detect build/runtime errors
- Apply fixes iteratively
- Produce final "integration report"

## API Endpoints

### Repositories
- `POST /api/repos` — Add a repository
- `GET /api/repos` — List repositories
- `DELETE /api/repos/:id` — Remove repository

### Integration Workflow
- `POST /api/analyze` — Run Repo Analysis Agent
- `POST /api/match` — Run Interface Matching Agent
- `POST /api/generate` — Run Code Generation Agent
- `POST /api/integrate` — Run Integration Agent
- `POST /api/validate` — Run Validation & Repair Agent
- `POST /api/run-all` — Run full pipeline

### Status
- `GET /api/status` — Current workflow status and logs
- `GET /api/report` — Final integration report

## Setup

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

```
GEMINI_API_KEY=your_api_key
PORT=3001
```

## Tech Stack

- Node.js + TypeScript + Express
- Google Gemini API (code analysis)
- Git CLI (repo cloning)
- Docker (optional, for validation)
