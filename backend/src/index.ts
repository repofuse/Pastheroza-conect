import express from 'express';
import cors from 'cors';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { cloneRepo, analyzeRepo, RepoSummary } from './agents/repoAnalysis.js';

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
