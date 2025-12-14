import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export interface ApiCall {
  method: string;
  path: string;
  file: string;
}

export interface RepoSummary {
  url: string;
  language: string | null;
  framework: string | null;
  entryPoints: string[];
  apiRoutes: string[];
  apiCalls: ApiCall[];
  configFiles: string[];
  envVars: string[];
  dependencies: Record<string, string>;
}

export async function cloneRepo(url: string, targetDir: string): Promise<void> {
  await execAsync(`git clone --depth 1 ${url} ${targetDir}`);
}

export async function analyzeRepo(repoPath: string, url: string): Promise<RepoSummary> {
  const summary: RepoSummary = {
    url,
    language: null,
    framework: null,
    entryPoints: [],
    apiRoutes: [],
    apiCalls: [],
    configFiles: [],
    envVars: [],
    dependencies: {},
  };

  // Detect language and framework
  const files = await readdir(repoPath);
  
  if (files.includes('package.json')) {
    summary.language = 'javascript';
    const pkg = JSON.parse(await readFile(join(repoPath, 'package.json'), 'utf-8'));
    summary.dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (summary.dependencies['react']) summary.framework = 'react';
    else if (summary.dependencies['next']) summary.framework = 'nextjs';
    else if (summary.dependencies['express']) summary.framework = 'express';
    else if (summary.dependencies['fastify']) summary.framework = 'fastify';
  } else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
    summary.language = 'python';
    if (files.includes('requirements.txt')) {
      const reqs = await readFile(join(repoPath, 'requirements.txt'), 'utf-8');
      if (reqs.includes('fastapi')) summary.framework = 'fastapi';
      else if (reqs.includes('flask')) summary.framework = 'flask';
      else if (reqs.includes('django')) summary.framework = 'django';
    }
    if (!summary.framework && files.includes('pyproject.toml')) {
      const pyproj = await readFile(join(repoPath, 'pyproject.toml'), 'utf-8');
      if (pyproj.includes('fastapi')) summary.framework = 'fastapi';
      else if (pyproj.includes('flask')) summary.framework = 'flask';
      else if (pyproj.includes('django')) summary.framework = 'django';
    }
  }

  // Find entry points
  const entryFiles = ['index.js', 'index.ts', 'main.py', 'app.py', 'server.js', 'server.ts'];
  for (const f of entryFiles) {
    if (files.includes(f) || files.includes('src') && await fileExists(join(repoPath, 'src', f))) {
      summary.entryPoints.push(f);
    }
  }

  // Find config files
  const configPatterns = ['.env.example', '.env.sample', 'config.json', 'config.yaml', 'docker-compose.yml', 'Dockerfile'];
  for (const f of files) {
    if (configPatterns.some(p => f.includes(p) || f === p)) {
      summary.configFiles.push(f);
    }
  }

  // Extract env vars from .env.example
  if (files.includes('.env.example')) {
    const envContent = await readFile(join(repoPath, '.env.example'), 'utf-8');
    summary.envVars = envContent.split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim());
  }

  // Extract API routes (basic pattern matching)
  summary.apiRoutes = await extractApiRoutes(repoPath, summary.framework);

  // Extract frontend API calls
  summary.apiCalls = await extractApiCalls(repoPath);

  return summary;
}

async function extractApiRoutes(repoPath: string, framework: string | null): Promise<string[]> {
  const routes: string[] = [];
  const srcPath = join(repoPath, 'src');
  const searchPaths = [repoPath];
  
  if (await fileExists(srcPath)) searchPaths.push(srcPath);

  for (const searchPath of searchPaths) {
    const files = await findFiles(searchPath, ['.ts', '.js', '.py']);
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      
      // Express/Fastify patterns
      const jsRoutes = content.match(/\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi) || [];
      for (const match of jsRoutes) {
        const route = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
        if (route) routes.push(route);
      }
      
      // FastAPI patterns
      const pyRoutes = content.match(/@(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi) || [];
      for (const match of pyRoutes) {
        const route = match.match(/['"]([^'"]+)['"]/)?.[1];
        if (route) routes.push(route);
      }
    }
  }

  return [...new Set(routes)];
}

async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...await findFiles(fullPath, extensions));
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function extractApiCalls(repoPath: string): Promise<ApiCall[]> {
  const calls: ApiCall[] = [];
  const srcPath = join(repoPath, 'src');
  const searchPaths = [repoPath];
  
  if (await fileExists(srcPath)) searchPaths.push(srcPath);

  for (const searchPath of searchPaths) {
    const files = await findFiles(searchPath, ['.ts', '.tsx', '.js', '.jsx']);
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const relativePath = file.replace(repoPath, '');
      
      // fetch() calls
      const fetchMatches = content.matchAll(/fetch\s*\(\s*[`'"](\/[^`'"]*)[`'"]/g);
      for (const match of fetchMatches) {
        calls.push({ method: 'GET', path: match[1], file: relativePath });
      }
      
      // axios calls
      const axiosMethods = ['get', 'post', 'put', 'delete', 'patch'];
      for (const method of axiosMethods) {
        const regex = new RegExp(`axios\\.${method}\\s*\\(\\s*[\`'"](\/[^\`'"]*)[\`'"]`, 'g');
        const matches = content.matchAll(regex);
        for (const match of matches) {
          calls.push({ method: method.toUpperCase(), path: match[1], file: relativePath });
        }
      }
      
      // Template literal API paths like `${API_URL}/users`
      const templateMatches = content.matchAll(/\$\{[^}]*\}(\/[a-zA-Z0-9/_-]+)/g);
      for (const match of templateMatches) {
        calls.push({ method: 'GET', path: match[1], file: relativePath });
      }
    }
  }

  return calls;
}
