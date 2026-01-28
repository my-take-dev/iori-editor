/**
 * Extract error message from unknown error type
 * Handles Error objects, strings, and Wails error objects
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message
  }
  if (typeof err === 'string') {
    return err
  }
  // Handle Wails error objects that may have a message property
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}
