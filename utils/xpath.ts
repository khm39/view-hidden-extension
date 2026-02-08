/**
 * XPath関連のユーティリティ関数
 */

/**
 * XPath文字列のエスケープ処理
 * XPathではクォートを含む文字列にはconcat()を使用する必要がある
 */
export function escapeXPathString(str: string): string {
  // クォートを含まない場合はそのままダブルクォートで囲む
  if (!str.includes('"')) {
    return `"${str}"`
  }
  // ダブルクォートのみ含む場合はシングルクォートで囲む
  if (!str.includes("'")) {
    return `'${str}'`
  }
  // 両方含む場合はconcat()を使用
  // 例: "it's \"quoted\"" → concat("it's ", '"', "quoted", '"')
  const parts: string[] = []
  let current = ""
  for (const char of str) {
    if (char === '"') {
      if (current) {
        parts.push(`"${current}"`)
        current = ""
      }
      parts.push(`'"'`)
    } else {
      current += char
    }
  }
  if (current) {
    parts.push(`"${current}"`)
  }
  return `concat(${parts.join(", ")})`
}

/**
 * 要素のXPathを取得
 * idがある場合はid属性を使用し、ない場合は位置ベースのXPathを生成
 */
export function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id=${escapeXPathString(element.id)}]`
  }

  const parts: string[] = []
  let current: Element | null = element

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1
    let sibling = current.previousElementSibling

    while (sibling) {
      if (sibling.nodeName === current.nodeName) {
        index++
      }
      sibling = sibling.previousElementSibling
    }

    const tagName = current.nodeName.toLowerCase()
    const part = index > 1 ? `${tagName}[${index}]` : tagName
    parts.unshift(part)
    current = current.parentElement
  }

  return "/" + parts.join("/")
}

/**
 * XPathから要素を取得
 */
export function getElementByXPath(xpath: string): Element | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  return result.singleNodeValue as Element | null
}
