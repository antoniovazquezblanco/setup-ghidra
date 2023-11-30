import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

async function downloadWithExtension(url: string): Promise<string> {
  const extension = path.extname(url);
  let asset_path = await tc.downloadTool(url);
  if (path.extname(asset_path) !== extension) {
    fs.renameSync(asset_path, asset_path + extension);
    return asset_path + extension;
  }
  return asset_path;
}

export async function installFromUrl(url: string): Promise<string> {
  // Decide on a tool version based on the url...
  const version = crypto.createHash('sha1').update(url).digest('hex');

  // Check if the tool is in the cache...
  let ghidra_path = tc.find("ghidra", version);
  if (ghidra_path) {
    core.info(`Tool found in cache at '${ghidra_path}'...`);
    return ghidra_path;
  }

  // Tool is not in cache, install it...
  console.info(`Downloading Ghidra from ${url}`);
  let asset_path = await downloadWithExtension(url);
  console.info(`Extracting Ghidra in ${asset_path}...`);
  ghidra_path = await tc.extractZip(asset_path, undefined);
  console.info(`Locating real Ghidra folder...`)
  ghidra_path = path.join(ghidra_path, fs.readdirSync(ghidra_path)[0]);

  // Let the cache know...
  console.info(`Caching Ghidra in ${ghidra_path}...`);
  return tc.cacheDir(ghidra_path, "ghidra", version);
}
