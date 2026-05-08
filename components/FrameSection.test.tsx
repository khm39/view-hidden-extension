import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { FrameHiddenInputs, HiddenInputInfo } from "~types"

import { FrameSection } from "./FrameSection"

function makeInput(name: string, value = "v"): HiddenInputInfo {
  return {
    id: name,
    name,
    value,
    formId: null,
    formName: null,
    xpath: `//*[@id="${name}"]`,
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
}

function makeFrameData(
  frameId: number,
  inputs: HiddenInputInfo[],
  isSameOrigin = true
): FrameHiddenInputs {
  return {
    frame: {
      frameId,
      url: `https://example.com/${frameId}`,
      parentFrameId: -1,
      frameName: null,
      isSameOrigin
    },
    inputs,
    timestamp: "2026-01-01T00:00:00Z"
  }
}

function setup(overrides: Partial<Parameters<typeof FrameSection>[0]> = {}) {
  const props = {
    frameData: makeFrameData(0, [makeInput("a")]),
    expanded: true,
    onToggle: vi.fn(),
    editingInput: null,
    onEdit: vi.fn(),
    onEditChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onImmediateSave: vi.fn(),
    ...overrides
  }
  render(<FrameSection {...props} />)
  return props
}

describe("FrameSection", () => {
  it("メインフレームには Main バッジが表示される", () => {
    setup({ frameData: makeFrameData(0, []) })
    expect(screen.getByText("Main")).toBeInTheDocument()
  })

  it("frameId !== 0 では iframe バッジが表示される", () => {
    setup({ frameData: makeFrameData(2, []) })
    expect(screen.getByText("iframe")).toBeInTheDocument()
  })

  it("クロスオリジン iframe には Cross-Origin バッジが表示される", () => {
    setup({ frameData: makeFrameData(2, [], false) })
    expect(screen.getByText("Cross-Origin")).toBeInTheDocument()
  })

  it("ヘッダークリックで onToggle が呼ばれる", async () => {
    const { onToggle } = setup()
    // frame ヘッダーは name= で取得（メインで複数 button があるので role+name）
    await userEvent.click(screen.getByRole("button", { expanded: true }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("input 数が表示される", () => {
    setup({
      frameData: makeFrameData(0, [makeInput("a"), makeInput("b")])
    })
    expect(screen.getByText("2個")).toBeInTheDocument()
  })

  it("input が空なら 'hidden inputなし' が表示される", () => {
    setup({ frameData: makeFrameData(0, []) })
    expect(screen.getByText("hidden inputなし")).toBeInTheDocument()
  })

  it("editingInput が一致する input には編集フォームが表示される", () => {
    const input = makeInput("target")
    setup({
      frameData: makeFrameData(0, [input]),
      editingInput: { frameId: 0, xpath: input.xpath, value: "editing" }
    })
    expect(screen.getByRole("textbox", { name: "値を編集" })).toHaveValue(
      "editing"
    )
  })

  it("input の値クリックで onEdit が xpath と現在値とともに呼ばれる", async () => {
    const input = makeInput("target", "current-value")
    const { onEdit } = setup({ frameData: makeFrameData(7, [input]) })
    await userEvent.click(screen.getByRole("button", { name: /を編集/ }))
    expect(onEdit).toHaveBeenCalledWith(7, input.xpath, "current-value")
  })
})
