import type { FrameHiddenInputs, HiddenInputInfo } from "~types"

// Editing input state interface
export interface EditingInput {
  frameId: number
  xpath: string
  value: string
}

// Sort frame inputs: frames with inputs first, then main frame first
export function sortFrameInputs(
  data: FrameHiddenInputs[]
): FrameHiddenInputs[] {
  return [...data].sort((a, b) => {
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
}

// Chevron icon component
export function ChevronIcon({
  expanded,
  className = ""
}: {
  expanded: boolean
  className?: string
}) {
  const baseClass = className || "chevron-icon"
  const expandedClass = className
    ? `${className}--expanded`
    : "chevron-icon--expanded"

  return (
    <svg
      className={`${baseClass} ${expanded ? expandedClass : ""}`}
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

// Frame section props interface
export interface FrameSectionProps {
  frameData: FrameHiddenInputs
  expanded: boolean
  onToggle: () => void
  editingInput: EditingInput | null
  onEdit: (frameId: number, xpath: string, currentValue: string) => void
  onEditChange: (value: string) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
  classPrefix?: string
}

// Input row props interface
export interface InputRowProps {
  input: HiddenInputInfo
  frameId: number
  isEditing: boolean
  editValue: string
  onEdit: () => void
  onEditChange: (value: string) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
  classPrefix?: string
}

// Generic Frame Section component
export function FrameSection({
  frameData,
  expanded,
  onToggle,
  editingInput,
  onEdit,
  onEditChange,
  onSave,
  onCancel,
  classPrefix = ""
}: FrameSectionProps) {
  const { frame, inputs } = frameData
  const isMainFrame = frame.frameId === 0
  const prefix = classPrefix ? `${classPrefix}-` : ""

  const sectionClass = `${prefix}frame-section ${
    isMainFrame
      ? `${prefix}frame-section--main`
      : `${prefix}frame-section--iframe`
  } ${expanded ? `${prefix}frame-section--expanded` : ""}`

  return (
    <div className={sectionClass}>
      <button className={`${prefix}frame-tab`} onClick={onToggle} type="button">
        <ChevronIcon
          expanded={expanded}
          className={classPrefix ? `${prefix}chevron-icon` : ""}
        />
        <div className={`${prefix}frame-tab-content`}>
          <div className={`${prefix}frame-badges`}>
            <span
              className={`${prefix}badge ${isMainFrame ? `${prefix}badge--main` : `${prefix}badge--iframe`}`}>
              {isMainFrame ? "Main" : "iframe"}
            </span>
            {!frame.isSameOrigin && !isMainFrame && (
              <span className={`${prefix}badge ${prefix}badge--crossorigin`}>
                Cross-Origin
              </span>
            )}
            {frame.frameName && (
              <span className={`${prefix}frame-name`}>
                name: {frame.frameName}
              </span>
            )}
            <span className={`${prefix}badge ${prefix}badge--count`}>
              {inputs.length}個
            </span>
          </div>
          <div className={`${prefix}frame-url`} title={frame.url}>
            {frame.url}
          </div>
        </div>
      </button>

      <div
        className={`${prefix}frame-content ${expanded ? `${prefix}frame-content--expanded` : ""}`}>
        <div className={`${prefix}frame-content-inner`}>
          {inputs.length === 0 ? (
            <div className={`${prefix}frame-empty`}>hidden inputなし</div>
          ) : (
            <div className={`${prefix}input-list`}>
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
                  classPrefix={classPrefix}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Generic Input Row component
export function InputRow({
  input,
  isEditing,
  editValue,
  onEdit,
  onEditChange,
  onSave,
  onCancel,
  classPrefix = ""
}: InputRowProps) {
  const displayName = input.name || input.id || "(名前なし)"
  const prefix = classPrefix ? `${classPrefix}-` : ""

  return (
    <div className={`${prefix}input-row`}>
      <div className={`${prefix}input-name`}>{displayName}</div>
      {input.formName && (
        <div className={`${prefix}input-form`}>form: {input.formName}</div>
      )}

      {isEditing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className={`${prefix}edit-textarea`}
            rows={3}
            autoFocus
          />
          <div className={`${prefix}edit-buttons`}>
            <button
              type="button"
              onClick={(e) => onSave(e)}
              className={`${prefix}btn ${prefix}btn--primary`}>
              保存
            </button>
            <button
              type="button"
              onClick={(e) => onCancel(e)}
              className={`${prefix}btn ${prefix}btn--secondary`}>
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onEdit}
          className={`${prefix}input-value ${!input.value ? `${prefix}input-value--empty` : ""}`}
          title="クリックして編集">
          {input.value || "(空)"}
        </div>
      )}
    </div>
  )
}
