import { useEffect, useRef, useState } from "react"

import {
  FrameSection,
  sortFrameInputs,
  type EditingInput
} from "~components/shared"
import type {
  FrameHiddenInputs,
  PortMessage,
  TogglePinMessage,
  UpdateInputValueMessage
} from "~types"

import "./style.css"

function PinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.5 2L14 6.5L10.5 10L11 14L8 11L5 14L5.5 10L2 6.5L6.5 2L9.5 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IndexPopup() {
  const [frameInputs, setFrameInputs] = useState<FrameHiddenInputs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingInput, setEditingInput] = useState<EditingInput | null>(null)
  const [tabId, setTabId] = useState<number | null>(null)
  const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set())

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
          setError("タブが見つかりません")
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
          if (message.type === "ALL_FRAMES_DATA") {
            const sorted = sortFrameInputs(message.data)
            setFrameInputs(sorted)
            // Only close all tabs on initial load
            if (isInitialLoadRef.current) {
              setExpandedFrames(new Set())
              isInitialLoadRef.current = false
            }
            setLoading(false)
          }
          if (message.type === "FRAME_DATA") {
            setFrameInputs((prev) => {
              const existing = prev.findIndex(
                (f) => f.frame.frameId === message.frameData.frame.frameId
              )
              if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = message.frameData
                return updated
              }
              return [...prev, message.frameData]
            })
          }
          if (message.type === "UPDATE_RESULT") {
            if (!message.success && message.error) {
              setError(message.error)
            }
          }
        })

        newPort.postMessage({
          type: "SUBSCRIBE_UPDATES",
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
  }, [])

  const toggleFrame = (frameId: number) => {
    setExpandedFrames((prev) => {
      const next = new Set(prev)
      if (next.has(frameId)) {
        next.delete(frameId)
      } else {
        next.add(frameId)
      }
      return next
    })
  }

  const handleEdit = (frameId: number, xpath: string, currentValue: string) => {
    setEditingInput({ frameId, xpath, value: currentValue })
    // Ensure the frame is expanded when editing
    setExpandedFrames((prev) => new Set(prev).add(frameId))
  }

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!editingInput || tabId === null) return

    const message: UpdateInputValueMessage & { tabId: number } = {
      type: "UPDATE_INPUT_VALUE",
      tabId,
      frameId: editingInput.frameId,
      xpath: editingInput.xpath,
      value: editingInput.value
    }

    if (sendMessage(message)) {
      setEditingInput(null)
    } else {
      setError("接続が切断されました")
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingInput(null)
  }

  const totalInputs = frameInputs.reduce(
    (sum, frame) => sum + frame.inputs.length,
    0
  )

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">読み込み中...</div>
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
      <div className="popup-container">
        <div className="error">
          <p>{error}</p>
          {needsReload && (
            <button
              type="button"
              className="btn btn--primary reload-btn"
              onClick={handleReloadPage}>
              ページをリロード
            </button>
          )}
        </div>
      </div>
    )
  }

  const handlePin = async () => {
    if (tabId === null) return

    const message: TogglePinMessage = {
      type: "TOGGLE_PIN",
      tabId,
      pinned: true
    }

    try {
      const response = await chrome.runtime.sendMessage(message)
      if (response?.success) {
        // Wait a bit for overlay to initialize before closing popup
        setTimeout(() => {
          window.close()
        }, 100)
      } else if (response?.error === "CONTENT_SCRIPT_NOT_LOADED") {
        setError(
          "ページをリロードしてください。拡張機能のコンテンツスクリプトがまだ読み込まれていません。"
        )
      } else {
        setError("固定表示に失敗しました")
      }
    } catch {
      setError("固定表示に失敗しました")
    }
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="popup-header-content">
          <h1 className="popup-title">Hidden Input Viewer</h1>
          <p className="popup-subtitle">
            {totalInputs}個のhidden inputを検出
            {frameInputs.length > 1 && ` (${frameInputs.length}フレーム)`}
          </p>
        </div>
        <button
          type="button"
          className="pin-btn"
          onClick={handlePin}
          title="ページに固定表示">
          <PinIcon />
        </button>
      </div>

      {frameInputs.length === 0 ? (
        <div className="empty-state">フレームが見つかりません</div>
      ) : (
        <div className="frame-list">
          {frameInputs.map((frameData) => (
            <FrameSection
              key={frameData.frame.frameId}
              frameData={frameData}
              expanded={expandedFrames.has(frameData.frame.frameId)}
              onToggle={() => toggleFrame(frameData.frame.frameId)}
              editingInput={editingInput}
              onEdit={handleEdit}
              onEditChange={(value) =>
                editingInput && setEditingInput({ ...editingInput, value })
              }
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
