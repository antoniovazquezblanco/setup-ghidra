// SPDX-FileCopyrightText: 2026 Antonio Vázquez Blanco
// SPDX-License-Identifier: MIT

import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { retryWithBackoff } from "./retry.js";
import * as github_helper from "./github_helper.js";

const dummySha256sum =
  "293f60e04fa480315d2c467f4b2b4b10b3b6b5c8a8416bf7167fe082406e3be8";

function createRateLimitError(): Error & { status: number } {
  const error: any = new Error(
    "API rate limit exceeded for 1.2.3.4. (But here's the good news: Authenticated requests get a higher rate limit.)",
  );
  error.status = 403;
  return error;
}

function createNotFoundError(): Error & { status: number } {
  const error: any = new Error("Not Found");
  error.status = 404;
  return error;
}

function createServerError(statusCode: number): Error & { statusCode: number } {
  const error: any = new Error(`HTTP ${statusCode}: Internal Server Error`);
  error.statusCode = statusCode;
  return error;
}

/**
 * Build a release payload shaped like the ones the GitHub API returns for
 * Ghidra releases.
 */
function createRelease(version: string, overrides: any = {}): any {
  const tagName = `Ghidra_${version}_build`;
  return {
    tag_name: tagName,
    draft: false,
    prerelease: false,
    body: `* SHA-256: \`${dummySha256sum}\``,
    assets: [
      {
        browser_download_url: `https://github.com/NationalSecurityAgency/ghidra/releases/download/${tagName}/ghidra_${version}_PUBLIC_20260101.zip`,
      },
    ],
    ...overrides,
  };
}

/**
 * Build a fake GitHub API.
 *
 * Releases are served in the given order, which mimics the API listing them
 * newest created first and reporting the first one as the latest release.
 */
function createApi(releases: any[], overrides: any = {}) {
  return {
    rest: {
      repos: {
        getLatestRelease: jest.fn(async (_params: any) => ({
          status: 200,
          data: releases[0],
        })),
        getReleaseByTag: jest.fn(async (params: any) => {
          const release = releases.find((r) => r.tag_name == params.tag);
          if (!release) {
            throw createNotFoundError();
          }
          return { status: 200, data: release };
        }),
        ...overrides,
      },
    },
  };
}

describe("getReleaseInfoWithApi", () => {
  test("resolves a version into its release assets", async () => {
    const api = createApi([createRelease("12.1.3"), createRelease("11.1")]);

    const [url, sha256] = await github_helper.getReleaseInfoWithApi(
      api,
      "NationalSecurityAgency",
      "ghidra",
      "11.1",
    );

    expect(api.rest.repos.getReleaseByTag).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "NationalSecurityAgency",
        repo: "ghidra",
        tag: "Ghidra_11.1_build",
      }),
    );
    expect(url).toBe(
      "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.1_build/ghidra_11.1_PUBLIC_20260101.zip",
    );
    expect(sha256).toBe(dummySha256sum);
  });

  test("resolves 'latest' to the release GitHub reports as latest", async () => {
    const api = createApi([createRelease("12.1.3"), createRelease("11.1")]);

    const [url, sha256] = await github_helper.getReleaseInfoWithApi(
      api,
      "NationalSecurityAgency",
      "ghidra",
      "latest",
    );

    expect(api.rest.repos.getLatestRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "NationalSecurityAgency",
        repo: "ghidra",
      }),
    );
    expect(api.rest.repos.getReleaseByTag).not.toHaveBeenCalled();
    expect(url).toContain("Ghidra_12.1.3_build");
    expect(sha256).toBe(dummySha256sum);
  });

  test("throws if the latest release can not be obtained", async () => {
    const api = createApi([createRelease("12.1.3")], {
      getLatestRelease: jest.fn(async (_params: any) => ({
        status: 404,
        data: null,
      })),
    });

    await expect(
      github_helper.getReleaseInfoWithApi(
        api,
        "NationalSecurityAgency",
        "ghidra",
        "latest",
      ),
    ).rejects.toThrow("Could not get the latest release");
  });

  test("throws if the requested version does not exist", async () => {
    const api = createApi([createRelease("12.1.3")]);

    await expect(
      github_helper.getReleaseInfoWithApi(
        api,
        "NationalSecurityAgency",
        "ghidra",
        "dummyversion",
      ),
    ).rejects.toThrow("Not Found");
  });

  test("throws if the release has no downloadable asset", async () => {
    const api = createApi([createRelease("11.1", { assets: [] })]);

    await expect(
      github_helper.getReleaseInfoWithApi(
        api,
        "NationalSecurityAgency",
        "ghidra",
        "11.1",
      ),
    ).rejects.toThrow("does not contain any downloadable asset");
  });

  test("returns no sha256sum if release notes do not advertise one", async () => {
    const api = createApi([
      createRelease("11.1", { body: "No sums around here..." }),
    ]);

    const [, sha256] = await github_helper.getReleaseInfoWithApi(
      api,
      "NationalSecurityAgency",
      "ghidra",
      "11.1",
    );

    expect(sha256).toBe("");
  });

  test("reads sha256sums that are not enclosed in backticks", async () => {
    const api = createApi([
      createRelease("11.1", { body: `SHA-256: ${dummySha256sum}` }),
    ]);

    const [, sha256] = await github_helper.getReleaseInfoWithApi(
      api,
      "NationalSecurityAgency",
      "ghidra",
      "11.1",
    );

    expect(sha256).toBe(dummySha256sum);
  });
});

describe("retryWithBackoff", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("returns result immediately on success", async () => {
    const result = await retryWithBackoff(
      async () => "ok",
      () => true,
    );
    expect(result).toBe("ok");
  });

  test("retries on retryable error and succeeds", async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls <= 1) throw createRateLimitError();
      return "ok";
    });

    const promise = retryWithBackoff(fn, () => true);
    await jest.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("retries multiple times with exponential backoff", async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls <= 3) throw createRateLimitError();
      return "ok";
    });

    const promise = retryWithBackoff(fn, () => true);
    await jest.advanceTimersByTimeAsync(5000);
    await jest.advanceTimersByTimeAsync(10000);
    await jest.advanceTimersByTimeAsync(20000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(4);
  });

  test("does not retry when predicate returns false", async () => {
    const error = createNotFoundError();

    const fn = jest.fn(async () => {
      throw error;
    });

    await expect(
      retryWithBackoff(fn, (e: any) => e.status === 403),
    ).rejects.toThrow("Not Found");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("gives up after max total delay exceeded", async () => {
    const fn = jest.fn(async () => {
      throw createRateLimitError();
    });

    const promise = retryWithBackoff(fn, () => true);
    promise.catch(() => {});

    await jest.advanceTimersByTimeAsync(5000);
    await jest.advanceTimersByTimeAsync(10000);
    await jest.advanceTimersByTimeAsync(20000);
    await jest.advanceTimersByTimeAsync(40000);
    await jest.advanceTimersByTimeAsync(80000);

    await expect(promise).rejects.toThrow("Request failed after retrying");
    expect(fn).toHaveBeenCalledTimes(6);
  });

  test("retries on server errors (5xx)", async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls <= 2) throw createServerError(503);
      return "ok";
    });

    const promise = retryWithBackoff(fn, (error: any) => {
      const status = error?.statusCode ?? error?.status;
      return typeof status === "number" && status >= 500;
    });
    await jest.advanceTimersByTimeAsync(5000);
    await jest.advanceTimersByTimeAsync(10000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("retryOnRateLimit (github_helper)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("retries on rate limit 403 and succeeds", async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls <= 1) throw createRateLimitError();
      return "ok";
    });

    const promise = github_helper.retryOnRateLimit(fn);
    await jest.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("retries a rate limited release lookup", async () => {
    let calls = 0;
    const api = createApi([createRelease("12.1.3")], {
      getLatestRelease: jest.fn(async (_params: any) => {
        calls++;
        if (calls <= 1) throw createRateLimitError();
        return { status: 200, data: createRelease("12.1.3") };
      }),
    });

    const promise = github_helper.getReleaseInfoWithApi(
      api,
      "NationalSecurityAgency",
      "ghidra",
      "latest",
    );
    await jest.advanceTimersByTimeAsync(5000);
    const [url] = await promise;

    expect(url).toContain("Ghidra_12.1.3_build");
    expect(api.rest.repos.getLatestRelease).toHaveBeenCalledTimes(2);
  });

  test("does not retry on non-rate-limit 403", async () => {
    const error: any = new Error("Forbidden");
    error.status = 403;

    const fn = jest.fn(async () => {
      throw error;
    });

    await expect(github_helper.retryOnRateLimit(fn)).rejects.toThrow(
      "Forbidden",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("does not retry on non-403 errors", async () => {
    const fn = jest.fn(async () => {
      throw createNotFoundError();
    });

    await expect(github_helper.retryOnRateLimit(fn)).rejects.toThrow(
      "Not Found",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

test("Oktokit getter, no token", () => {
  const octokit = github_helper.getOctokit();
  expect(octokit).not.toBe(null);
});

test("Oktokit getter, with token", () => {
  const octokit = github_helper.getOctokit("dummy_fake_token");
  expect(octokit).not.toBe(null);
});

/**
 * The tests below talk to the real GitHub API. Unauthenticated API usage is
 * rate limited per IP address, and that limit is easily exhausted in shared CI
 * runners, so any available token is used to authenticate the requests.
 */
describe("Live GitHub API", () => {
  const authToken = process.env["GITHUB_TOKEN"];
  const liveTestTimeoutMs = 60 * 1000;

  test(
    "Verify Ghidra 11.1 release info",
    async () => {
      const [url, sha256] = await github_helper.getReleaseInfo(
        "NationalSecurityAgency",
        "ghidra",
        "11.1",
        authToken,
      );
      expect(url).toBe(
        "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.1_build/ghidra_11.1_PUBLIC_20240607.zip",
      );
      expect(sha256).toBe(
        "293f60e04fa480315d2c467f4b2b4b10b3b6b5c8a8416bf7167fe082406e3be8",
      );
    },
    liveTestTimeoutMs,
  );

  test(
    "Verify latest Ghidra release info",
    async () => {
      const [url, sha256] = await github_helper.getReleaseInfo(
        "NationalSecurityAgency",
        "ghidra",
        "latest",
        authToken,
      );
      expect(url).toMatch(
        new RegExp(
          "^https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_[0-9.]+_build/ghidra_[0-9.]+_PUBLIC_[0-9]+.zip$",
        ),
      );
      expect(sha256).toMatch(new RegExp("^[0-9a-fA-F]{64}$"));
    },
    liveTestTimeoutMs,
  );

  test(
    "Verify exception on wrong version",
    async () => {
      await expect(
        github_helper.getReleaseInfo(
          "NationalSecurityAgency",
          "ghidra",
          "dummyversion",
          authToken,
        ),
      ).rejects.toThrow();
    },
    liveTestTimeoutMs,
  );
});
