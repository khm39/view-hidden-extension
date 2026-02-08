import cssText from "data-text:~overlay.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { Button } from "~components/Button"
import { FrameSection } from "~components/FrameSection"
import { CloseIcon, DragIcon } from "~components/icons"
import { useHiddenInputs } from "~hooks/useHiddenInputs"
import type { PinStateMessage, UpdateInputValueMessage } from "~types"
import { cn } from "~utils/cn"
import { MESSAGE_TYPES, TIMING, UI_CONFIG } from "~utils/constants"
import { isExtensionContextValid } from "~utils/extension"
import { logger } from "~utils/logger"

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

function Overlay() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

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
    updateFrameData
  } = useHiddenInputs({ collapseOnInitialLoad: false })

  useEffect(() => {
    if (!isExtensionContextValid()) return

    const handleMessage = (message: PinStateMessage) => {
      if (message.type === MESSAGE_TYPES.PIN_STATE) {
        setVisible(message.pinned)
        if (message.data) {
          updateFrameData(message.data)
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Check if this tab is pinned (for page navigation case)
    const checkPinState = () => {
      if (!isExtensionContextValid()) return
      chrome.runtime
        .sendMessage({ type: MESSAGE_TYPES.CHECK_PIN_STATE })
        .catch((e) => {
          logger.error("checkPinState", e)
        })
    }

    // Small delay to avoid race condition on initial load
    const timerId = setTimeout(checkPinState, TIMING.PIN_CHECK_DELAY_MS)

    return () => {
      clearTimeout(timerId)
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [updateFrameData])

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
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.UNPIN_OVERLAY })
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editingInput) return

    const message: UpdateInputValueMessage = {
      type: MESSAGE_TYPES.UPDATE_INPUT_VALUE as "UPDATE_INPUT_VALUE",
      frameId: editingInput.frameId,
      xpath: editingInput.xpath,
      value: editingInput.value
    }

    chrome.runtime.sendMessage(message)
    setEditingInput(null)
  }

  if (!visible) return null

  const containerClasses = cn(
    `fixed z-[${UI_CONFIG.OVERLAY_Z_INDEX}] w-[${UI_CONFIG.PANEL_WIDTH}] max-h-[${UI_CONFIG.PANEL_MAX_HEIGHT}]`,
    "bg-bg-primary rounded-xl shadow-overlay",
    "font-sans text-sm text-text-primary",
    "overflow-hidden flex flex-col"
  )

  const headerClasses = cn(
    "flex items-center gap-2 px-4 py-3",
    "bg-bg-secondary border-b border-border-default",
    "cursor-grab select-none active:cursor-grabbing"
  )

  return (
    <div
      ref={overlayRef}
      className={containerClasses}
      style={{
        left: position.x,
        top: position.y
      }}>
      <div className={headerClasses} onMouseDown={handleDragStart}>
        <div className="text-text-tertiary shrink-0">
          <DragIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold m-0 text-text-primary">
            Hidden Input Viewer
          </h1>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {totalInputs}個のhidden inputを検出
            {frameInputs.length > 1 && ` (${frameInputs.length}フレーム)`}
          </p>
        </div>
        <Button variant="icon-ghost" onClick={handleClose} title="閉じる">
          <CloseIcon />
        </Button>
      </div>

      <div className="overlay-body flex-1 overflow-y-auto">
        {frameInputs.length === 0 ? (
          <div className="p-6 text-center text-text-tertiary italic">
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
    </div>
  )
}

export default Overlay
