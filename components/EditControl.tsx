import type { HiddenInputInfo } from "~types"
import { cn } from "~utils/cn"

interface EditControlProps {
  input: HiddenInputInfo
  value: string
  onChange: (value: string) => void
}

// 改行を含むことがある text 系の type は textarea で編集
const TEXTAREA_LIKE_TYPES = new Set([
  "text",
  "email",
  "url",
  "search",
  "tel",
  "hidden"
])

const baseControlClasses = cn(
  "w-full px-2.5 py-2 mt-1.5",
  "bg-input-bg border-2 border-input-border rounded-md",
  "font-mono text-xs text-text-primary",
  "transition-colors duration-150",
  "focus:outline-none focus:border-input-border-focus"
)

export function EditControl({ input, value, onChange }: EditControlProps) {
  if (input.tagName === "select" && input.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseControlClasses}
        autoFocus
        aria-label="値を編集">
        {input.options.map((opt, idx) => (
          <option key={`${opt.value}-${idx}`} value={opt.value}>
            {opt.text || "(空のオプション)"}
          </option>
        ))}
      </select>
    )
  }

  if (input.tagName === "textarea" || TEXTAREA_LIKE_TYPES.has(input.type)) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          baseControlClasses,
          "resize-y min-h-[60px] leading-relaxed"
        )}
        rows={3}
        autoFocus
        aria-label="値を編集"
      />
    )
  }

  // password は編集中だけ平文表示
  if (input.type === "password") {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseControlClasses}
        autoFocus
        aria-label="値を編集"
      />
    )
  }

  // date/time/datetime-local/month/week/color/range/number 等
  return (
    <input
      type={input.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={baseControlClasses}
      autoFocus
      aria-label="値を編集"
    />
  )
}
