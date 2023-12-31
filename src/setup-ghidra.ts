import * as core from "@actions/core";
import * as github from "@actions/github";
import * as github_helper from "./github_helper";
import * as installer from "./installer";

async function run() {
  try {
    // Collect action parameters
    let download_url = core.getInput("download_url");
    let owner = core.getInput("owner");
    let repo = core.getInput("repo");
    let version = core.getInput("version");
    let auth_token = core.getInput("auth_token");

    // First obtain a valid download url..
    if (!download_url) {
      core.debug("Using owner, repo and version inputs to locate a release...");
      const octokit = github.getOctokit(auth_token);
      download_url = await github_helper.getReleaseUrlByVersion(
        octokit,
        owner,
        repo,
        version,
      );
    } else {
      core.debug(
        "The download_url input was provided; ignoring owner, repo and version inputs...",
      );
    }

    // Install Ghidra
    let ghidra_path = await installer.installFromUrl(download_url);

    // Set environmental variable
    core.exportVariable("GHIDRA_INSTALL_DIR", ghidra_path);
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

run();
