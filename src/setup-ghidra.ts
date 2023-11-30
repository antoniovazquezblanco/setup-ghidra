import * as core from "@actions/core";
import * as github from "./github";
import * as installer from "./installer";

async function run() {
  try {
    // Collect action parameters
    let download_url = core.getInput("download_url");
    let owner = core.getInput("owner");
    let repo = core.getInput("repo");
    let version = core.getInput("version");

    // First obtain a valid download url..
    if (!download_url) {
      core.debug("Using owner, repo and version inputs to locate a release...");
      download_url = await github.getReleaseUrlByVersion(owner, repo, version);
    } else {
      core.debug(
        "The download_url input was provided; ignoring owner, repo and version inputs...",
      );
    }

    // Install Ghidra
    let ghidra_path = installer.installFromUrl(download_url);

    // Set environmental variable
    core.exportVariable("GHIDRA_INSTALL_DIR", ghidra_path);
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

run();
