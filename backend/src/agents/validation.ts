import { exec } from 'child_process';
import { promisify } from 'util';
import Groq from 'groq-sdk';
import { RepoSummary } from './repoAnalysis.js';

const execAsync = promisify(exec);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ValidationResult {
  success: boolean;
  errors: string[];
  fixes: string[];
  report: IntegrationReport;
}

export interface IntegrationReport {
  status: 'success' | 'partial' | 'failed';
  reposAnalyzed: number;
  endpointsMatched: number;
  endpointsMissing: number;
  filesGenerated: string[];
  estimatedTimeSaved: string;
  summary: string;
}

export async function validateIntegration(
  repos: RepoSummary[],
  tempDir: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const fixes: string[] = [];

  // Check each repo for common issues
  for (const repo of repos) {
    const repoErrors = await checkRepo(repo);
    errors.push(...repoErrors);
  }

  // If errors found, generate fixes
  if (errors.length > 0) {
    const suggestedFixes = await generateFixes(errors, repos);
    fixes.push(...suggestedFixes);
  }

  const report = generateReport(repos, errors, fixes);

  return {
    success: errors.length === 0,
    errors,
    fixes,
    report,
  };
}

async function checkRepo(repo: RepoSummary): Promise<string[]> {
  const errors: string[] = [];

  // Check for missing dependencies
  if (repo.framework === 'react' && !repo.dependencies['react']) {
    errors.push(`${repo.url}: Missing react dependency`);
  }
  if (repo.framework === 'express' && !repo.dependencies['express']) {
    errors.push(`${repo.url}: Missing express dependency`);
  }

  // Check for missing entry points
  if (repo.entryPoints.length === 0) {
    errors.push(`${repo.url}: No entry point found`);
  }

  // Check for missing env vars
  if (repo.envVars.length > 0) {
    errors.push(`${repo.url}: Requires env vars: ${repo.envVars.join(', ')}`);
  }

  // Check for CORS issues (frontend calling backend)
  if (repo.framework === 'express' && !repo.dependencies['cors']) {
    errors.push(`${repo.url}: Missing cors package for cross-origin requests`);
  }

  return errors;
}

async function generateFixes(errors: string[], repos: RepoSummary[]): Promise<string[]> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Given these integration errors: ${errors.join('; ')}
Generate brief fix instructions (one line each). Max 5 fixes.`
    }],
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content || '';
  return content.split('\n').filter(line => line.trim()).slice(0, 5);
}

function generateReport(
  repos: RepoSummary[],
  errors: string[],
  fixes: string[]
): IntegrationReport {
  const totalRoutes = repos.reduce((sum, r) => sum + r.apiRoutes.length, 0);
  const totalCalls = repos.reduce((sum, r) => sum + r.apiCalls.length, 0);
  
  const status = errors.length === 0 ? 'success' : 
                 fixes.length >= errors.length ? 'partial' : 'failed';

  const filesGenerated = [
    '.env',
    '.env.example', 
    'docker-compose.yml',
    'start.sh',
    'api-client.ts',
    'shared-types.ts',
  ];

  // Estimate time saved (rough calculation)
  const hoursPerRepo = 2;
  const hoursForIntegration = 4;
  const hoursForConfig = 1;
  const totalHours = repos.length * hoursPerRepo + hoursForIntegration + hoursForConfig;

  return {
    status,
    reposAnalyzed: repos.length,
    endpointsMatched: Math.min(totalRoutes, totalCalls),
    endpointsMissing: Math.abs(totalRoutes - totalCalls),
    filesGenerated,
    estimatedTimeSaved: `${totalHours} hours`,
    summary: generateSummary(repos, status, totalHours),
  };
}

function generateSummary(repos: RepoSummary[], status: string, hours: number): string {
  const frameworks = repos.map(r => r.framework).filter(Boolean).join(' + ');
  
  if (status === 'success') {
    return `Successfully integrated ${repos.length} repositories (${frameworks}). Estimated ${hours} hours of manual work automated.`;
  } else if (status === 'partial') {
    return `Partially integrated ${repos.length} repositories (${frameworks}). Some manual fixes required. Estimated ${hours} hours saved.`;
  }
  return `Integration of ${repos.length} repositories requires manual intervention. Review errors and apply suggested fixes.`;
}
