// SPDX-FileCopyrightText: 2026 Antonio Vázquez Blanco
// SPDX-License-Identifier: MIT

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
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

    // Get a valid info for installation. Any available token is used to avoid
    // the rate limits that unauthenticated API usage is subject to...
    [url, sha256sum] = await github_helper.getReleaseInfo(
      "NationalSecurityAgency",
      "ghidra",
      "latest",
      process.env["GITHUB_TOKEN"],
    );
  }, 60 * 1000);

  afterAll(async () => {
    // After the tests, remove the runner directory
    await io.rmRF(path.join(sourceDir, "runner"));
  });

  it(
    "Installs Ghidra",
    async () => {
      let tool_path = await installer.installFromUrl(url, sha256sum);
      expect(fs.existsSync(path.join(tool_path, "ghidraRun"))).toBe(true);
      expect(installer.getInstalledVersion(tool_path)).toMatch(/^\d+(\.\d+)*$/);
    },
    20 * 60 * 1000,
  );
});

describe("Installed version tests", () => {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const fixturesDir = path.join(sourceDir, "fixtures");

  function createInstallation(name: string, properties?: string): string {
    const installDir = path.join(fixturesDir, name);
    if (properties === undefined) {
      fs.mkdirSync(installDir, { recursive: true });
      return installDir;
    }
    const appDir = path.join(installDir, "Ghidra");
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, "application.properties"), properties);
    return installDir;
  }

  afterAll(async () => {
    // After the tests, remove the fixtures directory
    await io.rmRF(fixturesDir);
  });

  it("Reads the version out of application.properties", () => {
    const installDir = createInstallation(
      "release",
      "application.name=Ghidra\napplication.version=11.3.2\napplication.release.name=PUBLIC\n",
    );
    expect(installer.getInstalledVersion(installDir)).toBe("11.3.2");
  });

  it("Reads the version out of CRLF terminated files", () => {
    const installDir = createInstallation(
      "crlf",
      "application.name=Ghidra\r\napplication.version=12.1\r\n",
    );
    expect(installer.getInstalledVersion(installDir)).toBe("12.1");
  });

  it("Returns an empty version if application.properties is missing", () => {
    const installDir = createInstallation("missing_file");
    expect(installer.getInstalledVersion(installDir)).toBe("");
  });

  it("Returns an empty version if the version property is missing", () => {
    const installDir = createInstallation(
      "missing_property",
      "application.name=Ghidra\napplication.release.name=PUBLIC\n",
    );
    expect(installer.getInstalledVersion(installDir)).toBe("");
  });
});
