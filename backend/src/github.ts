const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG || 'repofuse';

interface ForkResult {
  forkUrl: string;
  forkFullName: string;
}

interface PRResult {
  prUrl: string;
  prNumber: number;
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

export async function forkRepo(repoUrl: string): Promise<ForkResult> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new Error('Invalid GitHub URL');

  const { owner, repo } = parsed;
  const forkName = `${owner}-${repo}`;

  // Check if fork already exists
  const existingFork = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${forkName}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });

  if (existingFork.ok) {
    return {
      forkUrl: `https://github.com/${GITHUB_ORG}/${forkName}`,
      forkFullName: `${GITHUB_ORG}/${forkName}`,
    };
  }

  // Create fork
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/forks`, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organization: GITHUB_ORG,
      name: forkName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Fork failed: ${error.message || response.statusText}`);
  }

  const fork = await response.json();
  return {
    forkUrl: fork.html_url,
    forkFullName: fork.full_name,
  };
}

export async function createBranch(forkFullName: string, branchName: string): Promise<void> {
  // Get default branch SHA
  const repoRes = await fetch(`https://api.github.com/repos/${forkFullName}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  const refRes = await fetch(`https://api.github.com/repos/${forkFullName}/git/refs/heads/${defaultBranch}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  const refData = await refRes.json();
  const sha = refData.object.sha;

  // Create new branch
  await fetch(`https://api.github.com/repos/${forkFullName}/git/refs`, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha,
    }),
  });
}

export async function commitFile(
  forkFullName: string,
  branch: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  // Check if file exists
  const existingRes = await fetch(`https://api.github.com/repos/${forkFullName}/contents/${path}?ref=${branch}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  
  const body: any = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  };

  if (existingRes.ok) {
    const existing = await existingRes.json();
    body.sha = existing.sha;
  }

  const response = await fetch(`https://api.github.com/repos/${forkFullName}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Commit failed: ${error.message}`);
  }
}

export async function createPR(
  originalOwner: string,
  originalRepo: string,
  forkFullName: string,
  branch: string,
  title: string,
  body: string
): Promise<PRResult> {
  const [forkOwner] = forkFullName.split('/');

  const response = await fetch(`https://api.github.com/repos/${originalOwner}/${originalRepo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      head: `${forkOwner}:${branch}`,
      base: 'main',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    // Try with 'master' if 'main' fails
    if (error.message?.includes('base')) {
      const retryRes = await fetch(`https://api.github.com/repos/${originalOwner}/${originalRepo}/pulls`, {
        method: 'POST',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          head: `${forkOwner}:${branch}`,
          base: 'master',
        }),
      });
      if (retryRes.ok) {
        const pr = await retryRes.json();
        return { prUrl: pr.html_url, prNumber: pr.number };
      }
    }
    throw new Error(`PR creation failed: ${error.message}`);
  }

  const pr = await response.json();
  return { prUrl: pr.html_url, prNumber: pr.number };
}
