import express, { Response } from 'express';
import cors from 'cors';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { cloneRepo, analyzeRepo, RepoSummary } from './agents/repoAnalysis.js';
import { matchInterfaces } from './agents/interfaceMatching.js';
import { generateCode } from './agents/codeGeneration.js';
import { generateIntegration } from './agents/integration.js';
import { validateIntegration } from './agents/validation.js';
import { calculateMetrics } from './agents/metrics.js';
import { swaggerSpec } from './swagger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage
interface StoredRepo {
  id: string;
  url: string;
  addedAt: string;
  summary?: RepoSummary;
}
const repos: Map<string, StoredRepo> = new Map();

// SSE helper
function sendSSE(res: Response, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const data = JSON.stringify({ message, type, timestamp: new Date().toISOString() });
  res.write(`data: ${data}\n\n`);
}

// Swagger JSON
app.get('/api/docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

// Swagger UI
app.get('/api/docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head>
  <title>conect API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: '/api/docs/swagger.json', dom_id: '#swagger-ui' });</script>
</body></html>`);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List repos
app.get('/api/repos', (req, res) => {
  res.json({ repos: Array.from(repos.values()) });
});

// Add repo
app.post('/api/repos', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  
  const id = Buffer.from(url).toString('base64url');
  const addedAt = new Date().toISOString();
  repos.set(id, { id, url, addedAt });
  res.json({ id, url, addedAt });
});

// Remove repo
app.delete('/api/repos/:id', (req, res) => {
  const { id } = req.params;
  if (repos.delete(id)) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'not found' });
  }
});

// Analyze all repos
app.post('/api/analyze', async (req, res) => {
  const results: RepoSummary[] = [];
  
  for (const [id, repo] of repos) {
    const tempDir = await mkdtemp(join(tmpdir(), 'conect-'));
    try {
      await cloneRepo(repo.url, tempDir);
      const summary = await analyzeRepo(tempDir, repo.url);
      repo.summary = summary;
      results.push(summary);
    } catch (err: any) {
      results.push({ url: repo.url, error: err.message } as any);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
  
  res.json({ results });
});

// Match interfaces between frontend and backend
app.post('/api/match', (req, res) => {
  const summaries = Array.from(repos.values())
    .map(r => r.summary)
    .filter((s): s is RepoSummary => !!s);
  
  if (summaries.length === 0) {
    return res.status(400).json({ error: 'No analyzed repos. Run /api/analyze first.' });
  }
  
  const result = matchInterfaces(summaries);
  res.json(result);
});

// Generate code to fix mismatches
app.post('/api/generate', async (req, res) => {
  const summaries = Array.from(repos.values())
    .map(r => r.summary)
    .filter((s): s is RepoSummary => !!s);
  
  if (summaries.length === 0) {
    return res.status(400).json({ error: 'No analyzed repos. Run /api/analyze first.' });
  }
  
  const matchResult = matchInterfaces(summaries);
  const generated = await generateCode(summaries, matchResult);
  res.json(generated);
});

// Generate integration config (docker-compose, env, scripts)
app.post('/api/integrate', (req, res) => {
  const summaries = Array.from(repos.values())
    .map(r => r.summary)
    .filter((s): s is RepoSummary => !!s);
  
  if (summaries.length === 0) {
    return res.status(400).json({ error: 'No analyzed repos. Run /api/analyze first.' });
  }
  
  const result = generateIntegration(summaries);
  res.json(result);
});

// Validate integration and generate report
app.post('/api/validate', async (req, res) => {
  const summaries = Array.from(repos.values())
    .map(r => r.summary)
    .filter((s): s is RepoSummary => !!s);
  
  if (summaries.length === 0) {
    return res.status(400).json({ error: 'No analyzed repos. Run /api/analyze first.' });
  }
  
  const result = await validateIntegration(summaries, '/tmp');
  res.json(result);
});

// Run full pipeline with SSE streaming
app.get('/api/run-all/stream', async (req, res) => {
  const repoList = Array.from(repos.values());
  if (repoList.length === 0) {
    res.status(400).json({ error: 'No repos added. Add repos first.' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const startTime = Date.now();

  try {
    // Step 1: Analyze
    sendSSE(res, 'Connecting to repositories...', 'info');
    
    for (const repo of repoList) {
      const tempDir = await mkdtemp(join(tmpdir(), 'conect-'));
      try {
        sendSSE(res, `Cloning ${repo.url}...`, 'info');
        await cloneRepo(repo.url, tempDir);
        
        sendSSE(res, `Scanning package.json and dependencies...`, 'info');
        repo.summary = await analyzeRepo(tempDir, repo.url);
        
        const framework = repo.summary.framework || 'unknown';
        sendSSE(res, `Detected ${framework} framework in ${repo.url.split('/').pop()}`, 'success');
      } catch (err: any) {
        sendSSE(res, `Failed to analyze ${repo.url}: ${err.message}`, 'error');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    }

    const summaries = repoList.map(r => r.summary).filter((s): s is RepoSummary => !!s);
    sendSSE(res, `Analysis complete. ${summaries.length} repositories scanned.`, 'success');

    // Step 2: Match
    sendSSE(res, 'Matching frontend API calls to backend routes...', 'info');
    const matchResult = matchInterfaces(summaries);
    
    if (matchResult.missingInBackend.length > 0) {
      sendSSE(res, `Warning: ${matchResult.missingInBackend.length} API calls have no matching backend endpoint`, 'warning');
    }
    if (matchResult.unusedInBackend.length > 0) {
      sendSSE(res, `Found ${matchResult.unusedInBackend.length} unused backend endpoints`, 'info');
    }
    sendSSE(res, 'Interface matching complete.', 'success');

    // Step 3: Generate
    sendSSE(res, 'Generating API client for frontend...', 'info');
    sendSSE(res, 'Configuring CORS policies...', 'info');
    const generated = await generateCode(summaries, matchResult);
    sendSSE(res, `Generated ${Object.keys(generated).length} code files.`, 'success');

    // Step 4: Integrate
    sendSSE(res, 'Generating docker-compose configuration...', 'info');
    sendSSE(res, 'Creating environment files...', 'info');
    const integration = generateIntegration(summaries);
    sendSSE(res, `Integration strategy: ${integration.strategy}`, 'success');

    // Step 5: Validate
    sendSSE(res, 'Running validation checks...', 'info');
    sendSSE(res, 'Checking dependencies and configurations...', 'info');
    const validation = await validateIntegration(summaries, '/tmp');
    
    if (validation.errors.length > 0) {
      for (const error of validation.errors) {
        sendSSE(res, error, 'warning');
      }
    }

    const totalDuration = Date.now() - startTime;
    const metrics = calculateMetrics(summaries, matchResult, generated, integration, validation, totalDuration);

    sendSSE(res, `Pipeline complete in ${(totalDuration / 1000).toFixed(1)}s`, 'success');
    sendSSE(res, `Estimated time saved: ${metrics.timeSaved.total} hours ($${metrics.costSavings.totalSavings})`, 'success');

    // Send final result
    res.write(`event: complete\ndata: ${JSON.stringify({
      analysis: summaries,
      matching: matchResult,
      generated,
      integration,
      validation,
      metrics,
    })}\n\n`);

  } catch (err: any) {
    sendSSE(res, `Pipeline failed: ${err.message}`, 'error');
  }

  res.end();
});

// Run full pipeline (non-streaming, for backwards compatibility)
app.post('/api/run-all', async (req, res) => {
  const repoList = Array.from(repos.values());
  if (repoList.length === 0) {
    return res.status(400).json({ error: 'No repos added. Add repos first.' });
  }

  const logs: { step: string; timestamp: string; duration?: number }[] = [];
  const log = (step: string) => {
    logs.push({ step, timestamp: new Date().toISOString() });
  };

  const startTime = Date.now();

  // Step 1: Analyze
  log('Starting repo analysis...');
  for (const repo of repoList) {
    const tempDir = await mkdtemp(join(tmpdir(), 'conect-'));
    try {
      await cloneRepo(repo.url, tempDir);
      repo.summary = await analyzeRepo(tempDir, repo.url);
      log(`Analyzed: ${repo.url}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  const summaries = repoList.map(r => r.summary).filter((s): s is RepoSummary => !!s);

  // Step 2: Match
  log('Matching interfaces...');
  const matchResult = matchInterfaces(summaries);
  log(`Found ${matchResult.missingInBackend.length} missing endpoints`);

  // Step 3: Generate
  log('Generating code...');
  const generated = await generateCode(summaries, matchResult);
  log('Code generation complete');

  // Step 4: Integrate
  log('Generating integration config...');
  const integration = generateIntegration(summaries);
  log(`Strategy: ${integration.strategy}`);

  // Step 5: Validate
  log('Validating integration...');
  const validation = await validateIntegration(summaries, '/tmp');
  log(`Validation: ${validation.report.status}`);

  const totalDuration = Date.now() - startTime;
  log(`Pipeline complete in ${totalDuration}ms`);

  // Calculate economic metrics
  const metrics = calculateMetrics(
    summaries, matchResult, generated, integration, validation, totalDuration
  );

  res.json({
    logs,
    analysis: summaries,
    matching: matchResult,
    generated,
    integration,
    validation,
    metrics,
  });
});

// Reset all
app.post('/api/reset', (req, res) => {
  repos.clear();
  res.json({ success: true });
});

// Get git history for all repos
app.get('/api/history', async (req, res) => {
  const repoList = Array.from(repos.values());
  if (repoList.length === 0) {
    return res.status(400).json({ error: 'No repos added. Add repos first.' });
  }

  const history: { repo: string; commits: { hash: string; message: string; date: string; author: string }[] }[] = [];

  for (const repo of repoList) {
    const tempDir = await mkdtemp(join(tmpdir(), 'conect-'));
    try {
      await cloneRepo(repo.url, tempDir);
      const { execSync } = await import('child_process');
      const log = execSync('git log --oneline -10 --format="%H|%s|%ai|%an"', { cwd: tempDir, encoding: 'utf-8' });
      const commits = log.trim().split('\n').filter(Boolean).map(line => {
        const [hash, message, date, author] = line.split('|');
        return { hash: hash.slice(0, 7), message, date, author };
      });
      history.push({ repo: repo.url, commits });
    } catch (err: any) {
      history.push({ repo: repo.url, commits: [], error: err.message } as any);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  res.json({ history });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
