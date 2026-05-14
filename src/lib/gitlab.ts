import { IPAMData } from './ipam';

export interface GitlabConfig {
  enabled: boolean;
  url: string;
  projectId: string;
  token: string;
  filePath: string;
  branch: string;
}

export const defaultGitlabConfig: GitlabConfig = {
  enabled: false,
  url: 'https://gitlab.com',
  projectId: '',
  token: '',
  filePath: 'ipam-data.json',
  branch: 'main',
};

export async function fetchFromGitlab(config: GitlabConfig, ref?: string): Promise<IPAMData | null> {
  const targetRef = ref || config.branch;
  const url = `${config.url}/api/v4/projects/${encodeURIComponent(config.projectId)}/repository/files/${encodeURIComponent(config.filePath)}/raw?ref=${targetRef}`;
  
  const response = await fetch(url, {
    headers: {
      'PRIVATE-TOKEN': config.token,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch from GitLab: ${response.statusText}`);
  }

  return await response.json();
}

export async function getGitlabCommits(config: GitlabConfig) {
  const url = `${config.url}/api/v4/projects/${encodeURIComponent(config.projectId)}/repository/commits?path=${encodeURIComponent(config.filePath)}&ref_name=${config.branch}`;
  
  const response = await fetch(url, {
    headers: {
      'PRIVATE-TOKEN': config.token,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch commits from GitLab: ${response.statusText}`);
  }
  
  return await response.json();
}

export async function saveToGitlab(config: GitlabConfig, data: IPAMData, commitMessage: string = "Update IPAM allocations via Web UI") {
  const baseUrl = `${config.url}/api/v4/projects/${encodeURIComponent(config.projectId)}/repository/files/${encodeURIComponent(config.filePath)}`;
  
  let method = 'POST';
  try {
    const checkResponse = await fetch(`${baseUrl}?ref=${config.branch}`, {
      headers: {
        'PRIVATE-TOKEN': config.token,
      },
    });
    if (checkResponse.ok) {
      method = 'PUT';
    } else if (checkResponse.status !== 404) {
      throw new Error(`GitLab check error: ${checkResponse.statusText}`);
    }
  } catch (e) {
    console.warn("Could not check GitLab file existence, defaulting to POST", e);
  }

  const payload = {
    branch: config.branch,
    content: JSON.stringify(data, null, 2),
    commit_message: commitMessage
  };

  const response = await fetch(baseUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'PRIVATE-TOKEN': config.token,
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to save to GitLab: ${response.statusText}`);
  }
}

