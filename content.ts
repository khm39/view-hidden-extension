import type { PlasmoCSConfig } from "plasmo"

import type {
  HiddenInputInfo,
  HiddenInputsResultMessage,
  HiddenInputsUpdateMessage,
  UpdateInputValueMessage
} from "~types"
import { MESSAGE_TYPES, TIMING } from "~utils/constants"
import { isExtensionContextValid } from "~utils/extension"
import { logger } from "~utils/logger"
import { getElementByXPath, getXPath } from "~utils/xpath"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle"
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
  if (!isExtensionContextValid()) return

  const inputs = collectHiddenInputs()
  const message: HiddenInputsUpdateMessage = {
    type: MESSAGE_TYPES.HIDDEN_INPUTS_UPDATE as "HIDDEN_INPUTS_UPDATE",
    frameId: 0, // frameIdはbackground scriptがsender.frameIdから取得
    url: window.location.href,
    frameName: getFrameName(),
    inputs
  }
  chrome.runtime.sendMessage(message).catch((e) => {
    logger.error("sendHiddenInputsUpdate", e)
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
  }, TIMING.DEBOUNCE_MS)
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

// Start observing when document.body is available
function startObserver() {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["value", "name", "id", "type"]
  })
}

if (document.body) {
  startObserver()
} else {
  document.addEventListener("DOMContentLoaded", startObserver)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.GET_HIDDEN_INPUTS) {
    const inputs = collectHiddenInputs()
    const response: HiddenInputsResultMessage = {
      type: MESSAGE_TYPES.HIDDEN_INPUTS_RESULT as "HIDDEN_INPUTS_RESULT",
      frameId: 0, // frameIdはbackground scriptがsender.frameIdから取得
      url: window.location.href,
      frameName: getFrameName(),
      inputs
    }
    sendResponse(response)
    return true
  }

  if (message.type === MESSAGE_TYPES.UPDATE_INPUT_VALUE) {
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
