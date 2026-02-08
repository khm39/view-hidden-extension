import { cn } from "~utils/cn"

import { ChevronIcon } from "./icons"
import type { FrameHeaderProps } from "./types"

export function FrameHeader({
  frame,
  inputCount,
  expanded,
  onToggle
}: FrameHeaderProps) {
  const isMainFrame = frame.frameId === 0
  const contentId = `frame-content-${frame.frameId}`

  const buttonClasses = cn(
    "flex items-start gap-2 w-full px-3 py-2.5",
    "border-none cursor-pointer text-left",
    "transition-colors duration-150",
    "hover:bg-bg-hover",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
    isMainFrame ? "bg-frame-main-bg" : "bg-frame-iframe-bg"
  )

  const badgeClasses = cn(
    "text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide",
    isMainFrame
      ? "bg-frame-main-badge-bg text-frame-main-badge-text"
      : "bg-frame-iframe-badge-bg text-frame-iframe-badge-text"
  )

  return (
    <button
      className={buttonClasses}
      onClick={onToggle}
      type="button"
      aria-expanded={expanded}
      aria-controls={contentId}>
      <ChevronIcon expanded={expanded} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={badgeClasses}>
            {isMainFrame ? "Main" : "iframe"}
          </span>
          {!frame.isSameOrigin && !isMainFrame && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide bg-frame-crossorigin-badge-bg text-frame-crossorigin-badge-text">
              Cross-Origin
            </span>
          )}
          {frame.frameName && (
            <span className="text-[11px] text-text-tertiary">
              name: {frame.frameName}
            </span>
          )}
          <span className="text-[10px] font-semibold py-0.5 text-text-tertiary ml-auto">
            {inputCount}個
          </span>
        </div>
        <div
          className="text-[11px] text-text-tertiary mt-1 whitespace-nowrap overflow-hidden text-ellipsis"
          title={frame.url}>
          {frame.url}
        </div>
      </div>
    </button>
  )
}
