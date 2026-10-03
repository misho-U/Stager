/**
 * Waits for `promise` at most `ms` milliseconds, then rejects with an error
 * that names what took too long. The promise itself is not cancelled, only no
 * longer waited for; pass an AbortSignal to the call as well where it takes one.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
