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

export interface PortMessage {
  type: "FRAME_DATA" | "ALL_FRAMES_DATA" | "UPDATE_RESULT"
  data?: FrameHiddenInputs[]
  frameData?: FrameHiddenInputs
  success?: boolean
  error?: string
}
