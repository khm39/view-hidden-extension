import { expect, test } from "./fixtures"

test("拡張機能のサービスワーカーが起動する", async ({ extensionId }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/)
})

test("popup を開くとヘッダーが表示される", async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/popup.html`)

  await expect(
    page.getByRole("heading", { name: "Hidden Input Viewer" })
  ).toBeVisible({ timeout: 10_000 })
})

test("hidden input を含むページで input 数が表示される", async ({
  context,
  extensionId
}) => {
  const target = await context.newPage()
  await target.setContent(`
    <html>
      <body>
        <h1>test page</h1>
        <form>
          <input type="hidden" name="csrf_token" value="abc123" />
          <input type="hidden" name="user_id" value="42" />
        </form>
      </body>
    </html>
  `)

  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)

  await expect(popup.getByText(/個のhidden inputを検出/)).toBeVisible({
    timeout: 10_000
  })
})
