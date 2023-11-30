import * as github from "./github";

test("Verify Ghidra 10.4 download URL", async () => {
  const url = await github.getReleaseUrlByVersion(
    "NationalSecurityAgency",
    "ghidra",
    "10.4",
  );
  expect(url).toBe(
    "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_10.4_build/ghidra_10.4_PUBLIC_20230928.zip",
  );
});

test("Verify latest Ghidra URL", async () => {
  const url = await github.getReleaseUrlByVersion(
    "NationalSecurityAgency",
    "ghidra",
    "latest",
  );
  expect(url).toMatch(
    new RegExp(
      "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_[0-9.]+_build/ghidra_[0-9.]+_PUBLIC_[0-9]+.zip",
    ),
  );
});

test("Verify exception on wrong version", async () => {
  let thrown = false;
  try {
    const url = await github.getReleaseUrlByVersion(
      "NationalSecurityAgency",
      "ghidra",
      "dummyversion",
    );
  } catch (e) {
    thrown = true;
  }
  expect(thrown).toBe(true);
});
