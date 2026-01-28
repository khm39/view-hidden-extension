export interface HiddenInputInfo {
  id: string
  name: string
  value: string
  formId: string | null
  formName: string | null
  xpath: string
}

export interface FrameInfo {
  frameId: number
  url: string
  parentFrameId: number
  frameName: string | null
  isSameOrigin: boolean
}

export interface FrameHiddenInputs {
  frame: FrameInfo
  inputs: HiddenInputInfo[]
  timestamp: string
}

export interface HiddenInputsResultMessage {
  type: "HIDDEN_INPUTS_RESULT"
  frameId: number
  url: string
  frameName: string | null
  inputs: HiddenInputInfo[]
}

export interface HiddenInputsUpdateMessage {
  type: "HIDDEN_INPUTS_UPDATE"
  frameId: number
  url: string
  frameName: string | null
  inputs: HiddenInputInfo[]
}

export interface UpdateInputValueMessage {
  type: "UPDATE_INPUT_VALUE"
  frameId: number
  xpath: string
  value: string
}

// Discriminated union for port messages - stricter type safety
export type PortMessage =
  | { type: "ALL_FRAMES_DATA"; data: FrameHiddenInputs[] }
  | { type: "FRAME_DATA"; frameData: FrameHiddenInputs }
  | { type: "UPDATE_RESULT"; success: boolean; error?: string }

export interface TogglePinMessage {
  type: "TOGGLE_PIN"
  tabId: number
  pinned: boolean
}

export interface PinStateMessage {
  type: "PIN_STATE"
  pinned: boolean
  data?: FrameHiddenInputs[]
}

export interface CheckPinStateMessage {
  type: "CHECK_PIN_STATE"
}
