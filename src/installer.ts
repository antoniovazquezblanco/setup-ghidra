// SPDX-FileCopyrightText: 2026 Antonio Vázquez Blanco
// SPDX-License-Identifier: MIT

import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { retryWithBackoff } from "./retry.js";

async function downloadWithExtension(url: string): Promise<string> {
  const extension = path.extname(url);
  let assetPath = await retryWithBackoff(
    () => tc.downloadTool(url),
    (error: any) => {
      const status = error?.statusCode ?? error?.status;
      return typeof status === "number" && status >= 500;
    },
  );
  if (path.extname(assetPath) !== extension) {
    fs.renameSync(assetPath, assetPath + extension);
    return assetPath + extension;
  }
  return assetPath;
}

async function calculateSha256Hash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (error) => reject(error));
  });
}

export async function installFromUrl(
  url: string,
  sha256sum: string,
): Promise<string> {
  // Decide on a tool version based on the url...
  const version = crypto.createHash("sha1").update(url).digest("hex");

  // Check if the tool is in the cache...
  let ghidraPath = tc.find("ghidra", version);
  if (ghidraPath) {
    core.info(`Tool found in cache at '${ghidraPath}'...`);
    return ghidraPath;
  }

  // Tool is not in cache, install it...
  console.info(`Downloading Ghidra from ${url}`);
  let assetPath = await downloadWithExtension(url);

  if (sha256sum != "skip") {
    console.info(`Verifying downloaded file hash...`);
    let fileHash = await calculateSha256Hash(assetPath);
    console.info(`Downloaded file sha256sum is ${fileHash}`);
    if (fileHash != sha256sum)
      throw new Error("File validation error! SHA256 sum does not match!");
  }

  console.info(`Extracting Ghidra in ${assetPath}...`);
  ghidraPath = await tc.extractZip(assetPath, undefined);

  console.info(`Locating real Ghidra folder...`);
  ghidraPath = path.join(ghidraPath, fs.readdirSync(ghidraPath)[0]);

  // Let the cache know...
  console.info(`Caching Ghidra in ${ghidraPath}...`);
  return await tc.cacheDir(ghidraPath, "ghidra", version);
}

/**
 * Read a property out of the application.properties file of an installed
 * Ghidra distribution.
 *
 * The value of the first key in keys that is present and not empty is
 * returned. Otherwise a warning is logged and an empty string is returned, so
 * that an unexpected distribution layout never fails the action.
 */
function readApplicationProperty(
  ghidraPath: string,
  keys: string[],
  description: string,
  subject: string,
): string {
  const propertiesPath = path.join(
    ghidraPath,
    "Ghidra",
    "application.properties",
  );

  let properties = "";
  try {
    properties = fs.readFileSync(propertiesPath, "utf8");
  } catch {
    core.warning(
      `Could not read '${propertiesPath}'! Unable to determine ${subject}...`,
    );
    return "";
  }

  // Values are matched up to the end of their own line so that an empty
  // property, such as application.java.max, never takes the next line.
  for (const key of keys) {
    const regex = new RegExp(
      `^${key.replaceAll(".", "\\.")}[ \\t]*=(.*)$`,
      "m",
    );
    const value = properties.match(regex)?.[1].trim();
    if (value) return value;
  }

  core.warning(
    `Could not find ${description} in '${propertiesPath}'! Unable to determine ${subject}...`,
  );
  return "";
}

/**
 * Obtain the version of an installed Ghidra distribution.
 *
 * Every Ghidra distribution ships an application.properties file describing
 * itself. Reading the version from it makes the reported version accurate
 * regardless of how the distribution was located (release or download url).
 */
export function getInstalledVersion(ghidraPath: string): string {
  return readApplicationProperty(
    ghidraPath,
    ["application.version"],
    "an application version",
    "the installed Ghidra version",
  );
}

/**
 * Obtain the Java version required to build against an installed Ghidra.
 *
 * Ghidra's buildExtension.gradle sets the source and target compatibility of
 * extensions from application.java.compiler, so building them needs a JDK of
 * at least that version. Distributions lacking it fall back to the minimum
 * Java version they support.
 */
export function getRequiredJavaVersion(ghidraPath: string): string {
  return readApplicationProperty(
    ghidraPath,
    ["application.java.compiler", "application.java.min"],
    "a Java version",
    "the Java version required by the installed Ghidra",
  );
}
