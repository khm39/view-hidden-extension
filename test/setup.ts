import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, vi } from "vitest"

// jsdom には chrome がないので、テストで参照される最小限の API をモック
function createChromeStorageMock() {
  const store = new Map<string, unknown>()
  return {
    store,
    api: {
      get: vi.fn(
        (keys?: string | string[] | Record<string, unknown> | null) => {
          const result: Record<string, unknown> = {}
          if (keys == null) {
            for (const [k, v] of store) result[k] = v
          } else if (typeof keys === "string") {
            if (store.has(keys)) result[keys] = store.get(keys)
          } else if (Array.isArray(keys)) {
            for (const k of keys) {
              if (store.has(k)) result[k] = store.get(k)
            }
          } else {
            for (const k of Object.keys(keys)) {
              result[k] = store.has(k) ? store.get(k) : keys[k]
            }
          }
          return Promise.resolve(result)
        }
      ),
      set: vi.fn((items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) store.set(k, v)
        return Promise.resolve()
      }),
      remove: vi.fn((keys: string | string[]) => {
        const arr = Array.isArray(keys) ? keys : [keys]
        for (const k of arr) store.delete(k)
        return Promise.resolve()
      }),
      clear: vi.fn(() => {
        store.clear()
        return Promise.resolve()
      })
    }
  }
}

beforeEach(() => {
  const session = createChromeStorageMock()
  const local = createChromeStorageMock()
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      session: session.api,
      local: local.api
    }
  }
})

afterEach(() => {
  cleanup()
  delete (globalThis as unknown as { chrome?: unknown }).chrome
  vi.restoreAllMocks()
})
