export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'conect API',
    version: '1.0.0',
    description: 'AI-powered multi-agent system for integrating multiple GitHub repositories',
  },
  servers: [
    { url: 'https://conect.api.hurated.com', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: {
          200: {
            description: 'Service is healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
    '/api/repos': {
      get: {
        summary: 'List all repositories',
        tags: ['Repositories'],
        responses: {
          200: {
            description: 'List of repositories',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RepoList' } } },
          },
        },
      },
      post: {
        summary: 'Add a repository',
        tags: ['Repositories'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddRepoRequest' } } },
        },
        responses: {
          200: { description: 'Repository added', content: { 'application/json': { schema: { $ref: '#/components/schemas/AddRepoResponse' } } } },
          400: { description: 'URL required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/repos/{id}': {
      delete: {
        summary: 'Delete a repository',
        tags: ['Repositories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Repository deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/analyze': {
      post: {
        summary: 'Analyze all repositories',
        tags: ['Pipeline'],
        responses: {
          200: { description: 'Analysis results', content: { 'application/json': { schema: { $ref: '#/components/schemas/AnalyzeResponse' } } } },
        },
      },
    },
    '/api/match': {
      post: {
        summary: 'Match frontend/backend interfaces',
        tags: ['Pipeline'],
        responses: {
          200: { description: 'Match results', content: { 'application/json': { schema: { $ref: '#/components/schemas/MatchResponse' } } } },
          400: { description: 'No analyzed repos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/generate': {
      post: {
        summary: 'Generate glue code',
        tags: ['Pipeline'],
        responses: {
          200: { description: 'Generated code', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateResponse' } } } },
          400: { description: 'No analyzed repos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/integrate': {
      post: {
        summary: 'Generate integration config',
        tags: ['Pipeline'],
        responses: {
          200: { description: 'Integration config', content: { 'application/json': { schema: { $ref: '#/components/schemas/IntegrateResponse' } } } },
          400: { description: 'No analyzed repos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/validate': {
      post: {
        summary: 'Validate integration',
        tags: ['Pipeline'],
        responses: {
          200: { description: 'Validation results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidateResponse' } } } },
          400: { description: 'No analyzed repos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/run-all': {
      post: {
        summary: 'Run full pipeline (JSON)',
        tags: ['Pipeline'],
        responses: {
          200: { description: 'Full pipeline results', content: { 'application/json': { schema: { $ref: '#/components/schemas/RunAllResponse' } } } },
          400: { description: 'No repos added', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/run-all/stream': {
      get: {
        summary: 'Run full pipeline (SSE stream)',
        tags: ['Pipeline'],
        responses: {
          200: { description: 'SSE stream of progress messages', content: { 'text/event-stream': { schema: { $ref: '#/components/schemas/SSEMessage' } } } },
          400: { description: 'No repos added', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/reset': {
      post: {
        summary: 'Reset all data',
        tags: ['System'],
        responses: {
          200: { description: 'Reset successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
        },
      },
    },
    '/api/history': {
      get: {
        summary: 'Get git commit history',
        tags: ['System'],
        responses: {
          200: { description: 'Git history for all repos', content: { 'application/json': { schema: { $ref: '#/components/schemas/HistoryResponse' } } } },
          400: { description: 'No repos added', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
  components: {
    schemas: {
      Health: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' } } },
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Success: { type: 'object', properties: { success: { type: 'boolean' } } },
      AddRepoRequest: { type: 'object', required: ['url'], properties: { url: { type: 'string', example: 'https://github.com/user/repo' } } },
      AddRepoResponse: { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' }, addedAt: { type: 'string' } } },
      RepoList: { type: 'object', properties: { repos: { type: 'array', items: { $ref: '#/components/schemas/Repo' } } } },
      Repo: { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' }, addedAt: { type: 'string' }, summary: { $ref: '#/components/schemas/RepoSummary' } } },
      RepoSummary: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          language: { type: 'string' },
          framework: { type: 'string' },
          entryPoints: { type: 'array', items: { type: 'string' } },
          apiRoutes: { type: 'array', items: { type: 'string' } },
          apiCalls: { type: 'array', items: { $ref: '#/components/schemas/ApiCall' } },
          configFiles: { type: 'array', items: { type: 'string' } },
          envVars: { type: 'array', items: { type: 'string' } },
          dependencies: { type: 'object' },
        },
      },
      ApiCall: { type: 'object', properties: { method: { type: 'string' }, path: { type: 'string' }, file: { type: 'string' } } },
      AnalyzeResponse: { type: 'object', properties: { results: { type: 'array', items: { $ref: '#/components/schemas/RepoSummary' } } } },
      MatchResponse: {
        type: 'object',
        properties: {
          matched: { type: 'array', items: { type: 'object' } },
          missingInBackend: { type: 'array', items: { $ref: '#/components/schemas/ApiCall' } },
          unusedInBackend: { type: 'array', items: { type: 'string' } },
        },
      },
      GenerateResponse: {
        type: 'object',
        properties: {
          apiClient: { type: 'string' },
          corsConfig: { type: 'string' },
          missingEndpoints: { type: 'string' },
          sharedTypes: { type: 'string' },
        },
      },
      IntegrateResponse: {
        type: 'object',
        properties: {
          strategy: { type: 'string', enum: ['monorepo', 'docker-compose'] },
          envFile: { type: 'string' },
          startupScript: { type: 'string' },
          dockerCompose: { type: 'string' },
          projectStructure: { type: 'array', items: { type: 'string' } },
        },
      },
      ValidateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          errors: { type: 'array', items: { type: 'string' } },
          fixes: { type: 'array', items: { type: 'string' } },
          report: { $ref: '#/components/schemas/Report' },
        },
      },
      Report: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['success', 'partial', 'failed'] },
          reposAnalyzed: { type: 'number' },
          endpointsMatched: { type: 'number' },
          endpointsMissing: { type: 'number' },
          filesGenerated: { type: 'array', items: { type: 'string' } },
          estimatedTimeSaved: { type: 'string' },
          summary: { type: 'string' },
        },
      },
      Metrics: {
        type: 'object',
        properties: {
          timeSaved: { type: 'object', properties: { total: { type: 'number' }, unit: { type: 'string' } } },
          tasksAutomated: { type: 'array', items: { type: 'string' } },
          costSavings: { type: 'object', properties: { totalSavings: { type: 'number' }, currency: { type: 'string' } } },
          summary: { type: 'string' },
        },
      },
      RunAllResponse: {
        type: 'object',
        properties: {
          logs: { type: 'array', items: { type: 'object' } },
          analysis: { type: 'array', items: { $ref: '#/components/schemas/RepoSummary' } },
          matching: { $ref: '#/components/schemas/MatchResponse' },
          generated: { $ref: '#/components/schemas/GenerateResponse' },
          integration: { $ref: '#/components/schemas/IntegrateResponse' },
          validation: { $ref: '#/components/schemas/ValidateResponse' },
          metrics: { $ref: '#/components/schemas/Metrics' },
        },
      },
      SSEMessage: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
          timestamp: { type: 'string' },
        },
      },
      HistoryResponse: {
        type: 'object',
        properties: {
          history: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                repo: { type: 'string' },
                commits: { type: 'array', items: { $ref: '#/components/schemas/Commit' } },
              },
            },
          },
        },
      },
      Commit: {
        type: 'object',
        properties: {
          hash: { type: 'string' },
          message: { type: 'string' },
          date: { type: 'string' },
          author: { type: 'string' },
        },
      },
    },
  },
};
