import { fileURLToPath } from "url";
import * as path from "path";
import * as io from "@actions/io";
import * as github_helper from "./github_helper.js";
import * as installer from "./installer.js";
import * as fs from "fs";

describe("Installer tests", () => {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  let url = "";
  let sha256sum = "";

  beforeAll(async () => {
    // Modify process environment to include the needed variables to run...
    process.env["RUNNER_TOOL_CACHE"] = path.join(sourceDir, "runner", "tools");
    process.env["RUNNER_TEMP"] = path.join(sourceDir, "runner", "temp");

    // Get a valid info for installation...
    [url, sha256sum] = await github_helper.getReleaseInfo(
      "NationalSecurityAgency",
      "ghidra",
      "latest",
    );
  });

  afterAll(async () => {
    // After the tests, remove the runner directory
    await io.rmRF(path.join(sourceDir, "runner"));
  });

  it(
    "Installs Ghidra",
    async () => {
      let tool_path = await installer.installFromUrl(url, sha256sum);
      expect(fs.existsSync(path.join(tool_path, "ghidraRun"))).toBe(true);
    },
    20 * 60 * 1000,
  );
});
