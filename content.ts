import type { PlasmoCSConfig } from "plasmo"

import type {
  FormElementTag,
  HiddenInputInfo,
  HiddenInputsResultMessage,
  HiddenInputsUpdateMessage,
  SelectOption,
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

const EXCLUDED_INPUT_TYPES = new Set(["submit", "reset", "button", "image"])

type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function isFormElement(node: Node): node is FormElement {
  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement
  )
}

function getTagName(el: FormElement): FormElementTag {
  if (el instanceof HTMLTextAreaElement) return "textarea"
  if (el instanceof HTMLSelectElement) return "select"
  return "input"
}

function getElementType(el: FormElement): string {
  if (el instanceof HTMLInputElement) return el.type || "text"
  if (el instanceof HTMLTextAreaElement) return "textarea"
  return "select"
}

function isExcluded(el: FormElement): boolean {
  if (el instanceof HTMLInputElement) {
    return EXCLUDED_INPUT_TYPES.has(el.type)
  }
  return false
}

function getLabelText(el: FormElement): string | null {
  if (el.id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    const text = labelEl?.textContent?.trim()
    if (text) return text
  }
  const ancestorLabel = el.closest("label")
  if (ancestorLabel) {
    const clone = ancestorLabel.cloneNode(true) as HTMLElement
    clone.querySelectorAll("input, textarea, select").forEach((n) => n.remove())
    const text = clone.textContent?.trim()
    if (text) return text
  }
  const ariaLabel = el.getAttribute("aria-label")?.trim()
  if (ariaLabel) return ariaLabel
  return null
}

function isVisuallyHidden(el: FormElement): boolean {
  if (el instanceof HTMLInputElement && el.type === "hidden") return true
  if (!el.isConnected) return true
  if (el.offsetParent === null) {
    const style = getComputedStyle(el)
    if (style.position !== "fixed") return true
  }
  const style = getComputedStyle(el)
  if (style.display === "none" || style.visibility === "hidden") return true
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return true
  return false
}

function getSelectOptions(el: HTMLSelectElement): SelectOption[] {
  return Array.from(el.options).map((opt) => ({
    value: opt.value,
    text: opt.text,
    selected: opt.selected
  }))
}

function buildInputInfo(el: FormElement): HiddenInputInfo {
  const tagName = getTagName(el)
  const type = getElementType(el)
  const form = el.form

  return {
    id: el.id || "",
    name: el.name || "",
    value: el.value || "",
    formId: form?.id || null,
    formName: form?.getAttribute("name") || null,
    xpath: getXPath(el),
    tagName,
    type,
    label: getLabelText(el),
    placeholder:
      el instanceof HTMLSelectElement ? null : el.placeholder || null,
    disabled: el.disabled,
    readonly: el instanceof HTMLSelectElement ? false : el.readOnly,
    required: el.required,
    checked:
      el instanceof HTMLInputElement &&
      (el.type === "checkbox" || el.type === "radio")
        ? el.checked
        : null,
    options: el instanceof HTMLSelectElement ? getSelectOptions(el) : null,
    isVisuallyHidden: isVisuallyHidden(el)
  }
}

function collectHiddenInputs(): HiddenInputInfo[] {
  const elements = document.querySelectorAll("input, textarea, select")
  const result: HiddenInputInfo[] = []

  elements.forEach((node) => {
    if (!isFormElement(node)) return
    if (isExcluded(node)) return
    result.push(buildInputInfo(node))
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
      const hasFormElement = (nodes: NodeList) => {
        for (const node of nodes) {
          if (isFormElement(node)) {
            return true
          }
          if (node instanceof Element) {
            if (node.querySelector("input, textarea, select")) {
              return true
            }
          }
        }
        return false
      }

      if (hasFormElement(mutation.addedNodes)) {
        shouldUpdate = true
        break
      }
      if (hasFormElement(mutation.removedNodes)) {
        shouldUpdate = true
        break
      }
    }

    if (mutation.type === "attributes") {
      const target = mutation.target
      if (isFormElement(target)) {
        shouldUpdate = true
        break
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
    attributeFilter: [
      "value",
      "name",
      "id",
      "type",
      "disabled",
      "readonly",
      "required",
      "checked"
    ]
  })
}

if (document.body) {
  startObserver()
} else {
  document.addEventListener("DOMContentLoaded", startObserver)
}

function setNativeValue(el: FormElement, value: string) {
  const proto =
    el instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLSelectElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  if (setter) {
    setter.call(el, value)
  } else {
    el.value = value
  }
}

function setNativeChecked(el: HTMLInputElement, checked: boolean) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "checked"
  )?.set
  if (setter) {
    setter.call(el, checked)
  } else {
    el.checked = checked
  }
}

function applyValueUpdate(el: FormElement, value: string) {
  if (
    el instanceof HTMLInputElement &&
    (el.type === "checkbox" || el.type === "radio")
  ) {
    setNativeChecked(el, value === "true")
  } else {
    setNativeValue(el, value)
  }

  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
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

    if (element && isFormElement(element)) {
      applyValueUpdate(element, updateMessage.value)
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: "Element not found" })
    }
    return true
  }
})
