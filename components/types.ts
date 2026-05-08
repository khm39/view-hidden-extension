import type { FrameHiddenInputs, HiddenInputInfo } from "~types"

// 編集中の入力フィールド状態
export interface EditingInput {
  frameId: number
  xpath: string
  value: string
}

// フレームセクションのProps
export interface FrameSectionProps {
  frameData: FrameHiddenInputs
  expanded: boolean
  onToggle: () => void
  editingInput: EditingInput | null
  onEdit: (frameId: number, xpath: string, currentValue: string) => void
  onEditChange: (value: string) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
  onImmediateSave: (frameId: number, xpath: string, value: string) => void
}

// フレームヘッダーのProps
export interface FrameHeaderProps {
  frame: FrameHiddenInputs["frame"]
  inputCount: number
  expanded: boolean
  onToggle: () => void
}

// 入力行のProps
export interface InputRowProps {
  input: HiddenInputInfo
  isEditing: boolean
  editValue: string
  onEdit: () => void
  onEditChange: (value: string) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
  onImmediateSave: (value: string) => void
}

// 編集フォームのProps
export interface InputEditFormProps {
  input: HiddenInputInfo
  value: string
  onChange: (value: string) => void
  onSave: (e: React.MouseEvent) => void
  onCancel: (e: React.MouseEvent) => void
}
