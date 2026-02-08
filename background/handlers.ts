import type {
  FrameHiddenInputs,
  FrameInfo,
  HiddenInputsUpdateMessage,
  PinStateMessage,
  TogglePinMessage,
  UpdateInputValueMessage
} from "~types"
import { isHiddenInputsResultMessage } from "~types"
import { MESSAGE_TYPES, TIMING } from "~utils/constants"
import { sortFrameInputs } from "~utils/frameSort"
import { logger } from "~utils/logger"

/**
 * PinStateMessage を生成するヘルパー関数
 */
function createPinStateMessage(
  pinned: boolean,
  data?: FrameHiddenInputs[]
): PinStateMessage {
  return {
    type: MESSAGE_TYPES.PIN_STATE as "PIN_STATE",
    pinned,
    ...(data && { data })
  }
}

// Store data per tab, per frame (内部状態)
const tabFrameData = new Map<number, Map<number, FrameHiddenInputs>>()

// Store connected popup ports per tab (内部状態)
const popupPorts = new Map<number, chrome.runtime.Port>()

// Store pinned state per tab (内部状態)
const pinnedTabs = new Set<number>()

// Store pending refresh timers per tab (クリーンアップ用)
const pendingRefreshTimers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * ポップアップポートを登録
 */
export function registerPopupPort(tabId: number, port: chrome.runtime.Port) {
  popupPorts.set(tabId, port)
}

/**
 * ポップアップポートを削除
 */
export function unregisterPopupPort(port: chrome.runtime.Port) {
  for (const [tabId, p] of popupPorts.entries()) {
    if (p === port) {
      popupPorts.delete(tabId)
    }
  }
}

export function getFrameData(tabId: number): FrameHiddenInputs[] {
  const frameMap = tabFrameData.get(tabId)
  if (!frameMap) return []
  return sortFrameInputs(Array.from(frameMap.values()))
}

export function notifyPopup(tabId: number) {
  const port = popupPorts.get(tabId)
  if (port) {
    try {
      port.postMessage({
        type: MESSAGE_TYPES.ALL_FRAMES_DATA,
        data: getFrameData(tabId)
      })
    } catch (e) {
      logger.error("notifyPopup", e)
      popupPorts.delete(tabId)
    }
  }

  // Also notify overlay if pinned
  if (pinnedTabs.has(tabId)) {
    notifyOverlay(tabId)
  }
}

export function notifyOverlay(tabId: number) {
  const message = createPinStateMessage(true, getFrameData(tabId))
  chrome.tabs.sendMessage(tabId, message).catch((e) => {
    logger.error("notifyOverlay", e)
  })
}

export async function notifyOverlayWithResult(tabId: number): Promise<boolean> {
  const message = createPinStateMessage(true, getFrameData(tabId))
  try {
    await chrome.tabs.sendMessage(tabId, message)
    return true
  } catch (e) {
    logger.error("notifyOverlayWithResult", e)
    return false
  }
}

function isSameOrigin(frameUrl: string, mainFrameUrl: string): boolean {
  try {
    const frameOrigin = new URL(frameUrl).origin
    const mainOrigin = new URL(mainFrameUrl).origin
    return frameOrigin === mainOrigin
  } catch (e) {
    logger.error("isSameOrigin", e)
    return false
  }
}

async function getAllFrames(
  tabId: number
): Promise<chrome.webNavigation.GetAllFrameResultDetails[]> {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId })
    return frames || []
  } catch (e) {
    logger.error("getAllFrames", e)
    return []
  }
}

export async function collectAllHiddenInputs(tabId: number) {
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
          { type: MESSAGE_TYPES.GET_HIDDEN_INPUTS },
          { frameId: frame.frameId }
        )

        if (isHiddenInputsResultMessage(response)) {
          frameInfo.url = response.url || frame.url
          frameInfo.frameName = response.frameName

          const frameHiddenInputs: FrameHiddenInputs = {
            frame: frameInfo,
            inputs: response.inputs,
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
      } catch (e) {
        logger.error("collectAllHiddenInputs:sendMessage", e)
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

/**
 * HIDDEN_INPUTS_UPDATE メッセージを処理
 */
export function handleHiddenInputsUpdate(
  message: HiddenInputsUpdateMessage,
  sender: chrome.runtime.MessageSender
) {
  const tabId = sender.tab?.id
  if (!tabId) return

  const frameId = sender.frameId ?? 0

  let frameMap = tabFrameData.get(tabId)
  if (!frameMap) {
    frameMap = new Map()
    tabFrameData.set(tabId, frameMap)
  }

  const mainFrame = frameMap.get(0)
  const mainFrameUrl = mainFrame?.frame.url || ""

  const frameInfo: FrameInfo = {
    frameId,
    url: message.url,
    parentFrameId: frameId === 0 ? -1 : 0,
    frameName: message.frameName,
    isSameOrigin: frameId === 0 ? true : isSameOrigin(message.url, mainFrameUrl)
  }

  const frameHiddenInputs: FrameHiddenInputs = {
    frame: frameInfo,
    inputs: message.inputs,
    timestamp: new Date().toISOString()
  }

  frameMap.set(frameId, frameHiddenInputs)
  notifyPopup(tabId)
}

/**
 * TOGGLE_PIN メッセージを処理
 */
export async function handleTogglePin(
  message: TogglePinMessage,
  sendResponse: (response: { success: boolean; error?: string }) => void
) {
  const tabId = message.tabId

  if (message.pinned) {
    pinnedTabs.add(tabId)
    try {
      await collectAllHiddenInputs(tabId)
      const success = await notifyOverlayWithResult(tabId)
      if (success) {
        sendResponse({ success: true })
      } else {
        pinnedTabs.delete(tabId)
        sendResponse({ success: false, error: "CONTENT_SCRIPT_NOT_LOADED" })
      }
    } catch (e) {
      logger.error("handleTogglePin", e)
      pinnedTabs.delete(tabId)
      sendResponse({ success: false, error: "CONTENT_SCRIPT_NOT_LOADED" })
    }
  } else {
    pinnedTabs.delete(tabId)
    // Send unpin message to overlay
    const unpinMessage = createPinStateMessage(false)
    chrome.tabs.sendMessage(tabId, unpinMessage).catch((e) => {
      logger.error("handleTogglePin:unpin", e)
    })
    sendResponse({ success: true })
  }
}

/**
 * UNPIN_OVERLAY メッセージを処理
 */
export function handleUnpinOverlay(sender: chrome.runtime.MessageSender) {
  if (sender.tab?.id) {
    pinnedTabs.delete(sender.tab.id)
  }
}

/**
 * CHECK_PIN_STATE メッセージを処理
 */
export function handleCheckPinState(
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: { pinned: boolean }) => void
) {
  const tabId = sender.tab?.id
  if (!tabId) {
    sendResponse({ pinned: false })
    return
  }

  const isPinned = pinnedTabs.has(tabId)

  if (isPinned) {
    // Collect fresh data and send to overlay
    collectAllHiddenInputs(tabId)
      .then(() => {
        notifyOverlay(tabId)
      })
      .catch((e) => {
        logger.error("handleCheckPinState:collect", e)
      })
  }

  sendResponse({ pinned: isPinned })
}

/**
 * UPDATE_INPUT_VALUE メッセージを処理（overlayから、tabIdなし）
 */
export async function handleUpdateInputValueFromOverlay(
  message: UpdateInputValueMessage,
  sender: chrome.runtime.MessageSender
) {
  // Get tabId from sender.tab or find active tab as fallback
  let tabId: number | null = sender.tab?.id ?? null
  if (!tabId) {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    tabId = activeTab?.id ?? null
  }

  if (!tabId) return

  try {
    // Forward to content script in the correct frame
    const response = await chrome.tabs.sendMessage(
      tabId,
      {
        type: MESSAGE_TYPES.UPDATE_INPUT_VALUE,
        xpath: message.xpath,
        value: message.value
      } as UpdateInputValueMessage,
      { frameId: message.frameId }
    )

    if (response?.success) {
      // Refresh data after successful update
      await collectAllHiddenInputs(tabId)
    }
  } catch (e) {
    logger.error("handleUpdateInputValueFromOverlay", e)
  }
}

/**
 * タブが閉じられたときのクリーンアップ
 */
export function cleanupTab(tabId: number) {
  // ペンディング中のタイマーをキャンセル
  const timer = pendingRefreshTimers.get(tabId)
  if (timer) {
    clearTimeout(timer)
    pendingRefreshTimers.delete(tabId)
  }

  tabFrameData.delete(tabId)
  popupPorts.delete(tabId)
  pinnedTabs.delete(tabId)
}

/**
 * タブがナビゲートしたときのクリーンアップ
 */
export function cleanupTabOnNavigation(tabId: number) {
  tabFrameData.delete(tabId)
}

/**
 * ページ読み込み完了時のピン留めタブ更新
 */
export function refreshPinnedTabOnComplete(tabId: number) {
  if (!pinnedTabs.has(tabId)) return

  // 既存のタイマーをキャンセル
  const existingTimer = pendingRefreshTimers.get(tabId)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  // Wait a bit for all frames to initialize
  const timer = setTimeout(() => {
    pendingRefreshTimers.delete(tabId)
    collectAllHiddenInputs(tabId)
      .then(() => {
        notifyOverlay(tabId)
      })
      .catch((e) => {
        logger.error("refreshPinnedTabOnComplete", e)
      })
  }, TIMING.FRAME_INIT_DELAY_MS)

  pendingRefreshTimers.set(tabId, timer)
}
