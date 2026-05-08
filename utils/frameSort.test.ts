import { describe, expect, it } from "vitest"

import type { FrameHiddenInputs, HiddenInputInfo } from "~types"

import { sortFrameInputs } from "./frameSort"

function makeFrame(
  frameId: number,
  inputCount: number,
  parentFrameId = -1
): FrameHiddenInputs {
  const inputs: HiddenInputInfo[] = Array.from(
    { length: inputCount },
    (_, i) => ({
      id: `id-${frameId}-${i}`,
      name: `name-${i}`,
      value: "v",
      formId: null,
      formName: null,
      xpath: "/x"
    })
  )
  return {
    frame: {
      frameId,
      url: `https://example.com/${frameId}`,
      parentFrameId,
      frameName: null,
      isSameOrigin: true
    },
    inputs,
    timestamp: "2026-01-01T00:00:00Z"
  }
}

describe("sortFrameInputs", () => {
  it("input を持つフレームを先に並べる", () => {
    const data = [makeFrame(1, 0), makeFrame(2, 3)]
    const sorted = sortFrameInputs(data)
    expect(sorted.map((d) => d.frame.frameId)).toEqual([2, 1])
  })

  it("同じグループ内ではメインフレーム (frameId=0) を最優先にする", () => {
    const data = [makeFrame(2, 1), makeFrame(0, 1), makeFrame(1, 1)]
    const sorted = sortFrameInputs(data)
    expect(sorted.map((d) => d.frame.frameId)).toEqual([0, 1, 2])
  })

  it("input なしグループ内でもメインフレームを先頭にする", () => {
    const data = [makeFrame(2, 0), makeFrame(0, 0), makeFrame(1, 0)]
    const sorted = sortFrameInputs(data)
    expect(sorted.map((d) => d.frame.frameId)).toEqual([0, 1, 2])
  })

  it("input ありとなしが混在する場合は ありを前、なしを後に分けつつ各グループ内で frameId 昇順", () => {
    const data = [
      makeFrame(3, 0),
      makeFrame(2, 1),
      makeFrame(0, 0),
      makeFrame(1, 2)
    ]
    const sorted = sortFrameInputs(data)
    expect(sorted.map((d) => d.frame.frameId)).toEqual([1, 2, 0, 3])
  })

  it("元の配列を変更しない (純粋関数)", () => {
    const data = [makeFrame(1, 0), makeFrame(0, 2)]
    const original = data.map((d) => d.frame.frameId)
    sortFrameInputs(data)
    expect(data.map((d) => d.frame.frameId)).toEqual(original)
  })
})
