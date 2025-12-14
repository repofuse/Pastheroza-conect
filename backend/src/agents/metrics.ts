import { RepoSummary } from './repoAnalysis.js';
import { MatchResult } from './interfaceMatching.js';
import { GeneratedCode } from './codeGeneration.js';
import { IntegrationResult } from './integration.js';
import { ValidationResult } from './validation.js';

export interface EconomicMetrics {
  timeSaved: {
    repoAnalysis: number;
    interfaceMatching: number;
    codeGeneration: number;
    integration: number;
    validation: number;
    total: number;
    unit: string;
  };
  tasksAutomated: string[];
  manualComparison: {
    task: string;
    manualTime: string;
    automatedTime: string;
    savings: string;
  }[];
  costSavings: {
    hourlyRate: number;
    totalHours: number;
    totalSavings: number;
    currency: string;
  };
  summary: string;
}

const HOURLY_RATE = 50; // Junior developer rate

export function calculateMetrics(
  repos: RepoSummary[],
  matchResult: MatchResult,
  generated: GeneratedCode,
  integration: IntegrationResult,
  validation: ValidationResult,
  pipelineDurationMs: number
): EconomicMetrics {
  // Time estimates (in hours) for manual work
  const repoAnalysisTime = repos.length * 1.5; // 1.5h per repo
  const interfaceMatchingTime = repos.length * 2; // 2h to manually compare APIs
  const codeGenerationTime = Object.keys(generated).length * 1; // 1h per generated file
  const integrationTime = 3; // 3h for docker-compose, env, scripts
  const validationTime = 2; // 2h for manual testing

  const totalManualHours = repoAnalysisTime + interfaceMatchingTime + 
    codeGenerationTime + integrationTime + validationTime;

  const tasksAutomated = [
    `Analyzed ${repos.length} repositories`,
    `Detected ${repos.filter(r => r.framework).length} frameworks`,
    `Extracted ${repos.reduce((sum, r) => sum + r.apiRoutes.length, 0)} API routes`,
    `Found ${matchResult.missingInBackend.length} missing endpoints`,
    `Generated ${Object.keys(generated).length} code files`,
    `Created ${integration.strategy} configuration`,
    `Validated integration with ${validation.errors.length} issues found`,
  ];

  const manualComparison = [
    {
      task: 'Repository Analysis',
      manualTime: `${repoAnalysisTime} hours`,
      automatedTime: `${(pipelineDurationMs / 1000 / repos.length).toFixed(1)} seconds`,
      savings: `${repoAnalysisTime} hours`,
    },
    {
      task: 'API Interface Matching',
      manualTime: `${interfaceMatchingTime} hours`,
      automatedTime: '< 1 second',
      savings: `${interfaceMatchingTime} hours`,
    },
    {
      task: 'Code Generation',
      manualTime: `${codeGenerationTime} hours`,
      automatedTime: '1-2 seconds',
      savings: `${codeGenerationTime} hours`,
    },
    {
      task: 'Integration Setup',
      manualTime: `${integrationTime} hours`,
      automatedTime: '< 1 second',
      savings: `${integrationTime} hours`,
    },
    {
      task: 'Validation & Testing',
      manualTime: `${validationTime} hours`,
      automatedTime: '< 1 second',
      savings: `${validationTime} hours`,
    },
  ];

  return {
    timeSaved: {
      repoAnalysis: repoAnalysisTime,
      interfaceMatching: interfaceMatchingTime,
      codeGeneration: codeGenerationTime,
      integration: integrationTime,
      validation: validationTime,
      total: totalManualHours,
      unit: 'hours',
    },
    tasksAutomated,
    manualComparison,
    costSavings: {
      hourlyRate: HOURLY_RATE,
      totalHours: totalManualHours,
      totalSavings: totalManualHours * HOURLY_RATE,
      currency: 'USD',
    },
    summary: `Automated integration of ${repos.length} repositories saved approximately ${totalManualHours} hours of manual work ($${totalManualHours * HOURLY_RATE} at $${HOURLY_RATE}/hr). Pipeline completed in ${(pipelineDurationMs / 1000).toFixed(1)} seconds.`,
  };
}
