import type { FrameHiddenInputs } from "~types"

/**
 * Sort frame inputs: frames with inputs first, then main frame first
 */
export function sortFrameInputs(
  data: FrameHiddenInputs[]
): FrameHiddenInputs[] {
  return [...data].sort((a, b) => {
    const aHasInputs = a.inputs.length > 0 ? 0 : 1
    const bHasInputs = b.inputs.length > 0 ? 0 : 1
    if (aHasInputs !== bHasInputs) {
      return aHasInputs - bHasInputs
    }
    // Within same group, main frame first
    if (a.frame.frameId === 0) return -1
    if (b.frame.frameId === 0) return 1
    return a.frame.frameId - b.frame.frameId
  })
}
