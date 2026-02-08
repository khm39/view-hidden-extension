/**
 * Logger utility for development mode logging
 * In production builds, logs are suppressed
 */

const isDev = process.env.NODE_ENV === "development"

export const logger = {
  error(context: string, error: unknown): void {
    if (isDev) {
      console.error(`[ViewHidden] ${context}:`, error)
    }
  },

  warn(context: string, message: string): void {
    if (isDev) {
      console.warn(`[ViewHidden] ${context}:`, message)
    }
  },

  debug(context: string, message: string, data?: unknown): void {
    if (isDev) {
      if (data !== undefined) {
        console.debug(`[ViewHidden] ${context}:`, message, data)
      } else {
        console.debug(`[ViewHidden] ${context}:`, message)
      }
    }
  }
}
