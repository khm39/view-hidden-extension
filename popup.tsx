import { useEffect, useRef, useState } from "react"

import { Button } from "~components/Button"
import { FrameSection } from "~components/FrameSection"
import { PinIcon } from "~components/icons"
import type { EditingInput } from "~components/types"
import { useHiddenInputs } from "~hooks/useHiddenInputs"
import type {
  PortMessage,
  TogglePinMessage,
  UpdateInputValueMessageWithTab
} from "~types"
import { cn } from "~utils/cn"
import {
  ERROR_MESSAGES,
  MESSAGE_TYPES,
  TIMING,
  UI_CONFIG
} from "~utils/constants"

import "./style.css"

function IndexPopup() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabId, setTabId] = useState<number | null>(null)

  const {
    frameInputs,
    expandedFrames,
    editingInput,
    totalInputs,
    toggleFrame,
    handleEdit,
    handleEditChange,
    handleCancel,
    setEditingInput,
    handlePortMessage
  } = useHiddenInputs({ collapseOnInitialLoad: true })

  // Use ref for port to avoid stale closure issues
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const isConnectedRef = useRef(false)
  const isInitialLoadRef = useRef(true)

  const sendMessage = (message: unknown) => {
    if (portRef.current && isConnectedRef.current) {
      try {
        portRef.current.postMessage(message)
        return true
      } catch {
        isConnectedRef.current = false
        return false
      }
    }
    return false
  }

  useEffect(() => {
    const init = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })

        if (!tab?.id) {
          setError(ERROR_MESSAGES.TAB_NOT_FOUND)
          setLoading(false)
          return
        }

        setTabId(tab.id)

        const newPort = chrome.runtime.connect({ name: "popup" })
        portRef.current = newPort
        isConnectedRef.current = true

        newPort.onDisconnect.addListener(() => {
          isConnectedRef.current = false
          portRef.current = null
        })

        newPort.onMessage.addListener((message: PortMessage) => {
          const result = handlePortMessage(message, isInitialLoadRef.current)
          if (result.shouldSetLoading) {
            isInitialLoadRef.current = false
            setLoading(false)
          }
          if (message.type === MESSAGE_TYPES.UPDATE_RESULT) {
            if (!message.success && message.error) {
              setError(message.error)
            }
          }
        })

        newPort.postMessage({
          type: MESSAGE_TYPES.SUBSCRIBE_UPDATES,
          tabId: tab.id
        })
      } catch (err) {
        setError(String(err))
        setLoading(false)
      }
    }

    init()

    return () => {
      if (portRef.current && isConnectedRef.current) {
        try {
          portRef.current.disconnect()
        } catch {
          // Ignore disconnect errors
        }
      }
      isConnectedRef.current = false
      portRef.current = null
    }
  }, [handlePortMessage])

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!editingInput || tabId === null) return

    const message: UpdateInputValueMessageWithTab = {
      type: MESSAGE_TYPES.UPDATE_INPUT_VALUE as "UPDATE_INPUT_VALUE",
      tabId,
      frameId: editingInput.frameId,
      xpath: editingInput.xpath,
      value: editingInput.value
    }

    if (sendMessage(message)) {
      setEditingInput(null)
    } else {
      setError(ERROR_MESSAGES.CONNECTION_LOST)
    }
  }

  const panelClasses = cn(
    `w-[${UI_CONFIG.PANEL_WIDTH}] max-h-[${UI_CONFIG.PANEL_MAX_HEIGHT}]`,
    "overflow-auto bg-bg-primary"
  )

  if (loading) {
    return (
      <div className={panelClasses}>
        <div className="p-6 text-center text-text-secondary">読み込み中...</div>
      </div>
    )
  }

  const handleReloadPage = async () => {
    if (tabId === null) return
    await chrome.tabs.reload(tabId)
    window.close()
  }

  if (error) {
    const needsReload = error.includes("リロード")
    return (
      <div className={panelClasses}>
        <div className="p-4 text-red-500 text-[13px]">
          <p className="m-0 mb-3">{error}</p>
          {needsReload && (
            <Button className="w-full" onClick={handleReloadPage}>
              ページをリロード
            </Button>
          )}
        </div>
      </div>
    )
  }

  const handlePin = async () => {
    if (tabId === null) return

    const message: TogglePinMessage = {
      type: MESSAGE_TYPES.TOGGLE_PIN as "TOGGLE_PIN",
      tabId,
      pinned: true
    }

    try {
      const response = await chrome.runtime.sendMessage(message)
      if (response?.success) {
        // Wait a bit for overlay to initialize before closing popup
        setTimeout(() => {
          window.close()
        }, TIMING.OVERLAY_CLOSE_DELAY_MS)
      } else if (response?.error === "CONTENT_SCRIPT_NOT_LOADED") {
        setError(ERROR_MESSAGES.CONTENT_SCRIPT_NOT_LOADED)
      } else {
        setError(ERROR_MESSAGES.PIN_FAILED)
      }
    } catch {
      setError(ERROR_MESSAGES.PIN_FAILED)
    }
  }

  return (
    <div className={panelClasses}>
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-bg-primary border-b border-border-default px-4 py-3 shadow-sm">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-text-primary m-0">
            Hidden Input Viewer
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {totalInputs}個のhidden inputを検出
            {frameInputs.length > 1 && ` (${frameInputs.length}フレーム)`}
          </p>
        </div>
        <Button variant="icon" onClick={handlePin} title="ページに固定表示">
          <PinIcon />
        </Button>
      </div>

      {frameInputs.length === 0 ? (
        <div className="p-3 text-center text-text-tertiary text-[13px] italic bg-bg-primary">
          フレームが見つかりません
        </div>
      ) : (
        <div className="flex flex-col">
          {frameInputs.map((frameData) => (
            <FrameSection
              key={frameData.frame.frameId}
              frameData={frameData}
              expanded={expandedFrames.has(frameData.frame.frameId)}
              onToggle={() => toggleFrame(frameData.frame.frameId)}
              editingInput={editingInput}
              onEdit={handleEdit}
              onEditChange={handleEditChange}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default IndexPopup
