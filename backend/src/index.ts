import express from 'express';
import cors from 'cors';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { cloneRepo, analyzeRepo, RepoSummary } from './agents/repoAnalysis.js';
import { matchInterfaces } from './agents/interfaceMatching.js';
import { generateCode } from './agents/codeGeneration.js';
import { generateIntegration } from './agents/integration.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage
const repos: Map<string, { url: string; summary?: RepoSummary }> = new Map();

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
  repos.set(id, { url });
  res.json({ id, url });
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

// Reset all
app.post('/api/reset', (req, res) => {
  repos.clear();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
