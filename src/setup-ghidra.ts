// SPDX-FileCopyrightText: 2026 Antonio Vázquez Blanco
// SPDX-License-Identifier: MIT

import * as core from "@actions/core";
import * as github_helper from "./github_helper.js";
import * as installer from "./installer.js";

const regexVersion = new RegExp("^\\d+(\\.\\d+)*(\\.\\d+)*$");
const regexSha256sum = new RegExp("^[\\da-fA-F]{64}$");

function paramCheck(
  paramVersion: string,
  paramSha256sum: string,
  paramDownloadUrl?: string,
): void {
  // Validate version parameter
  if (
    !paramDownloadUrl &&
    paramVersion != "latest" &&
    !regexVersion.test(paramVersion)
  )
    throw new Error(
      'Version parameter is not "latest" nor a valid semver format.',
    );

  // Validate sha256sum parameter
  if (
    paramDownloadUrl &&
    (paramSha256sum != "skip" || !regexSha256sum.test(paramSha256sum))
  )
    throw new Error(
      'Parameter sha256sum must be either "skip" or a valid hexadecimal sha256sum when using the download_url parameter.',
    );
  if (
    !paramDownloadUrl &&
    paramSha256sum != "skip" &&
    paramSha256sum != "online" &&
    !regexSha256sum.test(paramSha256sum)
  )
    throw new Error(
      'Parameter sha256sum must be either "skip", "online" or a valid hexadecimal sha256sum.',
    );
}

async function run() {
  try {
    // Collect action parameters
    let paramDownloadUrl = core.getInput("download_url");
    let paramOwner = core.getInput("owner");
    let paramRepo = core.getInput("repo");
    let paramVersion = core.getInput("version");
    let paramSha256sum = core.getInput("sha256sum");
    let paramAuthToken = core.getInput("auth_token");

    // Log the inputs so that a job log is enough to tell what the action was
    // asked to do. The auth token is never printed, only whether one was given.
    core.startGroup("Action inputs");
    core.info(`download_url: ${paramDownloadUrl || "(empty)"}`);
    core.info(`owner: ${paramOwner}`);
    core.info(`repo: ${paramRepo}`);
    core.info(`version: ${paramVersion}`);
    core.info(`sha256sum: ${paramSha256sum}`);
    core.info(`auth_token: ${paramAuthToken ? "(provided)" : "(empty)"}`);
    core.endGroup();

    // Check parameters
    paramCheck(paramVersion, paramSha256sum, paramDownloadUrl);

    // First obtain a valid download url..
    let sha256sum = null;
    if (!paramDownloadUrl) {
      core.info("Using owner, repo and version inputs to locate a release...");
      [paramDownloadUrl, sha256sum] = await github_helper.getReleaseInfo(
        paramOwner,
        paramRepo,
        paramVersion,
        paramAuthToken,
      );
      core.info(`Release download url is '${paramDownloadUrl}'...`);
      core.info(`Release sha256sum is '${sha256sum}'...`);
    } else {
      core.info(
        "The download_url input was provided; ignoring owner, repo and version inputs...",
      );
    }

    // Handle release validation
    if (paramSha256sum == "online") {
      if (!sha256sum || !regexSha256sum.test(sha256sum))
        throw new Error("Could not obtain an SHA256 sum online!");
      paramSha256sum = sha256sum;
    }

    // Install Ghidra
    let ghidraPath = await installer.installFromUrl(
      paramDownloadUrl,
      paramSha256sum,
    );

    // Set environmental variable
    core.exportVariable("GHIDRA_INSTALL_DIR", ghidraPath);

    // Set output
    let version = installer.getInstalledVersion(ghidraPath);
    core.setOutput("version", version);

    // Log the outputs so that they may be compared against the inputs that
    // produced them.
    core.startGroup("Action outputs");
    core.info(`version: ${version || "(unknown)"}`);
    core.info(`GHIDRA_INSTALL_DIR: ${ghidraPath}`);
    core.endGroup();
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

run();
