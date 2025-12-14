# conect Backend

AI-powered multi-agent system that performs real remote software engineering labor by automatically integrating multiple GitHub repositories into a working system.

**Service Organization**: https://github.com/repofuse (forks and PRs are created here)

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
- Merge repositories into unified structure

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
- `POST /api/run-all` — Run full pipeline (JSON response)
- `GET /api/run-all/stream` — Run full pipeline with SSE streaming

### Status
- `GET /api/status` — Current workflow status and logs
- `GET /api/report` — Final integration report

## SSE Streaming (Server-Sent Events)

The `/api/run-all/stream` endpoint provides real-time progress updates.

### Message Format
```json
{
  "message": "Cloning repository...",
  "type": "info",
  "timestamp": "2025-12-14T22:00:00.000Z"
}
```

### Message Types
- `info` — Progress update (gray/white)
- `success` — Step completed (green)
- `warning` — Non-critical issue (yellow)
- `error` — Critical error (red)

### Frontend Usage (JavaScript)
```javascript
const eventSource = new EventSource('/api/run-all/stream');

eventSource.onmessage = (event) => {
  const { message, type, timestamp } = JSON.parse(event.data);
  console.log(`[${type}] ${message}`);
};

eventSource.addEventListener('complete', (event) => {
  const result = JSON.parse(event.data);
  console.log('Pipeline complete:', result);
  eventSource.close();
});

eventSource.onerror = () => {
  eventSource.close();
};
```

### Example Stream Output
```
data: {"message": "Connecting to repositories...", "type": "info"}
data: {"message": "Cloning https://github.com/user/frontend...", "type": "info"}
data: {"message": "Detected react framework", "type": "success"}
data: {"message": "Warning: 3 API calls have no matching backend endpoint", "type": "warning"}
data: {"message": "Pipeline complete in 2.5s", "type": "success"}
event: complete
data: {"analysis": [...], "metrics": {...}}
```

## Setup

### Local Development

```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

### Deployment

Deployed via Docker on `conect.api.hurated.com:11000`

```bash
./deploy.sh
```

## Environment Variables

See `.env.example`:

```
PORT=3000                              # Internal container port
EXTERNAL_PORT=11000                    # External port on host
GROQ_API_KEY=your_groq_api_key         # Groq API for Llama models (free)
REMOTE_HOST=conect.api.hurated.com     # Deployment server
REMOTE_USER=your_username              # SSH user
REMOTE_DIR=conect/backend              # Remote directory
```

Get free Groq API key at: https://console.groq.com

## Files

- `compose.yml` — Docker Compose configuration
- `deploy.sh` — Deployment script
- `.env` — Environment variables (not in git)
- `.env.example` — Example environment file (in git)

## Tech Stack

- Node.js + TypeScript + Express
- Groq API + Llama 3.1 (open-source, code analysis)
- Git CLI (repo cloning)
- Docker
