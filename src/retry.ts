import { warning } from "@actions/core";

export const INITIAL_RETRY_DELAY_MS = 5000;
export const MAX_TOTAL_RETRY_DELAY_MS = 300000;

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  isRetryable: (error: any) => boolean,
): Promise<T> {
  let totalDelayMs = 0;
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (!isRetryable(error)) {
        throw error;
      }

      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      totalDelayMs += delayMs;

      if (totalDelayMs > MAX_TOTAL_RETRY_DELAY_MS) {
        throw new Error(
          `Request failed after retrying for over ${MAX_TOTAL_RETRY_DELAY_MS / 1000} seconds. Original error: ${error.message}`,
        );
      }

      warning(
        `Retryable error encountered. Retrying in ${delayMs / 1000} seconds... (attempt ${attempt + 1})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
}
