import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";

export async function installFromUrl(url: string): Promise<string> {
  // Check if the tool is in the cache...
  let ghidra_path = tc.find("ghidra", url);
  if (ghidra_path) {
    core.info(`Tool found in cache at '${ghidra_path}'...`);
    return ghidra_path;
  }

  // Tool is not in cache, install it...
  console.info(`Downloading Ghidra from ${url}`);
  let asset_path = await tc.downloadTool(url);
  ghidra_path = await tc.extractZip(asset_path, undefined);

  // Let the cache know...
  return await tc.cacheDir(ghidra_path, "ghidra", url);
}
