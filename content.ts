import type { PlasmoCSConfig } from "plasmo"

import type {
  HiddenInputInfo,
  HiddenInputsResultMessage,
  HiddenInputsUpdateMessage,
  UpdateInputValueMessage
} from "~types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle"
}

// XPath文字列のエスケープ処理
// XPathではクォートを含む文字列にはconcat()を使用する必要がある
function escapeXPathString(str: string): string {
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

function getXPath(element: Element): string {
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

function getElementByXPath(xpath: string): Element | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  return result.singleNodeValue as Element | null
}

function collectHiddenInputs(): HiddenInputInfo[] {
  const inputs = document.querySelectorAll('input[type="hidden"]')
  const result: HiddenInputInfo[] = []

  inputs.forEach((input) => {
    const inputEl = input as HTMLInputElement
    const form = inputEl.form

    result.push({
      id: inputEl.id || "",
      name: inputEl.name || "",
      value: inputEl.value || "",
      formId: form?.id || null,
      formName: form?.getAttribute("name") || null,
      xpath: getXPath(inputEl)
    })
  })

  return result
}

function getFrameName(): string | null {
  try {
    if (window.name) {
      return window.name
    }
    if (window.frameElement) {
      return (
        (window.frameElement as HTMLIFrameElement).name ||
        window.frameElement.id ||
        null
      )
    }
  } catch {
    // Cross-origin access error
  }
  return null
}

function sendHiddenInputsUpdate() {
  // Check if extension context is still valid
  if (!chrome.runtime?.id) {
    return
  }

  const inputs = collectHiddenInputs()
  const message: HiddenInputsUpdateMessage = {
    type: "HIDDEN_INPUTS_UPDATE",
    frameId: 0, // Will be set by background script
    url: window.location.href,
    frameName: getFrameName(),
    inputs
  }
  chrome.runtime.sendMessage(message).catch(() => {
    // Extension context invalidated (extension was reloaded)
  })
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedUpdate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    sendHiddenInputsUpdate()
    debounceTimer = null
  }, 100)
}

const observer = new MutationObserver((mutations) => {
  let shouldUpdate = false

  for (const mutation of mutations) {
    if (mutation.type === "childList") {
      const hasHiddenInput = (nodes: NodeList) => {
        for (const node of nodes) {
          if (node instanceof HTMLInputElement && node.type === "hidden") {
            return true
          }
          if (node instanceof Element) {
            if (node.querySelector('input[type="hidden"]')) {
              return true
            }
          }
        }
        return false
      }

      if (hasHiddenInput(mutation.addedNodes)) {
        shouldUpdate = true
        break
      }
      if (hasHiddenInput(mutation.removedNodes)) {
        shouldUpdate = true
        break
      }
    }

    if (mutation.type === "attributes") {
      const target = mutation.target as Element
      if (target instanceof HTMLInputElement) {
        if (mutation.attributeName === "type") {
          shouldUpdate = true
          break
        }
        if (target.type === "hidden") {
          shouldUpdate = true
          break
        }
      }
    }
  }

  if (shouldUpdate) {
    debouncedUpdate()
  }
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["value", "name", "id", "type"]
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_HIDDEN_INPUTS") {
    const inputs = collectHiddenInputs()
    const response: HiddenInputsResultMessage = {
      type: "HIDDEN_INPUTS_RESULT",
      frameId: 0, // Will be set by background script
      url: window.location.href,
      frameName: getFrameName(),
      inputs
    }
    sendResponse(response)
    return true
  }

  if (message.type === "UPDATE_INPUT_VALUE") {
    const updateMessage = message as UpdateInputValueMessage
    const element = getElementByXPath(updateMessage.xpath)

    if (element instanceof HTMLInputElement) {
      element.value = updateMessage.value

      // Dispatch events to notify frameworks
      element.dispatchEvent(new Event("input", { bubbles: true }))
      element.dispatchEvent(new Event("change", { bubbles: true }))

      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: "Element not found" })
    }
    return true
  }
})
