import cssText from "data-text:~overlay.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useRef, useState } from "react"

import {
  FrameSection,
  sortFrameInputs,
  type EditingInput
} from "~components/shared"
import type {
  FrameHiddenInputs,
  PinStateMessage,
  UpdateInputValueMessage
} from "~types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  run_at: "document_idle"
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DragIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="4" r="1.5" fill="currentColor" />
      <circle cx="11" cy="4" r="1.5" fill="currentColor" />
      <circle cx="5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="11" cy="8" r="1.5" fill="currentColor" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function Overlay() {
  const [visible, setVisible] = useState(false)
  const [frameInputs, setFrameInputs] = useState<FrameHiddenInputs[]>([])
  const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set())
  const [editingInput, setEditingInput] = useState<EditingInput | null>(null)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      return
    }

    const handleMessage = (message: PinStateMessage) => {
      if (message.type === "PIN_STATE") {
        setVisible(message.pinned)
        if (message.data) {
          const sorted = sortFrameInputs(message.data)
          setFrameInputs(sorted)
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Check if this tab is pinned (for page navigation case)
    // Delay slightly to ensure extension context is ready
    const checkPinState = () => {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        return
      }
      chrome.runtime.sendMessage({ type: "CHECK_PIN_STATE" }).catch(() => {
        // Extension context invalidated
      })
    }

    // Small delay to avoid race condition on initial load
    const timerId = setTimeout(checkPinState, 100)

    return () => {
      clearTimeout(timerId)
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const handleDragStart = (e: React.MouseEvent) => {
    if (overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect()
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      setIsDragging(true)
    }
  }

  const handleClose = () => {
    setVisible(false)
    chrome.runtime.sendMessage({ type: "UNPIN_OVERLAY" })
  }

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
    setExpandedFrames((prev) => new Set(prev).add(frameId))
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editingInput) return

    const message: UpdateInputValueMessage = {
      type: "UPDATE_INPUT_VALUE",
      frameId: editingInput.frameId,
      xpath: editingInput.xpath,
      value: editingInput.value
    }

    chrome.runtime.sendMessage(message)
    setEditingInput(null)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingInput(null)
  }

  if (!visible) return null

  const totalInputs = frameInputs.reduce(
    (sum, frame) => sum + frame.inputs.length,
    0
  )

  return (
    <div
      ref={overlayRef}
      className="overlay-container"
      style={{
        left: position.x,
        top: position.y
      }}>
      <div className="overlay-header" onMouseDown={handleDragStart}>
        <div className="overlay-drag-handle">
          <DragIcon />
        </div>
        <div className="overlay-header-content">
          <h1 className="overlay-title">Hidden Input Viewer</h1>
          <p className="overlay-subtitle">
            {totalInputs}個のhidden inputを検出
            {frameInputs.length > 1 && ` (${frameInputs.length}フレーム)`}
          </p>
        </div>
        <button
          type="button"
          className="overlay-close-btn"
          onClick={handleClose}
          title="閉じる">
          <CloseIcon />
        </button>
      </div>

      <div className="overlay-body">
        {frameInputs.length === 0 ? (
          <div className="overlay-empty">フレームが見つかりません</div>
        ) : (
          <div className="overlay-frame-list">
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
                classPrefix="overlay"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Overlay
