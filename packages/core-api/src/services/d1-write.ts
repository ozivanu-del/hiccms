const RETRY_DELAYS_MS = [75, 225]

const isRetryableD1WriteError = (error: unknown): boolean => {
  const message = String(error).toLowerCase()
  return message.includes('network connection lost')
    || message.includes('storage operation exceeded timeout')
    || message.includes('storage caused object to be reset')
    || message.includes('reset because its code was updated')
    || message.includes('d1 db is overloaded')
}

const wait = (delayMs: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, delayMs)
})

export const runD1WriteWithRetry = async <T>(operation: () => Promise<T>, operationName: string): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      const delayMs = RETRY_DELAYS_MS[attempt]
      if (delayMs === undefined || !isRetryableD1WriteError(error)) throw error
      console.warn('Retrying transient D1 write', {
        operation: operationName,
        attempt: attempt + 2,
        delayMs,
        error: String(error),
      })
      await wait(delayMs + Math.floor(Math.random() * 50))
    }
  }
}
