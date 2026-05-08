import { existsSync } from "node:fs"
import path from "node:path"
import {
  test as base,
  chromium,
  type BrowserContext,
  type Worker
} from "@playwright/test"

const EXTENSION_PATH = path.resolve(process.cwd(), "build/chrome-mv3-prod")

type Fixtures = {
  context: BrowserContext
  extensionId: string
}

export const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    if (!existsSync(EXTENSION_PATH)) {
      throw new Error(
        `Extension build not found at ${EXTENSION_PATH}. Run "pnpm build" before running e2e tests.`
      )
    }

    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--headless=new"
      ]
    })

    await use(context)
    await context.close()
  },

  extensionId: async ({ context }, use) => {
    let serviceWorker: Worker | undefined = context.serviceWorkers()[0]
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker")
    }
    const extensionId = new URL(serviceWorker.url()).host
    await use(extensionId)
  }
})

export const expect = test.expect
