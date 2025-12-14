# conect Backend

Backend service for **conect** — a tool that analyzes multiple Git repositories as a unified project and synchronizes missing features between them.

## Concept

Users add related repositories (frontend, backend, database, etc.). The system:
1. Analyzes all repos as parts of one project
2. Detects mismatches (e.g., API calls in frontend without corresponding backend endpoints)
3. Suggests or applies fixes to synchronize repositories

## API Endpoints

### Repositories
- `POST /api/repos` — Add a repository to the list
- `GET /api/repos` — List all added repositories
- `DELETE /api/repos/:id` — Remove a repository

### Actions
- `POST /api/analyze` — Analyze all repositories, detect mismatches
- `POST /api/integrate` — Apply suggested fixes to repositories
- `POST /api/reset` — Clear all repositories and analysis data

### Status
- `GET /api/status` — Get current analysis status and results

## Setup

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

```
GEMINI_API_KEY=your_api_key    # For AI-powered code analysis
PORT=3001                       # Server port
```

## Tech Stack

- Node.js + TypeScript
- Express.js
- Google Gemini API (for code analysis)
