import * as github_helper from "./github_helper.js";

test("Oktokit getter, no token", () => {
  const octokit = github_helper.getOctokit();
  expect(octokit).not.toBe(null);
});

test("Oktokit getter, with token", () => {
  const octokit = github_helper.getOctokit("dummy_fake_token");
  expect(octokit).not.toBe(null);
});

test("Verify Ghidra 11.0 release info", async () => {
  const [url, sha256] = await github_helper.getReleaseInfo(
    "NationalSecurityAgency",
    "ghidra",
    "11.1",
  );
  expect(url).toBe(
    "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.1_build/ghidra_11.1_PUBLIC_20240607.zip",
  );
  expect(sha256).toBe(
    "293f60e04fa480315d2c467f4b2b4b10b3b6b5c8a8416bf7167fe082406e3be8",
  );
});

test("Verify latest Ghidra release info", async () => {
  const [url, sha256] = await github_helper.getReleaseInfo(
    "NationalSecurityAgency",
    "ghidra",
    "latest",
  );
  expect(url).toMatch(
    new RegExp(
      "^https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_[0-9.]+_build/ghidra_[0-9.]+_PUBLIC_[0-9]+.zip$",
    ),
  );
  expect(sha256).toMatch(new RegExp("^[0-9a-fA-F]{64}$"));
});

test("Verify exception on wrong version", async () => {
  let thrown = false;
  try {
    const url = await github_helper.getReleaseInfo(
      "NationalSecurityAgency",
      "ghidra",
      "dummyversion",
    );
  } catch (e) {
    thrown = true;
  }
  expect(thrown).toBe(true);
});
