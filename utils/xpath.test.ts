import { beforeEach, describe, expect, it } from "vitest"

import { escapeXPathString, getElementByXPath, getXPath } from "./xpath"

describe("escapeXPathString", () => {
  it("クォートを含まない文字列はダブルクォートで囲む", () => {
    expect(escapeXPathString("hello")).toBe('"hello"')
  })

  it("ダブルクォートのみ含む場合はシングルクォートで囲む", () => {
    expect(escapeXPathString('say "hi"')).toBe(`'say "hi"'`)
  })

  it("シングルクォートのみ含む場合はダブルクォートで囲む", () => {
    expect(escapeXPathString("it's mine")).toBe(`"it's mine"`)
  })

  it("両方のクォートを含む場合は concat() を使う", () => {
    const result = escapeXPathString(`it's "quoted"`)
    expect(result.startsWith("concat(")).toBe(true)
    expect(result).toContain(`"it's "`)
    expect(result).toContain(`'"'`)
    expect(result).toContain(`"quoted"`)
  })

  it("空文字列もそのままダブルクォートで囲む", () => {
    expect(escapeXPathString("")).toBe('""')
  })
})

describe("getXPath / getElementByXPath", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("id 属性がある要素は //*[@id=...] 形式の XPath を返す", () => {
    document.body.innerHTML = `<div id="target"></div>`
    const el = document.getElementById("target")!
    expect(getXPath(el)).toBe('//*[@id="target"]')
  })

  it("id にダブルクォートが含まれる場合は適切にエスケープされる", () => {
    const div = document.createElement("div")
    div.id = `weird"id`
    document.body.appendChild(div)
    expect(getXPath(div)).toBe(`//*[@id='weird"id']`)
  })

  it("id がない要素は位置ベースの XPath を返し、再取得できる", () => {
    document.body.innerHTML = `
      <div>
        <span></span>
        <span></span>
        <span class="target"></span>
      </div>
    `
    const target = document.querySelector(".target")!
    const xpath = getXPath(target)
    expect(xpath).toContain("span[3]")
    const found = getElementByXPath(xpath)
    expect(found).toBe(target)
  })

  it("存在しない XPath には null を返す", () => {
    expect(getElementByXPath('//*[@id="nonexistent"]')).toBeNull()
  })
})
