import { Button } from "./Button"
import { EditControl } from "./EditControl"
import type { InputEditFormProps } from "./types"

export function InputEditForm({
  input,
  value,
  onChange,
  onSave,
  onCancel
}: InputEditFormProps) {
  return (
    <div>
      <EditControl input={input} value={value} onChange={onChange} />
      <div className="flex gap-2 mt-2">
        <Button onClick={onSave}>保存</Button>
        <Button variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}
