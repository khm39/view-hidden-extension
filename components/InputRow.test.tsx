import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { HiddenInputInfo } from "~types"

import { InputRow } from "./InputRow"

function makeInput(overrides: Partial<HiddenInputInfo> = {}): HiddenInputInfo {
  return {
    id: "csrf",
    name: "csrf_token",
    value: "abc123",
    formId: null,
    formName: null,
    xpath: '//*[@id="csrf"]',
    ...overrides
  }
}

function setup(overrides: Partial<Parameters<typeof InputRow>[0]> = {}) {
  const props = {
    input: makeInput(),
    isEditing: false,
    editValue: "",
    onEdit: vi.fn(),
    onEditChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides
  }
  render(<InputRow {...props} />)
  return props
}

describe("InputRow", () => {
  it("name があれば name を表示名に使う", () => {
    setup({ input: makeInput({ name: "my_name", id: "ignored" }) })
    expect(screen.getByText("my_name")).toBeInTheDocument()
  })

  it("name が空なら id にフォールバックする", () => {
    setup({ input: makeInput({ name: "", id: "fallback_id" }) })
    expect(screen.getByText("fallback_id")).toBeInTheDocument()
  })

  it("name も id も空なら (名前なし) を表示する", () => {
    setup({ input: makeInput({ name: "", id: "" }) })
    expect(screen.getByText("(名前なし)")).toBeInTheDocument()
  })

  it("空の値は (空) と表示される", () => {
    setup({ input: makeInput({ value: "" }) })
    expect(screen.getByText("(空)")).toBeInTheDocument()
  })

  it("formName があれば form: 表記で表示される", () => {
    setup({ input: makeInput({ formName: "loginForm" }) })
    expect(screen.getByText(/form: loginForm/)).toBeInTheDocument()
  })

  it("値の領域をクリックすると onEdit が呼ばれる", async () => {
    const { onEdit } = setup()
    await userEvent.click(screen.getByRole("button", { name: /を編集/ }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("値の領域で Enter キーでも onEdit が呼ばれる", async () => {
    const { onEdit } = setup()
    const value = screen.getByRole("button", { name: /を編集/ })
    value.focus()
    await userEvent.keyboard("{Enter}")
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("isEditing=true のとき編集フォームが表示される", () => {
    setup({ isEditing: true, editValue: "editing-value" })
    expect(screen.getByRole("textbox", { name: "値を編集" })).toHaveValue(
      "editing-value"
    )
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument()
  })
})
