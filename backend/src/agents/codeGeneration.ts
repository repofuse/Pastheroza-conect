import Groq from 'groq-sdk';
import { RepoSummary } from './repoAnalysis.js';
import { MatchResult } from './interfaceMatching.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface GeneratedCode {
  apiClient?: string;
  corsConfig?: string;
  missingEndpoints?: string;
  sharedTypes?: string;
}

export async function generateCode(
  repos: RepoSummary[],
  matchResult: MatchResult
): Promise<GeneratedCode> {
  const result: GeneratedCode = {};

  const frontendRepo = repos.find(r => 
    r.framework === 'react' || r.framework === 'nextjs'
  );
  const backendRepo = repos.find(r => 
    r.framework === 'express' || r.framework === 'fastapi' || r.framework === 'flask'
  );

  // Generate API client for frontend
  if (frontendRepo && backendRepo) {
    result.apiClient = await generateApiClient(backendRepo);
  }

  // Generate CORS config for backend
  if (backendRepo) {
    result.corsConfig = generateCorsConfig(backendRepo.framework);
  }

  // Generate missing endpoints
  if (matchResult.missingInBackend.length > 0 && backendRepo) {
    result.missingEndpoints = await generateMissingEndpoints(
      matchResult.missingInBackend,
      backendRepo.framework
    );
  }

  // Generate shared types
  if (frontendRepo && backendRepo) {
    result.sharedTypes = await generateSharedTypes(repos, matchResult);
  }

  return result;
}

async function generateApiClient(backendRepo: RepoSummary): Promise<string> {
  const routes = backendRepo.apiRoutes.slice(0, 20); // Limit for context
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Generate a minimal TypeScript API client for these endpoints: ${JSON.stringify(routes)}. 
Use fetch. Export functions for each endpoint. Keep it under 50 lines. No comments.`
    }],
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || '';
}

function generateCorsConfig(framework: string | null): string {
  if (framework === 'express') {
    return `// Add to your Express app
import cors from 'cors';
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));`;
  }
  if (framework === 'fastapi') {
    return `# Add to your FastAPI app
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])`;
  }
  if (framework === 'flask') {
    return `# Add to your Flask app
from flask_cors import CORS
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)`;
  }
  return '';
}

async function generateMissingEndpoints(
  missing: { method: string; path: string }[],
  framework: string | null
): Promise<string> {
  const uniquePaths = [...new Set(missing.map(m => `${m.method} ${m.path}`))].slice(0, 10);
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Generate ${framework || 'express'} route handlers for these missing endpoints: ${uniquePaths.join(', ')}. 
Return stub implementations. Keep it minimal, under 40 lines total. No comments.`
    }],
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateSharedTypes(
  repos: RepoSummary[],
  matchResult: MatchResult
): Promise<string> {
  const allRoutes = repos.flatMap(r => r.apiRoutes).slice(0, 15);
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Generate TypeScript interfaces for API responses based on these routes: ${JSON.stringify(allRoutes)}.
Infer types from route names. Keep it under 30 lines. No comments.`
    }],
    max_tokens: 600,
  });

  return response.choices[0]?.message?.content || '';
}
