import { cn } from "~utils/cn"

import { InputEditForm } from "./InputEditForm"
import type { InputRowProps } from "./types"

export function InputRow({
  input,
  isEditing,
  editValue,
  onEdit,
  onEditChange,
  onSave,
  onCancel
}: InputRowProps) {
  const displayName = input.name || input.id || "(名前なし)"

  const valueClasses = cn(
    "mt-1.5 px-2.5 py-2",
    "bg-bg-input rounded-md",
    "font-mono text-xs text-text-secondary",
    "cursor-pointer transition-colors duration-150",
    "break-all leading-relaxed",
    "hover:bg-bg-input-hover",
    !input.value && "text-text-muted italic"
  )

  return (
    <div className="px-3 py-2.5 border-b border-border-default last:border-b-0 transition-colors duration-150 hover:bg-bg-hover">
      <div className="text-[13px] font-medium text-text-primary break-all">
        {displayName}
      </div>
      {input.formName && (
        <div className="text-[11px] text-text-tertiary mt-0.5">
          form: {input.formName}
        </div>
      )}

      {isEditing ? (
        <InputEditForm
          value={editValue}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <div
          onClick={onEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onEdit()
            }
          }}
          role="button"
          tabIndex={0}
          className={valueClasses}
          title="クリックして編集"
          aria-label={`${displayName}を編集`}>
          {input.value || "(空)"}
        </div>
      )}
    </div>
  )
}
