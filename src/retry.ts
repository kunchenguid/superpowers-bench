export interface RetryRunResult {
  exitCode: number;
  timedOut: boolean;
  attempt: number;
}

export async function retryRun<T extends RetryRunResult>(
  runOnce: (attempt: number) => Promise<T>,
  maxRetries: number,
  onRetry?: (result: T) => void | Promise<void>,
): Promise<T> {
  const maxAttempts = maxRetries + 1;
  let lastResult: T | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await runOnce(attempt);
    if (!result.timedOut && result.exitCode === 0) {
      return result;
    }

    lastResult = result;
    if (attempt < maxAttempts) {
      await onRetry?.(result);
    }
  }

  return lastResult!;
}
