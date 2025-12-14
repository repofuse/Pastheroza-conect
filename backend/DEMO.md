# conect MVP Demo

## Example Scenario: React Frontend + Express Backend Integration

This demo shows how conect automatically integrates a React frontend with an Express backend.

### Repositories Used

| Repo | Type | Framework |
|------|------|-----------|
| [react-crash-2024](https://github.com/bradtraversy/react-crash-2024) | Frontend | React |
| [express-crash](https://github.com/bradtraversy/express-crash) | Backend | Express |

### Step-by-Step Demo

#### 1. Add Repositories

```bash
# Reset state
curl -X POST https://conect.api.hurated.com/api/reset

# Add frontend
curl -X POST https://conect.api.hurated.com/api/repos \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/bradtraversy/react-crash-2024"}'

# Add backend
curl -X POST https://conect.api.hurated.com/api/repos \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/bradtraversy/express-crash"}'
```

#### 2. Run Full Pipeline

```bash
curl -X POST https://conect.api.hurated.com/api/run-all | jq
```

### Expected Results

#### Analysis Output
```json
{
  "analysis": [
    {
      "url": "https://github.com/bradtraversy/react-crash-2024",
      "framework": "react",
      "apiCalls": ["/api/jobs", "/api/jobs/${id}"]
    },
    {
      "url": "https://github.com/bradtraversy/express-crash",
      "framework": "express",
      "apiRoutes": ["/", "/:id"]
    }
  ]
}
```

#### Interface Matching
- **Missing in Backend**: `/api/jobs`, `/api/jobs/:id` (frontend calls these but backend doesn't have them)
- **Unused in Backend**: `/`, `/:id` (backend has these but frontend doesn't use them)

#### Generated Code

1. **API Client** (TypeScript fetch wrapper)
2. **CORS Config** (Express middleware)
3. **Missing Endpoints** (Express route stubs for `/api/jobs`)
4. **Shared Types** (TypeScript interfaces)

#### Integration Config

- **Strategy**: docker-compose
- **Files Generated**:
  - `.env`
  - `docker-compose.yml`
  - `start.sh`

#### Validation Report
```json
{
  "status": "partial",
  "reposAnalyzed": 2,
  "estimatedTimeSaved": "16 hours",
  "errors": ["Missing cors package"],
  "fixes": ["npm install cors", "app.use(cors())"]
}
```

#### Economic Metrics
```json
{
  "timeSaved": { "total": 16, "unit": "hours" },
  "costSavings": { "totalSavings": 800, "currency": "USD" },
  "summary": "Automated integration saved 16 hours ($800). Pipeline completed in 2.5 seconds."
}
```

### Success Criteria

| Criteria | Status |
|----------|--------|
| Detect frontend framework | ✅ React detected |
| Detect backend framework | ✅ Express detected |
| Extract API routes | ✅ 4 routes extracted |
| Extract frontend API calls | ✅ 8 calls found |
| Match interfaces | ✅ Mismatches identified |
| Generate glue code | ✅ 4 files generated |
| Create docker-compose | ✅ Config generated |
| Calculate time savings | ✅ 16 hours saved |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/repos` | POST | Add repository |
| `/api/repos` | GET | List repositories |
| `/api/repos/:id` | DELETE | Remove repository |
| `/api/analyze` | POST | Run Repo Analysis Agent |
| `/api/match` | POST | Run Interface Matching Agent |
| `/api/generate` | POST | Run Code Generation Agent |
| `/api/integrate` | POST | Run Integration Agent |
| `/api/validate` | POST | Run Validation Agent |
| `/api/run-all` | POST | Run full pipeline |
| `/api/reset` | POST | Clear all data |
| `/health` | GET | Health check |

### Live Demo URL

**API**: https://conect.api.hurated.com

```bash
# Quick test
curl https://conect.api.hurated.com/health
```
