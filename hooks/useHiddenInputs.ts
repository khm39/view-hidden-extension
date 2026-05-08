import { useCallback, useMemo, useState } from "react"

import type { EditingInput } from "~components/types"
import type { DisplayMode, FrameHiddenInputs, PortMessage } from "~types"
import { DISPLAY_MODES, MESSAGE_TYPES } from "~utils/constants"
import { sortFrameInputs } from "~utils/frameSort"

export interface UseHiddenInputsOptions {
  /** 初回読み込み時にすべてのフレームを閉じるかどうか */
  collapseOnInitialLoad?: boolean
  /** 表示モードの初期値 */
  initialDisplayMode?: DisplayMode
}

export interface InputCounts {
  hidden: number
  visible: number
  all: number
}

export interface UseHiddenInputsReturn {
  frameInputs: FrameHiddenInputs[]
  filteredFrameInputs: FrameHiddenInputs[]
  expandedFrames: Set<number>
  editingInput: EditingInput | null
  totalInputs: number
  totalCounts: InputCounts
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
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
  const {
    collapseOnInitialLoad = true,
    initialDisplayMode = DISPLAY_MODES.HIDDEN
  } = options

  const [frameInputs, setFrameInputs] = useState<FrameHiddenInputs[]>([])
  const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set())
  const [editingInput, setEditingInput] = useState<EditingInput | null>(null)
  const [displayMode, setDisplayMode] =
    useState<DisplayMode>(initialDisplayMode)

  // 全件のカウント（モードに依らない）
  const totalCounts = useMemo<InputCounts>(() => {
    let hidden = 0
    let visible = 0
    for (const frame of frameInputs) {
      for (const input of frame.inputs) {
        if (input.isVisuallyHidden) hidden++
        else visible++
      }
    }
    return { hidden, visible, all: hidden + visible }
  }, [frameInputs])

  // 表示モードでフィルタしたフレームデータ
  const filteredFrameInputs = useMemo<FrameHiddenInputs[]>(() => {
    if (displayMode === DISPLAY_MODES.ALL) return frameInputs
    return frameInputs.map((frame) => ({
      ...frame,
      inputs: frame.inputs.filter((input) =>
        displayMode === DISPLAY_MODES.HIDDEN
          ? input.isVisuallyHidden
          : !input.isVisuallyHidden
      )
    }))
  }, [frameInputs, displayMode])

  // メモ化: frameInputsが変更された時のみ再計算
  const totalInputs = useMemo(
    () =>
      filteredFrameInputs.reduce((sum, frame) => sum + frame.inputs.length, 0),
    [filteredFrameInputs]
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
    filteredFrameInputs,
    expandedFrames,
    editingInput,
    totalInputs,
    totalCounts,
    displayMode,
    setDisplayMode,
    toggleFrame,
    handleEdit,
    handleEditChange,
    handleCancel,
    setEditingInput,
    handlePortMessage,
    updateFrameData
  }
}
