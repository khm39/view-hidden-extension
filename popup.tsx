import { useEffect, useRef, useState } from "react"

import type {
  FrameHiddenInputs,
  HiddenInputInfo,
  PortMessage,
  UpdateInputValueMessage
} from "~types"

import "./style.css"

interface EditingInput {
  frameId: number
  xpath: string
  value: string
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`chevron-icon ${expanded ? "chevron-icon--expanded" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="2"
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
      } catch (err) {
        console.error("Failed to send message:", err)
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
          if (message.type === "ALL_FRAMES_DATA" && message.data) {
            // Sort: frames with inputs first, then frames without inputs
            const sorted = [...message.data].sort((a, b) => {
              const aHasInputs = a.inputs.length > 0 ? 0 : 1
              const bHasInputs = b.inputs.length > 0 ? 0 : 1
              if (aHasInputs !== bHasInputs) {
                return aHasInputs - bHasInputs
              }
              // Within same group, main frame first
              if (a.frame.frameId === 0) return -1
              if (b.frame.frameId === 0) return 1
              return a.frame.frameId - b.frame.frameId
            })
            setFrameInputs(sorted)
            // Only close all tabs on initial load
            if (isInitialLoadRef.current) {
              setExpandedFrames(new Set())
              isInitialLoadRef.current = false
            }
            setLoading(false)
          }
          if (message.type === "FRAME_DATA" && message.frameData) {
            setFrameInputs((prev) => {
              const existing = prev.findIndex(
                (f) => f.frame.frameId === message.frameData!.frame.frameId
              )
              if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = message.frameData!
                return updated
              }
              return [...prev, message.frameData!]
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

  if (error) {
    return (
      <div className="popup-container">
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1 className="popup-title">Hidden Input Viewer</h1>
        <p className="popup-subtitle">
          {totalInputs}個のhidden inputを検出
          {frameInputs.length > 1 && ` (${frameInputs.length}フレーム)`}
        </p>
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

interface FrameSectionProps {
  frameData: FrameHiddenInputs
  expanded: boolean
  onToggle: () => void
  editingInput: EditingInput | null
  onEdit: (frameId: number, xpath: string, currentValue: string) => void
  onEditChange: (value: string) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
}

function FrameSection({
  frameData,
  expanded,
  onToggle,
  editingInput,
  onEdit,
  onEditChange,
  onSave,
  onCancel
}: FrameSectionProps) {
  const { frame, inputs } = frameData
  const isMainFrame = frame.frameId === 0

  const sectionClass = `frame-section ${
    isMainFrame ? "frame-section--main" : "frame-section--iframe"
  } ${expanded ? "frame-section--expanded" : ""}`

  return (
    <div className={sectionClass}>
      <button className="frame-tab" onClick={onToggle} type="button">
        <ChevronIcon expanded={expanded} />
        <div className="frame-tab-content">
          <div className="frame-badges">
            <span
              className={`badge ${isMainFrame ? "badge--main" : "badge--iframe"}`}>
              {isMainFrame ? "Main" : "iframe"}
            </span>
            {!frame.isSameOrigin && !isMainFrame && (
              <span className="badge badge--crossorigin">Cross-Origin</span>
            )}
            {frame.frameName && (
              <span className="frame-name">name: {frame.frameName}</span>
            )}
            <span className="badge badge--count">{inputs.length}個</span>
          </div>
          <div className="frame-url" title={frame.url}>
            {frame.url}
          </div>
        </div>
      </button>

      <div
        className={`frame-content ${expanded ? "frame-content--expanded" : ""}`}>
        <div className="frame-content-inner">
          {inputs.length === 0 ? (
            <div className="frame-empty">hidden inputなし</div>
          ) : (
            <div className="input-list">
              {inputs.map((input) => (
                <InputRow
                  key={input.xpath}
                  input={input}
                  frameId={frame.frameId}
                  isEditing={
                    editingInput?.frameId === frame.frameId &&
                    editingInput?.xpath === input.xpath
                  }
                  editValue={editingInput?.value ?? ""}
                  onEdit={() => onEdit(frame.frameId, input.xpath, input.value)}
                  onEditChange={onEditChange}
                  onSave={onSave}
                  onCancel={onCancel}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface InputRowProps {
  input: HiddenInputInfo
  frameId: number
  isEditing: boolean
  editValue: string
  onEdit: () => void
  onEditChange: (value: string) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
}

function InputRow({
  input,
  isEditing,
  editValue,
  onEdit,
  onEditChange,
  onSave,
  onCancel
}: InputRowProps) {
  const displayName = input.name || input.id || "(名前なし)"

  return (
    <div className="input-row">
      <div className="input-name">{displayName}</div>
      {input.formName && (
        <div className="input-form">form: {input.formName}</div>
      )}

      {isEditing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="edit-textarea"
            rows={3}
            autoFocus
          />
          <div className="edit-buttons">
            <button
              type="button"
              onClick={(e) => onSave(e)}
              className="btn btn--primary">
              保存
            </button>
            <button
              type="button"
              onClick={(e) => onCancel(e)}
              className="btn btn--secondary">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onEdit}
          className={`input-value ${!input.value ? "input-value--empty" : ""}`}
          title="クリックして編集">
          {input.value || "(空)"}
        </div>
      )}
    </div>
  )
}

export default IndexPopup
