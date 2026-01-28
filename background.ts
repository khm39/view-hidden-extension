import type {
  FrameHiddenInputs,
  FrameInfo,
  HiddenInputsResultMessage,
  HiddenInputsUpdateMessage,
  PinStateMessage,
  PortMessage,
  TogglePinMessage,
  UpdateInputValueMessage
} from "~types"

// Store data per tab, per frame
const tabFrameData = new Map<number, Map<number, FrameHiddenInputs>>()

// Store connected popup ports per tab
const popupPorts = new Map<number, chrome.runtime.Port>()

// Store pinned state per tab
const pinnedTabs = new Set<number>()

function getFrameData(tabId: number): FrameHiddenInputs[] {
  const frameMap = tabFrameData.get(tabId)
  if (!frameMap) return []
  return Array.from(frameMap.values()).sort((a, b) => {
    // Main frame first, then by frameId
    if (a.frame.frameId === 0) return -1
    if (b.frame.frameId === 0) return 1
    return a.frame.frameId - b.frame.frameId
  })
}

function notifyPopup(tabId: number) {
  const port = popupPorts.get(tabId)
  if (port) {
    const message: PortMessage = {
      type: "ALL_FRAMES_DATA",
      data: getFrameData(tabId)
    }
    try {
      port.postMessage(message)
    } catch {
      // Port disconnected
      popupPorts.delete(tabId)
    }
  }

  // Also notify overlay if pinned
  if (pinnedTabs.has(tabId)) {
    notifyOverlay(tabId)
  }
}

function notifyOverlay(tabId: number) {
  const data = getFrameData(tabId)
  const message: PinStateMessage = {
    type: "PIN_STATE",
    pinned: true,
    data
  }
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Content script not available
  })
}

async function notifyOverlayWithResult(tabId: number): Promise<boolean> {
  const data = getFrameData(tabId)
  const message: PinStateMessage = {
    type: "PIN_STATE",
    pinned: true,
    data
  }
  try {
    await chrome.tabs.sendMessage(tabId, message)
    return true
  } catch {
    return false
  }
}

function isSameOrigin(frameUrl: string, mainFrameUrl: string): boolean {
  try {
    const frameOrigin = new URL(frameUrl).origin
    const mainOrigin = new URL(mainFrameUrl).origin
    return frameOrigin === mainOrigin
  } catch {
    return false
  }
}

async function getAllFrames(
  tabId: number
): Promise<chrome.webNavigation.GetAllFrameResultDetails[]> {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId })
    return frames || []
  } catch {
    return []
  }
}

async function collectAllHiddenInputs(tabId: number) {
  const frames = await getAllFrames(tabId)
  const mainFrame = frames.find((f) => f.frameId === 0)
  const mainFrameUrl = mainFrame?.url || ""

  // Clear existing data for this tab
  const frameMap = new Map<number, FrameHiddenInputs>()
  tabFrameData.set(tabId, frameMap)

  // Filter valid frames
  const validFrames = frames.filter(
    (frame) => frame.url && !frame.url.startsWith("about:")
  )

  // Collect data from all frames in parallel
  await Promise.allSettled(
    validFrames.map(async (frame) => {
      const frameInfo: FrameInfo = {
        frameId: frame.frameId,
        url: frame.url,
        parentFrameId: frame.parentFrameId,
        frameName: null,
        isSameOrigin:
          frame.frameId === 0 ? true : isSameOrigin(frame.url, mainFrameUrl)
      }

      try {
        const response = await chrome.tabs.sendMessage(
          tabId,
          { type: "GET_HIDDEN_INPUTS" },
          { frameId: frame.frameId }
        )

        if (response && response.type === "HIDDEN_INPUTS_RESULT") {
          const result = response as HiddenInputsResultMessage
          frameInfo.url = result.url || frame.url
          frameInfo.frameName = result.frameName

          const frameHiddenInputs: FrameHiddenInputs = {
            frame: frameInfo,
            inputs: result.inputs,
            timestamp: new Date().toISOString()
          }

          frameMap.set(frame.frameId, frameHiddenInputs)
        } else {
          // No response but frame exists - add with empty inputs
          const frameHiddenInputs: FrameHiddenInputs = {
            frame: frameInfo,
            inputs: [],
            timestamp: new Date().toISOString()
          }
          frameMap.set(frame.frameId, frameHiddenInputs)
        }
      } catch {
        // Content script not loaded in this frame - still show the frame
        const frameHiddenInputs: FrameHiddenInputs = {
          frame: frameInfo,
          inputs: [],
          timestamp: new Date().toISOString()
        }
        frameMap.set(frame.frameId, frameHiddenInputs)
      }
    })
  )

  notifyPopup(tabId)
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "HIDDEN_INPUTS_UPDATE" && sender.tab?.id) {
    const tabId = sender.tab.id
    const frameId = sender.frameId ?? 0
    const update = message as HiddenInputsUpdateMessage

    let frameMap = tabFrameData.get(tabId)
    if (!frameMap) {
      frameMap = new Map()
      tabFrameData.set(tabId, frameMap)
    }

    const mainFrame = frameMap.get(0)
    const mainFrameUrl = mainFrame?.frame.url || ""

    const frameInfo: FrameInfo = {
      frameId,
      url: update.url,
      parentFrameId: frameId === 0 ? -1 : 0,
      frameName: update.frameName,
      isSameOrigin:
        frameId === 0 ? true : isSameOrigin(update.url, mainFrameUrl)
    }

    const frameHiddenInputs: FrameHiddenInputs = {
      frame: frameInfo,
      inputs: update.inputs,
      timestamp: new Date().toISOString()
    }

    frameMap.set(frameId, frameHiddenInputs)
    notifyPopup(tabId)
  }

  // Handle pin toggle from popup
  if (message.type === "TOGGLE_PIN") {
    const toggleMessage = message as TogglePinMessage
    const tabId = toggleMessage.tabId

    if (toggleMessage.pinned) {
      pinnedTabs.add(tabId)
      // Collect data and send to overlay
      collectAllHiddenInputs(tabId)
        .then(() => {
          return notifyOverlayWithResult(tabId)
        })
        .then((success) => {
          if (success) {
            sendResponse({ success: true })
          } else {
            pinnedTabs.delete(tabId)
            sendResponse({ success: false, error: "CONTENT_SCRIPT_NOT_LOADED" })
          }
        })
        .catch(() => {
          pinnedTabs.delete(tabId)
          sendResponse({ success: false, error: "CONTENT_SCRIPT_NOT_LOADED" })
        })
    } else {
      pinnedTabs.delete(tabId)
      // Send unpin message to overlay
      const unpinMessage: PinStateMessage = {
        type: "PIN_STATE",
        pinned: false
      }
      chrome.tabs.sendMessage(tabId, unpinMessage).catch(() => {
        // Content script not available
      })
      sendResponse({ success: true })
    }
    return true
  }

  // Handle unpin from overlay
  if (message.type === "UNPIN_OVERLAY" && sender.tab?.id) {
    pinnedTabs.delete(sender.tab.id)
  }

  // Handle check pin state from overlay (after page navigation)
  if (message.type === "CHECK_PIN_STATE" && sender.tab?.id) {
    const tabId = sender.tab.id
    const isPinned = pinnedTabs.has(tabId)

    if (isPinned) {
      // Collect fresh data and send to overlay
      collectAllHiddenInputs(tabId)
        .then(() => {
          notifyOverlay(tabId)
        })
        .catch(() => {
          // Failed to collect data
        })
    }

    sendResponse({ pinned: isPinned })
    return true
  }

  // Handle update from overlay (no tabId in message, use sender.tab.id)
  if (
    message.type === "UPDATE_INPUT_VALUE" &&
    sender.tab?.id &&
    !message.tabId
  ) {
    const updateMessage = message as UpdateInputValueMessage
    const tabId = sender.tab.id

    // Forward to content script in the correct frame
    chrome.tabs
      .sendMessage(
        tabId,
        {
          type: "UPDATE_INPUT_VALUE",
          xpath: updateMessage.xpath,
          value: updateMessage.value
        } as UpdateInputValueMessage,
        { frameId: updateMessage.frameId }
      )
      .then(() => {
        // Refresh data after update
        return collectAllHiddenInputs(tabId)
      })
      .catch(() => {
        // Failed to update input from overlay
      })
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
      if (message.type === "SUBSCRIBE_UPDATES" && message.tabId) {
        const tabId = message.tabId
        popupPorts.set(tabId, port)

        // Collect all hidden inputs when popup connects
        collectAllHiddenInputs(tabId).catch(() => {
          // Failed to collect hidden inputs
        })
      }

      if (message.type === "UPDATE_INPUT_VALUE") {
        const updateMessage = message as UpdateInputValueMessage
        const tabId = message.tabId

        // Handle async operation separately
        ;(async () => {
          try {
            const response = await chrome.tabs.sendMessage(
              tabId,
              {
                type: "UPDATE_INPUT_VALUE",
                xpath: updateMessage.xpath,
                value: updateMessage.value
              } as UpdateInputValueMessage,
              { frameId: updateMessage.frameId }
            )

            safePostMessage({
              type: "UPDATE_RESULT",
              success: response?.success ?? false,
              error: response?.error
            })

            // Refresh data after update (don't await, let it run in background)
            collectAllHiddenInputs(tabId).catch(() => {
              // Failed to refresh hidden inputs
            })
          } catch (error) {
            safePostMessage({
              type: "UPDATE_RESULT",
              success: false,
              error: String(error)
            })
          }
        })()
      }
    })

    port.onDisconnect.addListener(() => {
      isPortConnected = false
      // Remove port from all tabs
      for (const [tabId, p] of popupPorts.entries()) {
        if (p === port) {
          popupPorts.delete(tabId)
        }
      }
    })
  }
})

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabFrameData.delete(tabId)
  popupPorts.delete(tabId)
  pinnedTabs.delete(tabId)
})

// Clean up when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabFrameData.delete(tabId)
  }

  // When page load completes, refresh data for pinned tabs
  if (changeInfo.status === "complete" && pinnedTabs.has(tabId)) {
    // Wait a bit for all frames to initialize
    setTimeout(() => {
      collectAllHiddenInputs(tabId)
        .then(() => {
          notifyOverlay(tabId)
        })
        .catch(() => {
          // Failed to refresh pinned tab
        })
    }, 500)
  }
})
