import { act, renderHook } from "@testing-library/react"
import type { MouseEvent } from "react"
import { describe, expect, it, vi } from "vitest"

import type { FrameHiddenInputs, HiddenInputInfo, PortMessage } from "~types"

import { useHiddenInputs } from "./useHiddenInputs"

function makeInput(name: string, value = ""): HiddenInputInfo {
  return {
    id: name,
    name,
    value,
    formId: null,
    formName: null,
    xpath: `/input[@name="${name}"]`,
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

function makeFrame(
  frameId: number,
  inputs: HiddenInputInfo[]
): FrameHiddenInputs {
  return {
    frame: {
      frameId,
      url: `https://example.com/${frameId}`,
      parentFrameId: -1,
      frameName: null,
      isSameOrigin: true
    },
    inputs,
    timestamp: "2026-01-01T00:00:00Z"
  }
}

function makeMouseEvent(): MouseEvent {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as MouseEvent
}

describe("useHiddenInputs", () => {
  it("初期状態は空配列・空 Set・編集なし", () => {
    const { result } = renderHook(() => useHiddenInputs())
    expect(result.current.frameInputs).toEqual([])
    expect(result.current.expandedFrames.size).toBe(0)
    expect(result.current.editingInput).toBeNull()
    expect(result.current.totalInputs).toBe(0)
  })

  it("totalInputs は全フレームの input 合計", () => {
    const { result } = renderHook(() => useHiddenInputs())
    act(() => {
      result.current.updateFrameData([
        makeFrame(0, [makeInput("a"), makeInput("b")]),
        makeFrame(1, [makeInput("c")])
      ])
    })
    expect(result.current.totalInputs).toBe(3)
  })

  it("toggleFrame は frameId の追加と削除を切り替える", () => {
    const { result } = renderHook(() => useHiddenInputs())

    act(() => result.current.toggleFrame(5))
    expect(result.current.expandedFrames.has(5)).toBe(true)

    act(() => result.current.toggleFrame(5))
    expect(result.current.expandedFrames.has(5)).toBe(false)
  })

  it("handleEdit は編集状態を設定し、対象フレームを展開する", () => {
    const { result } = renderHook(() => useHiddenInputs())
    act(() => result.current.handleEdit(2, "/input", "old"))

    expect(result.current.editingInput).toEqual({
      frameId: 2,
      xpath: "/input",
      value: "old"
    })
    expect(result.current.expandedFrames.has(2)).toBe(true)
  })

  it("handleEditChange は value のみ更新する", () => {
    const { result } = renderHook(() => useHiddenInputs())
    act(() => result.current.handleEdit(0, "/x", "old"))
    act(() => result.current.handleEditChange("new"))

    expect(result.current.editingInput).toEqual({
      frameId: 0,
      xpath: "/x",
      value: "new"
    })
  })

  it("editingInput が null のとき handleEditChange は何もしない", () => {
    const { result } = renderHook(() => useHiddenInputs())
    act(() => result.current.handleEditChange("ignored"))
    expect(result.current.editingInput).toBeNull()
  })

  it("handleCancel は編集状態をクリアし、イベント伝播を止める", () => {
    const { result } = renderHook(() => useHiddenInputs())
    act(() => result.current.handleEdit(0, "/x", "v"))

    const event = makeMouseEvent()
    act(() => result.current.handleCancel(event))

    expect(result.current.editingInput).toBeNull()
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
  })

  it("ALL_FRAMES_DATA を受信するとデータを格納し shouldSetLoading=true を返す", () => {
    const { result } = renderHook(() => useHiddenInputs())
    const message: PortMessage = {
      type: "ALL_FRAMES_DATA",
      data: [makeFrame(1, [makeInput("a")]), makeFrame(0, [makeInput("b")])]
    }

    let returned: { shouldSetLoading: boolean } | undefined
    act(() => {
      returned = result.current.handlePortMessage(message, true)
    })

    expect(returned).toEqual({ shouldSetLoading: true })
    // sortFrameInputs によりメインフレーム (0) が先頭
    expect(result.current.frameInputs.map((f) => f.frame.frameId)).toEqual([
      0, 1
    ])
  })

  it("collapseOnInitialLoad: true + 初回ロード時に expandedFrames がリセットされる", () => {
    const { result } = renderHook(() =>
      useHiddenInputs({ collapseOnInitialLoad: true })
    )
    act(() => result.current.toggleFrame(0))
    expect(result.current.expandedFrames.has(0)).toBe(true)

    act(() => {
      result.current.handlePortMessage(
        { type: "ALL_FRAMES_DATA", data: [makeFrame(0, [])] },
        true
      )
    })

    expect(result.current.expandedFrames.size).toBe(0)
  })

  it("collapseOnInitialLoad: false なら初回ロードでも展開状態を維持する", () => {
    const { result } = renderHook(() =>
      useHiddenInputs({ collapseOnInitialLoad: false })
    )
    act(() => result.current.toggleFrame(0))

    act(() => {
      result.current.handlePortMessage(
        { type: "ALL_FRAMES_DATA", data: [makeFrame(0, [])] },
        true
      )
    })

    expect(result.current.expandedFrames.has(0)).toBe(true)
  })

  it("FRAME_DATA は既存フレームを置き換え、新規なら追加する", () => {
    const { result } = renderHook(() => useHiddenInputs())
    act(() => {
      result.current.updateFrameData([makeFrame(0, [makeInput("a", "old")])])
    })

    // 既存フレームの更新
    act(() => {
      result.current.handlePortMessage(
        {
          type: "FRAME_DATA",
          frameData: makeFrame(0, [makeInput("a", "new")])
        },
        false
      )
    })
    expect(result.current.frameInputs[0].inputs[0].value).toBe("new")
    expect(result.current.frameInputs).toHaveLength(1)

    // 新規フレームの追加
    act(() => {
      result.current.handlePortMessage(
        { type: "FRAME_DATA", frameData: makeFrame(1, [makeInput("b")]) },
        false
      )
    })
    expect(result.current.frameInputs).toHaveLength(2)
  })

  it("UPDATE_RESULT メッセージは shouldSetLoading=false を返し、データに影響しない", () => {
    const { result } = renderHook(() => useHiddenInputs())
    act(() => {
      result.current.updateFrameData([makeFrame(0, [makeInput("a")])])
    })

    let returned: { shouldSetLoading: boolean } | undefined
    act(() => {
      returned = result.current.handlePortMessage(
        { type: "UPDATE_RESULT", success: true },
        false
      )
    })

    expect(returned).toEqual({ shouldSetLoading: false })
    expect(result.current.frameInputs).toHaveLength(1)
  })
})
