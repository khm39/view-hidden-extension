import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./Button"

describe("Button", () => {
  it("子要素をレンダリングする", () => {
    render(<Button>保存</Button>)
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument()
  })

  it("クリックでハンドラが呼ばれる", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>送信</Button>)
    await userEvent.click(screen.getByRole("button", { name: "送信" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("type 属性のデフォルトは button (form 内での誤送信防止)", () => {
    render(<Button>クリック</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("type", "button")
  })

  it("variant ごとに異なる class を付与する", () => {
    const { rerender } = render(<Button variant="primary">A</Button>)
    const primaryClasses = screen.getByRole("button").className
    rerender(<Button variant="secondary">A</Button>)
    const secondaryClasses = screen.getByRole("button").className
    expect(primaryClasses).not.toBe(secondaryClasses)
  })

  it("追加の className をマージする", () => {
    render(<Button className="extra-class">A</Button>)
    expect(screen.getByRole("button").className).toContain("extra-class")
  })
})
