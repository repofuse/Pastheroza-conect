import { RepoSummary } from './repoAnalysis.js';

export interface ApiCall {
  method: string;
  path: string;
  source: string;
}

export interface MatchResult {
  matched: { frontend: ApiCall; backend: string }[];
  missingInBackend: ApiCall[];
  unusedInBackend: string[];
}

export function matchInterfaces(repos: RepoSummary[]): MatchResult {
  const frontendRepos = repos.filter(r => 
    r.framework === 'react' || r.framework === 'nextjs' || r.framework === 'vue'
  );
  const backendRepos = repos.filter(r => 
    r.framework === 'express' || r.framework === 'fastify' || 
    r.framework === 'fastapi' || r.framework === 'flask' || r.framework === 'django'
  );

  // Collect all backend routes
  const backendRoutes = new Set<string>();
  for (const repo of backendRepos) {
    for (const route of repo.apiRoutes) {
      backendRoutes.add(normalizeRoute(route));
    }
  }

  // Collect frontend API calls (from dependencies analysis)
  const frontendCalls: ApiCall[] = [];
  for (const repo of frontendRepos) {
    // Frontend repos should have apiCalls extracted
    if ((repo as any).apiCalls) {
      frontendCalls.push(...(repo as any).apiCalls);
    }
  }

  const result: MatchResult = {
    matched: [],
    missingInBackend: [],
    unusedInBackend: [...backendRoutes],
  };

  for (const call of frontendCalls) {
    const normalizedPath = normalizeRoute(call.path);
    const matchedRoute = findMatchingRoute(normalizedPath, backendRoutes);
    
    if (matchedRoute) {
      result.matched.push({ frontend: call, backend: matchedRoute });
      result.unusedInBackend = result.unusedInBackend.filter(r => r !== matchedRoute);
    } else {
      result.missingInBackend.push(call);
    }
  }

  return result;
}

function normalizeRoute(route: string): string {
  // Remove query params, normalize path params
  return route
    .split('?')[0]
    .replace(/\{[^}]+\}/g, ':param')
    .replace(/:[^/]+/g, ':param')
    .toLowerCase();
}

function findMatchingRoute(path: string, routes: Set<string>): string | null {
  // Exact match
  if (routes.has(path)) return path;
  
  // Pattern match (with params)
  for (const route of routes) {
    if (routesMatch(path, route)) return route;
  }
  return null;
}

function routesMatch(path1: string, path2: string): boolean {
  const parts1 = path1.split('/').filter(Boolean);
  const parts2 = path2.split('/').filter(Boolean);
  
  if (parts1.length !== parts2.length) return false;
  
  for (let i = 0; i < parts1.length; i++) {
    const p1 = parts1[i], p2 = parts2[i];
    if (p1 === p2) continue;
    if (p1 === ':param' || p2 === ':param') continue;
    return false;
  }
  return true;
}
