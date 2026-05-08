import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { HiddenInputInfo } from "~types"

import { InputEditForm } from "./InputEditForm"

const baseInput: HiddenInputInfo = {
  id: "test",
  name: "test",
  value: "",
  formId: null,
  formName: null,
  xpath: '/input[@name="test"]',
  tagName: "input",
  type: "hidden",
  label: null,
  placeholder: null,
  disabled: false,
  readonly: false,
  required: false,
  checked: null,
  options: null,
  isVisuallyHidden: true
}

function setup(overrides: Partial<Parameters<typeof InputEditForm>[0]> = {}) {
  const props = {
    input: baseInput,
    value: "initial",
    onChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides
  }
  render(<InputEditForm {...props} />)
  return props
}

describe("InputEditForm", () => {
  it("初期値で textarea がレンダリングされる", () => {
    setup({ value: "hello" })
    const textarea = screen.getByRole("textbox", { name: "値を編集" })
    expect(textarea).toHaveValue("hello")
  })

  it("textarea の入力で onChange が呼ばれる", async () => {
    const { onChange } = setup({ value: "" })
    await userEvent.type(screen.getByRole("textbox"), "abc")
    // 1 文字ずつ呼ばれる
    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenLastCalledWith("c")
  })

  it("保存ボタンで onSave が呼ばれる", async () => {
    const { onSave } = setup()
    await userEvent.click(screen.getByRole("button", { name: "保存" }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("キャンセルボタンで onCancel が呼ばれる", async () => {
    const { onCancel } = setup()
    await userEvent.click(screen.getByRole("button", { name: "キャンセル" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("textarea は autoFocus される", () => {
    setup()
    expect(screen.getByRole("textbox")).toHaveFocus()
  })
})
