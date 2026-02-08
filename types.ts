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

// tabId付きメッセージ型
export interface UpdateInputValueMessageWithTab extends UpdateInputValueMessage {
  tabId: number
}

export interface UnpinOverlayMessage {
  type: "UNPIN_OVERLAY"
}

export interface GetHiddenInputsMessage {
  type: "GET_HIDDEN_INPUTS"
}

export interface SubscribeUpdatesMessage {
  type: "SUBSCRIBE_UPDATES"
  tabId: number
}

// Background script が受け取るメッセージの統合型
export type BackgroundMessage =
  | HiddenInputsUpdateMessage
  | TogglePinMessage
  | UnpinOverlayMessage
  | CheckPinStateMessage
  | UpdateInputValueMessage
  | UpdateInputValueMessageWithTab

// Content script が受け取るメッセージの統合型
export type ContentScriptMessage =
  | GetHiddenInputsMessage
  | UpdateInputValueMessage
  | PinStateMessage

// Port経由で受け取るメッセージの統合型
export type PopupPortMessage =
  | SubscribeUpdatesMessage
  | UpdateInputValueMessageWithTab

// 型ガード関数
export function isHiddenInputsResultMessage(
  response: unknown
): response is HiddenInputsResultMessage {
  return (
    typeof response === "object" &&
    response !== null &&
    "type" in response &&
    (response as { type: string }).type === "HIDDEN_INPUTS_RESULT"
  )
}

export function isPortMessage(message: unknown): message is PortMessage {
  if (typeof message !== "object" || message === null) return false
  const msg = message as { type?: string }
  return (
    msg.type === "ALL_FRAMES_DATA" ||
    msg.type === "FRAME_DATA" ||
    msg.type === "UPDATE_RESULT"
  )
}
