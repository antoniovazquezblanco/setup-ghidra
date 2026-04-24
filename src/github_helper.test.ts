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

function createRateLimitError(): Error & { status: number } {
  const error: any = new Error(
    "API rate limit exceeded for 1.2.3.4. (But here's the good news: Authenticated requests get a higher rate limit.)",
  );
  error.status = 403;
  return error;
}

function createServerError(statusCode: number): Error & { statusCode: number } {
  const error: any = new Error(`HTTP ${statusCode}: Internal Server Error`);
  error.statusCode = statusCode;
  return error;
}

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
    const error: any = new Error("Not Found");
    error.status = 404;

    const fn = jest.fn(async () => {
      throw error;
    });

    await expect(retryWithBackoff(fn, (e) => e.status === 403)).rejects.toThrow(
      "Not Found",
    );
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
    const error: any = new Error("Not Found");
    error.status = 404;

    const fn = jest.fn(async () => {
      throw error;
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
