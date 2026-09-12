// SPDX-FileCopyrightText: 2026 Antonio Vázquez Blanco
// SPDX-License-Identifier: MIT

import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { getOctokitOptions } from "@actions/github/lib/utils";
import { retryWithBackoff } from "./retry.js";

/**
 * Subset of the GitHub API that is needed to locate a release.
 *
 * Describing it structurally instead of depending on the Octokit type allows
 * the release lookup to be tested against a plain object.
 */
export type ReleaseApi = {
  rest: {
    repos: {
      getLatestRelease(params: any): Promise<any>;
      getReleaseByTag(params: any): Promise<any>;
    };
  };
};

export function getOctokit(auth_token?: string) {
  let options = {};
  if (auth_token) {
    options = getOctokitOptions(auth_token, options);
  }
  return new Octokit(options);
}

async function getRelease(
  api: ReleaseApi,
  owner: string,
  repo: string,
  version: string,
): Promise<any> {
  if (version == "latest") {
    return getLatestRelease(api, owner, repo);
  } else {
    return getReleaseByTag(api, owner, repo, version);
  }
}

async function getLatestRelease(
  api: ReleaseApi,
  owner: string,
  repo: string,
): Promise<any> {
  let response = await api.rest.repos.getLatestRelease({
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
  api: ReleaseApi,
  owner: string,
  repo: string,
  tag: string,
): Promise<any> {
  let tagName = `Ghidra_${tag}_build`;
  let response = await api.rest.repos.getReleaseByTag({
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

function getReleaseDownloadUrl(release: any): string {
  if (!release.assets || release.assets.length == 0) {
    throw new Error(
      `Release '${release.tag_name}' does not contain any downloadable asset!`,
    );
  }
  return release.assets[0].browser_download_url;
}

/**
 * Obtain the SHA256 sum that release notes advertise for the distribution.
 *
 * Returns an empty string if the release notes do not contain one so that
 * installations that do not need an online sum are still possible.
 */
function getReleaseSha256sum(release: any): string {
  const match = /SHA-256: *`*([\da-fA-F]{64})`*/.exec(release.body ?? "");
  if (!match) {
    return "";
  }
  return match[1];
}

export async function retryOnRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, (error: any) => {
    return error?.status === 403 && error?.message?.includes("rate limit");
  });
}

export async function getReleaseInfoWithApi(
  api: ReleaseApi,
  owner: string,
  repo: string,
  version: string,
): Promise<[string, string]> {
  const release = await retryOnRateLimit(() =>
    getRelease(api, owner, repo, version),
  );
  core.info(
    `Version '${version}' of '${owner}/${repo}' resolved to release '${release.tag_name}'...`,
  );
  return [getReleaseDownloadUrl(release), getReleaseSha256sum(release)];
}

export async function getReleaseInfo(
  owner: string,
  repo: string,
  version: string,
  auth_token?: string,
): Promise<[string, string]> {
  return getReleaseInfoWithApi(getOctokit(auth_token), owner, repo, version);
}
