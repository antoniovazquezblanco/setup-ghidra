import { Octokit } from "@octokit/rest";
import { getOctokitOptions } from "@actions/github/lib/utils";

export function getOctokit(auth_token?: string) {
  let options = {};
  if (auth_token) {
    options = getOctokitOptions(auth_token, options);
  }
  return new Octokit(options);
}

async function getReleaseDownloadUrl(
  octokit: Octokit,
  owner: string,
  repo: string,
  release_id: number,
): Promise<string> {
  let assets = await octokit.rest.repos.listReleaseAssets({
    owner: owner,
    repo: repo,
    release_id: release_id,
  });
  return assets.data[0].browser_download_url;
}

async function getReleaseUrlByTag(
  octokit: Octokit,
  owner: string,
  repo: string,
  tag: string,
): Promise<string> {
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
  return getReleaseDownloadUrl(octokit, owner, repo, response.data.id);
}

async function getLatestReleaseUrl(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string> {
  let response = await octokit.rest.repos.getLatestRelease({
    owner: owner,
    repo: repo,
  });
  if (response.status != 200) {
    throw new Error(
      `Could not get the latest release from repo '${repo}' by the owner '${owner}'! Response status was ${response.status}...`,
    );
  }
  return getReleaseDownloadUrl(octokit, owner, repo, response.data.id);
}

export async function getReleaseUrlByVersion(
  octokit: Octokit,
  owner: string,
  repo: string,
  version: string,
) {
  if (version == "latest") {
    return getLatestReleaseUrl(octokit, owner, repo);
  } else {
    return getReleaseUrlByTag(octokit, owner, repo, version);
  }
}
