import path = require("path");
import io = require("@actions/io");
import * as github from "./github";
import * as installer from "./installer";
import * as fs from 'fs';

describe("Installer tests", () => {
  let url = "";

  beforeAll(async () => {
    // Modify process environment to include the needed variables to run...
    process.env["RUNNER_TOOL_CACHE"] = path.join(__dirname, "runner", "tools");
    process.env["RUNNER_TEMP"] = path.join(__dirname, "runner", "temp");

    // Get a valid URL for installation...
    url = await github.getReleaseUrlByVersion(
      "NationalSecurityAgency",
      "ghidra",
      "latest",
    );
  });

  afterAll(async () => {
    // After the tests, remove the runner directory
    await io.rmRF(path.join(__dirname, "runner"));
  });

  it("Installs Ghidra", async () => {
    let tool_path = await installer.installFromUrl(url);
    expect(fs.existsSync(path.join(tool_path, "ghidraRun"))).toBe(true);
  }, 10*60*1000);
});
