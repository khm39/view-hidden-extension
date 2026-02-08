import {
  cleanupTab,
  cleanupTabOnNavigation,
  collectAllHiddenInputs,
  handleCheckPinState,
  handleHiddenInputsUpdate,
  handleTogglePin,
  handleUnpinOverlay,
  handleUpdateInputValueFromOverlay,
  refreshPinnedTabOnComplete,
  registerPopupPort,
  unregisterPopupPort
} from "~background/handlers"
import type {
  HiddenInputsUpdateMessage,
  PortMessage,
  TogglePinMessage,
  UpdateInputValueMessage
} from "~types"
import { MESSAGE_TYPES } from "~utils/constants"
import { logger } from "~utils/logger"

async function handleUpdateMessage(
  updateMessage: UpdateInputValueMessage,
  tabId: number,
  safePostMessage: (message: PortMessage) => boolean
) {
  try {
    const response = await chrome.tabs.sendMessage(
      tabId,
      {
        type: MESSAGE_TYPES.UPDATE_INPUT_VALUE,
        xpath: updateMessage.xpath,
        value: updateMessage.value
      } as UpdateInputValueMessage,
      { frameId: updateMessage.frameId }
    )

    safePostMessage({
      type: MESSAGE_TYPES.UPDATE_RESULT,
      success: response?.success ?? false,
      error: response?.error
    })

    // Refresh data after update (don't await, let it run in background)
    collectAllHiddenInputs(tabId).catch((e) => {
      logger.error("handleUpdateMessage:refresh", e)
    })
  } catch (error) {
    safePostMessage({
      type: MESSAGE_TYPES.UPDATE_RESULT,
      success: false,
      error: String(error)
    })
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.HIDDEN_INPUTS_UPDATE && sender.tab?.id) {
    handleHiddenInputsUpdate(message as HiddenInputsUpdateMessage, sender)
  }

  if (message.type === MESSAGE_TYPES.TOGGLE_PIN) {
    handleTogglePin(message as TogglePinMessage, sendResponse)
    return true
  }

  if (message.type === MESSAGE_TYPES.UNPIN_OVERLAY && sender.tab?.id) {
    handleUnpinOverlay(sender)
  }

  if (message.type === MESSAGE_TYPES.CHECK_PIN_STATE && sender.tab?.id) {
    handleCheckPinState(sender, sendResponse)
    return true
  }

  // Handle update from overlay (no tabId in message, use sender.tab.id)
  if (message.type === MESSAGE_TYPES.UPDATE_INPUT_VALUE && !message.tabId) {
    handleUpdateInputValueFromOverlay(
      message as UpdateInputValueMessage,
      sender
    )
  }
})

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    let isPortConnected = true

    const safePostMessage = (message: PortMessage) => {
      if (!isPortConnected) return false
      try {
        port.postMessage(message)
        return true
      } catch {
        isPortConnected = false
        return false
      }
    }

    port.onMessage.addListener((message) => {
      // Handle messages without top-level await to avoid unhandled rejections
      if (message.type === MESSAGE_TYPES.SUBSCRIBE_UPDATES && message.tabId) {
        const tabId = message.tabId
        registerPopupPort(tabId, port)

        // Collect all hidden inputs when popup connects
        collectAllHiddenInputs(tabId).catch((e) => {
          logger.error("onConnect:collectAllHiddenInputs", e)
        })
      }

      if (message.type === MESSAGE_TYPES.UPDATE_INPUT_VALUE) {
        const updateMessage = message as UpdateInputValueMessage
        const tabId = message.tabId
        handleUpdateMessage(updateMessage, tabId, safePostMessage)
      }
    })

    port.onDisconnect.addListener(() => {
      isPortConnected = false
      unregisterPopupPort(port)
    })
  }
})

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTab(tabId)
})

// Clean up when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    cleanupTabOnNavigation(tabId)
  }

  if (changeInfo.status === "complete") {
    refreshPinnedTabOnComplete(tabId)
  }
})
