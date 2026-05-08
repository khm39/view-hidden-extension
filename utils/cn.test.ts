import { describe, expect, it } from "vitest"

import { cn } from "./cn"

describe("cn", () => {
  it("複数のクラス名を半角スペースで結合する", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz")
  })

  it("falsy 値を除外する", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar")
  })

  it("条件付きクラス名を扱える", () => {
    const isActive = true
    const isDisabled = false
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active"
    )
  })

  it("引数なしの場合は空文字を返す", () => {
    expect(cn()).toBe("")
  })

  it("すべて falsy なら空文字を返す", () => {
    expect(cn(false, null, undefined)).toBe("")
  })
})
