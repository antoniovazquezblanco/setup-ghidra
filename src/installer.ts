import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

async function downloadWithExtension(url: string): Promise<string> {
  const extension = path.extname(url);
  let assetPath = await tc.downloadTool(url);
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
