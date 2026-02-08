import { cn } from "~utils/cn"

import { FrameHeader } from "./FrameHeader"
import { InputRow } from "./InputRow"
import type { FrameSectionProps } from "./types"

export function FrameSection({
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
  const contentId = `frame-content-${frame.frameId}`

  const contentClasses = cn(
    "grid transition-[grid-template-rows] duration-200 ease-out",
    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
  )

  return (
    <div className="border-b border-border-default last:border-b-0">
      <FrameHeader
        frame={frame}
        inputCount={inputs.length}
        expanded={expanded}
        onToggle={onToggle}
      />

      <div id={contentId} className={contentClasses}>
        <div className="min-h-0 overflow-hidden">
          {inputs.length === 0 ? (
            <div className="p-3 text-text-muted text-xs italic bg-bg-primary">
              hidden inputなし
            </div>
          ) : (
            <div className="bg-bg-primary">
              {inputs.map((input) => (
                <InputRow
                  key={input.xpath}
                  input={input}
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
