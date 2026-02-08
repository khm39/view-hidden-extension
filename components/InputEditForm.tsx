import { cn } from "~utils/cn"

import { Button } from "./Button"
import type { InputEditFormProps } from "./types"

export function InputEditForm({
  value,
  onChange,
  onSave,
  onCancel
}: InputEditFormProps) {
  const textareaClasses = cn(
    "w-full px-2.5 py-2 mt-1.5",
    "bg-input-bg border-2 border-input-border rounded-md",
    "font-mono text-xs text-text-primary",
    "resize-y min-h-[60px] leading-relaxed",
    "transition-colors duration-150",
    "focus:outline-none focus:border-input-border-focus"
  )

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaClasses}
        rows={3}
        autoFocus
        aria-label="値を編集"
      />
      <div className="flex gap-2 mt-2">
        <Button onClick={onSave}>保存</Button>
        <Button variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}
