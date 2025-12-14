# conect API Reference

Base URL: `https://conect.api.hurated.com`

## Endpoints

### Health Check

```
GET /health
```

**Response** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-12-14T22:00:00.000Z"
}
```

---

### Repositories

#### List Repositories

```
GET /api/repos
```

**Response** `200 OK`
```json
{
  "repos": [
    {
      "url": "https://github.com/user/frontend",
      "summary": { ... }  // Present after /api/analyze
    }
  ]
}
```

#### Add Repository

```
POST /api/repos
Content-Type: application/json

{
  "url": "https://github.com/user/repo"
}
```

**Response** `200 OK`
```json
{
  "id": "aHR0cHM6Ly9naXRodWIuY29t...",
  "url": "https://github.com/user/repo"
}
```

**Error** `400 Bad Request`
```json
{
  "error": "url required"
}
```

#### Delete Repository

```
DELETE /api/repos/:id
```

**Response** `200 OK`
```json
{
  "success": true
}
```

**Error** `404 Not Found`
```json
{
  "error": "not found"
}
```

---

### Analysis Pipeline

#### Analyze Repositories

```
POST /api/analyze
```

Clones and analyzes all added repositories.

**Response** `200 OK`
```json
{
  "results": [
    {
      "url": "https://github.com/user/frontend",
      "language": "javascript",
      "framework": "react",
      "entryPoints": ["index.js"],
      "apiRoutes": [],
      "apiCalls": [
        { "method": "GET", "path": "/api/users", "file": "/src/App.jsx" }
      ],
      "configFiles": ["package.json"],
      "envVars": ["API_URL"],
      "dependencies": { "react": "^18.2.0" }
    }
  ]
}
```

#### Match Interfaces

```
POST /api/match
```

Matches frontend API calls to backend routes.

**Response** `200 OK`
```json
{
  "matched": [
    { "frontend": { "method": "GET", "path": "/api/users" }, "backend": "/api/users" }
  ],
  "missingInBackend": [
    { "method": "GET", "path": "/api/posts", "file": "/src/Posts.jsx" }
  ],
  "unusedInBackend": ["/api/legacy"]
}
```

**Error** `400 Bad Request`
```json
{
  "error": "No analyzed repos. Run /api/analyze first."
}
```

#### Generate Code

```
POST /api/generate
```

Generates glue code to fix mismatches.

**Response** `200 OK`
```json
{
  "apiClient": "// TypeScript API client code...",
  "corsConfig": "// CORS configuration...",
  "missingEndpoints": "// Express route stubs...",
  "sharedTypes": "// TypeScript interfaces..."
}
```

**Error** `400 Bad Request`
```json
{
  "error": "No analyzed repos. Run /api/analyze first."
}
```

#### Generate Integration

```
POST /api/integrate
```

Generates docker-compose and startup scripts.

**Response** `200 OK`
```json
{
  "strategy": "docker-compose",
  "envFile": "# .env content...",
  "startupScript": "#!/bin/bash...",
  "dockerCompose": "services:...",
  "projectStructure": [
    "integrated-project/",
    "├── .env",
    "├── docker-compose.yml",
    "└── frontend/"
  ]
}
```

**Error** `400 Bad Request`
```json
{
  "error": "No analyzed repos. Run /api/analyze first."
}
```

#### Validate Integration

```
POST /api/validate
```

Validates integration and suggests fixes.

**Response** `200 OK`
```json
{
  "success": false,
  "errors": ["Missing cors package"],
  "fixes": ["npm install cors"],
  "report": {
    "status": "partial",
    "reposAnalyzed": 2,
    "endpointsMatched": 4,
    "endpointsMissing": 2,
    "filesGenerated": [".env", "docker-compose.yml"],
    "estimatedTimeSaved": "9 hours",
    "summary": "Partially integrated 2 repositories..."
  }
}
```

**Error** `400 Bad Request`
```json
{
  "error": "No analyzed repos. Run /api/analyze first."
}
```

---

### Full Pipeline

#### Run All (JSON)

```
POST /api/run-all
```

Runs complete pipeline and returns JSON result.

**Response** `200 OK`
```json
{
  "logs": [
    { "step": "Starting repo analysis...", "timestamp": "..." }
  ],
  "analysis": [...],
  "matching": {...},
  "generated": {...},
  "integration": {...},
  "validation": {...},
  "metrics": {
    "timeSaved": { "total": 16, "unit": "hours" },
    "tasksAutomated": ["Analyzed 2 repositories", ...],
    "costSavings": { "totalSavings": 800, "currency": "USD" },
    "summary": "Automated integration saved 16 hours..."
  }
}
```

**Error** `400 Bad Request`
```json
{
  "error": "No repos added. Add repos first."
}
```

#### Run All (SSE Stream)

```
GET /api/run-all/stream
```

Runs complete pipeline with real-time progress updates via Server-Sent Events.

**Headers**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Stream Messages**
```
data: {"message": "Connecting to repositories...", "type": "info", "timestamp": "..."}

data: {"message": "Detected react framework", "type": "success", "timestamp": "..."}

data: {"message": "Warning: 3 missing endpoints", "type": "warning", "timestamp": "..."}

event: complete
data: {"analysis": [...], "metrics": {...}}
```

**Message Types**
| Type | Description |
|------|-------------|
| `info` | Progress update |
| `success` | Step completed |
| `warning` | Non-critical issue |
| `error` | Critical error |

**Frontend Example**
```javascript
const eventSource = new EventSource('https://conect.api.hurated.com/api/run-all/stream');

eventSource.onmessage = (event) => {
  const { message, type, timestamp } = JSON.parse(event.data);
  addToLog(message, type);
};

eventSource.addEventListener('complete', (event) => {
  const result = JSON.parse(event.data);
  handleComplete(result);
  eventSource.close();
});

eventSource.onerror = () => eventSource.close();
```

**Error** `400 Bad Request` (JSON, not SSE)
```json
{
  "error": "No repos added. Add repos first."
}
```

---

### Reset

```
POST /api/reset
```

Clears all repositories and analysis data.

**Response** `200 OK`
```json
{
  "success": true
}
```

---

## Swagger Documentation

```
GET /api/docs
```

Interactive API documentation (Swagger UI).

---

## Error Responses

All endpoints may return:

| Status | Description |
|--------|-------------|
| `400` | Bad request (missing params, no repos) |
| `404` | Resource not found |
| `500` | Internal server error |

Error format:
```json
{
  "error": "Error description"
}
```
