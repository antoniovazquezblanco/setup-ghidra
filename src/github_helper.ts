import { Octokit } from "@octokit/rest";
import { getOctokitOptions } from "@actions/github/lib/utils.js";

export function getOctokit(auth_token?: string) {
  let options = {};
  if (auth_token) {
    options = getOctokitOptions(auth_token, options);
  }
  return new Octokit(options);
}

async function getRelease(
  octokit: Octokit,
  owner: string,
  repo: string,
  version: string,
): Promise<any> {
  if (version == "latest") {
    return getLatestRelease(octokit, owner, repo);
  } else {
    return getReleaseByTag(octokit, owner, repo, version);
  }
}

async function getLatestRelease(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<any> {
  let response = await octokit.rest.repos.getLatestRelease({
    owner: owner,
    repo: repo,
  });
  if (response.status != 200) {
    throw new Error(
      `Could not get the latest release from repo '${repo}' by the owner '${owner}'! Response status was ${response.status}...`,
    );
  }
  return response.data;
}

async function getReleaseByTag(
  octokit: Octokit,
  owner: string,
  repo: string,
  tag: string,
): Promise<any> {
  let tagName = `Ghidra_${tag}_build`;
  let response = await octokit.rest.repos.getReleaseByTag({
    owner: owner,
    repo: repo,
    tag: tagName,
  });
  if (response.status != 200) {
    throw new Error(
      `Could not find tag '${tagName}' in repo '${repo}' by the owner '${owner}'! Response status was ${response.status}...`,
    );
  }
  return response.data;
}

async function getReleaseDownloadUrl(release: any): Promise<string> {
  return release.assets[0].browser_download_url;
}

async function getReleaseSha256sum(release: any): Promise<string> {
  const matches = release.body.matchAll(/SHA-256: *`*([\da-fA-F]{64})`*/g);
  const match = matches.next();
  const sha256 = match.value[1];
  return sha256;
}

export async function getReleaseInfo(
  owner: string,
  repo: string,
  version: string,
  auth_token?: string,
): Promise<[string, string]> {
  const octokit = getOctokit(auth_token);
  const release = await getRelease(octokit, owner, repo, version);
  const url = await getReleaseDownloadUrl(release);
  const sha256sum = await getReleaseSha256sum(release);
  return [url, sha256sum];
}
