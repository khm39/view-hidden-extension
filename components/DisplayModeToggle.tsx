import type { InputCounts } from "~hooks/useHiddenInputs"
import type { DisplayMode } from "~types"
import { cn } from "~utils/cn"
import { DISPLAY_MODES } from "~utils/constants"

interface DisplayModeToggleProps {
  mode: DisplayMode
  counts: InputCounts
  onChange: (mode: DisplayMode) => void
}

const MODE_ITEMS: {
  value: DisplayMode
  label: string
  countKey: keyof InputCounts
}[] = [
  { value: DISPLAY_MODES.HIDDEN, label: "hidden", countKey: "hidden" },
  { value: DISPLAY_MODES.VISIBLE, label: "visible", countKey: "visible" },
  { value: DISPLAY_MODES.ALL, label: "all", countKey: "all" }
]

export function DisplayModeToggle({
  mode,
  counts,
  onChange
}: DisplayModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="表示モード"
      className="inline-flex rounded-md bg-bg-tertiary p-0.5 gap-0.5">
      {MODE_ITEMS.map((m) => {
        const isActive = mode === m.value
        return (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(m.value)}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded",
              "border-none cursor-pointer",
              "transition-colors duration-150",
              isActive
                ? "bg-bg-primary text-text-primary shadow-sm"
                : "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            )}>
            {m.label}{" "}
            <span className="opacity-60 tabular-nums">
              {counts[m.countKey]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
