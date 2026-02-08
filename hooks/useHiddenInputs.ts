import { useCallback, useMemo, useState } from "react"

import type { EditingInput } from "~components/types"
import type { FrameHiddenInputs, PortMessage } from "~types"
import { MESSAGE_TYPES } from "~utils/constants"
import { sortFrameInputs } from "~utils/frameSort"

export interface UseHiddenInputsOptions {
  /** 初回読み込み時にすべてのフレームを閉じるかどうか */
  collapseOnInitialLoad?: boolean
}

export interface UseHiddenInputsReturn {
  frameInputs: FrameHiddenInputs[]
  expandedFrames: Set<number>
  editingInput: EditingInput | null
  totalInputs: number
  toggleFrame: (frameId: number) => void
  handleEdit: (frameId: number, xpath: string, currentValue: string) => void
  handleEditChange: (value: string) => void
  handleCancel: (e: React.MouseEvent) => void
  setEditingInput: React.Dispatch<React.SetStateAction<EditingInput | null>>
  handlePortMessage: (
    message: PortMessage,
    isInitialLoad: boolean
  ) => { shouldSetLoading: boolean }
  updateFrameData: (data: FrameHiddenInputs[]) => void
}

export function useHiddenInputs(
  options: UseHiddenInputsOptions = {}
): UseHiddenInputsReturn {
  const { collapseOnInitialLoad = true } = options

  const [frameInputs, setFrameInputs] = useState<FrameHiddenInputs[]>([])
  const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set())
  const [editingInput, setEditingInput] = useState<EditingInput | null>(null)

  // メモ化: frameInputsが変更された時のみ再計算
  const totalInputs = useMemo(
    () => frameInputs.reduce((sum, frame) => sum + frame.inputs.length, 0),
    [frameInputs]
  )

  const toggleFrame = useCallback((frameId: number) => {
    setExpandedFrames((prev) => {
      const next = new Set(prev)
      if (next.has(frameId)) {
        next.delete(frameId)
      } else {
        next.add(frameId)
      }
      return next
    })
  }, [])

  const handleEdit = useCallback(
    (frameId: number, xpath: string, currentValue: string) => {
      setEditingInput({ frameId, xpath, value: currentValue })
      // 編集時にはフレームを展開
      setExpandedFrames((prev) => new Set(prev).add(frameId))
    },
    []
  )

  const handleEditChange = useCallback((value: string) => {
    setEditingInput((prev) => (prev ? { ...prev, value } : null))
  }, [])

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingInput(null)
  }, [])

  const updateFrameData = useCallback((data: FrameHiddenInputs[]) => {
    const sorted = sortFrameInputs(data)
    setFrameInputs(sorted)
  }, [])

  const handlePortMessage = useCallback(
    (
      message: PortMessage,
      isInitialLoad: boolean
    ): { shouldSetLoading: boolean } => {
      if (message.type === MESSAGE_TYPES.ALL_FRAMES_DATA) {
        const sorted = sortFrameInputs(message.data)
        setFrameInputs(sorted)
        // 初回読み込み時のみすべて閉じる
        if (isInitialLoad && collapseOnInitialLoad) {
          setExpandedFrames(new Set())
        }
        return { shouldSetLoading: true }
      }

      if (message.type === MESSAGE_TYPES.FRAME_DATA) {
        setFrameInputs((prev) => {
          const existing = prev.findIndex(
            (f) => f.frame.frameId === message.frameData.frame.frameId
          )
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = message.frameData
            return updated
          }
          return [...prev, message.frameData]
        })
      }

      return { shouldSetLoading: false }
    },
    [collapseOnInitialLoad]
  )

  return {
    frameInputs,
    expandedFrames,
    editingInput,
    totalInputs,
    toggleFrame,
    handleEdit,
    handleEditChange,
    handleCancel,
    setEditingInput,
    handlePortMessage,
    updateFrameData
  }
}
