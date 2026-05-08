import { useState } from "react"

import { cn } from "~utils/cn"

import { EyeIcon, EyeOffIcon } from "./icons"
import { InputEditForm } from "./InputEditForm"
import type { InputRowProps } from "./types"

const PASSWORD_MASK = "••••••••"

export function InputRow({
  input,
  isEditing,
  editValue,
  onEdit,
  onEditChange,
  onSave,
  onCancel,
  onImmediateSave
}: InputRowProps) {
  const displayName = input.name || input.id || "(名前なし)"
  const [revealPassword, setRevealPassword] = useState(false)

  const containerClasses =
    "px-3 py-2.5 border-b border-border-default last:border-b-0 transition-colors duration-150 hover:bg-bg-hover"

  const header = (
    <>
      <div className="text-[13px] font-medium text-text-primary break-all">
        {displayName}
      </div>
      {input.formName && (
        <div className="text-[11px] text-text-tertiary mt-0.5">
          form: {input.formName}
        </div>
      )}
    </>
  )

  // checkbox / radio: チェック状態を即時切替
  if (input.type === "checkbox" || input.type === "radio") {
    const isChecked = !!input.checked
    return (
      <div className={containerClasses}>
        {header}
        <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) =>
              onImmediateSave(e.target.checked ? "true" : "false")
            }
            className="w-4 h-4 cursor-pointer"
            aria-label={`${displayName}のチェック状態を切替`}
          />
          <span className="text-xs font-mono text-text-secondary">
            {isChecked ? "checked" : "unchecked"}
          </span>
          {input.value && (
            <span className="text-[11px] text-text-tertiary ml-1">
              value: {input.value}
            </span>
          )}
        </label>
      </div>
    )
  }

  // file: 編集不可
  if (input.type === "file") {
    return (
      <div className={containerClasses}>
        {header}
        <div className="mt-1.5 px-2.5 py-2 bg-bg-input rounded-md font-mono text-xs text-text-tertiary italic break-all">
          {input.value || "(ファイル未選択)"}
          <div className="text-[11px] not-italic mt-1 text-text-muted">
            file 入力は編集できません
          </div>
        </div>
      </div>
    )
  }

  // 編集モード（select/textarea/text系/typed input/password など）
  if (isEditing) {
    return (
      <div className={containerClasses}>
        {header}
        <InputEditForm
          input={input}
          value={editValue}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
    )
  }

  const valueClasses = cn(
    "mt-1.5 px-2.5 py-2",
    "bg-bg-input rounded-md",
    "font-mono text-xs text-text-secondary",
    "cursor-pointer transition-colors duration-150",
    "break-all leading-relaxed",
    "hover:bg-bg-input-hover",
    !input.value && "text-text-muted italic"
  )

  // password 表示モード: マスク + 目アイコン
  if (input.type === "password") {
    const displayValue = input.value
      ? revealPassword
        ? input.value
        : PASSWORD_MASK
      : "(空)"
    return (
      <div className={containerClasses}>
        {header}
        <div className="flex items-stretch gap-2 mt-1.5">
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
            className={cn(valueClasses, "flex-1 mt-0")}
            title="クリックして編集"
            aria-label={`${displayName}を編集`}>
            {displayValue}
          </div>
          {input.value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setRevealPassword((p) => !p)
              }}
              className={cn(
                "shrink-0 px-2 rounded-md border-none cursor-pointer",
                "bg-bg-tertiary text-text-secondary",
                "hover:bg-bg-hover hover:text-text-primary",
                "transition-colors duration-150"
              )}
              title={revealPassword ? "値を隠す" : "値を表示"}
              aria-label={revealPassword ? "値を隠す" : "値を表示"}>
              {revealPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
        </div>
      </div>
    )
  }

  // 既定（text/textarea/select/typed input）
  const defaultDisplayValue = (() => {
    if (input.tagName === "select" && input.options) {
      const selected = input.options.find((o) => o.value === input.value)
      if (selected) return selected.text || selected.value
    }
    return input.value
  })()

  return (
    <div className={containerClasses}>
      {header}
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
        {defaultDisplayValue || "(空)"}
      </div>
    </div>
  )
}
