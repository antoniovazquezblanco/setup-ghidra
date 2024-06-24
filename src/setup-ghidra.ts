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

    // Check parameters
    paramCheck(paramVersion, paramSha256sum, paramDownloadUrl);

    // First obtain a valid download url..
    let sha256sum = null;
    if (!paramDownloadUrl) {
      core.debug("Using owner, repo and version inputs to locate a release...");
      [paramDownloadUrl, sha256sum] = await github_helper.getReleaseInfo(
        paramOwner,
        paramRepo,
        paramVersion,
        paramAuthToken,
      );
    } else {
      core.debug(
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
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

run();
