export function withTimeout(promise, timeoutMs, message = "Operation timed out") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs)
    )
  ]);
}
