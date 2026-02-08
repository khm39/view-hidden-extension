/**
 * メッセージタイプ定数
 * Chrome Extension のメッセージング用
 */
export const MESSAGE_TYPES = {
  // Content script messages
  GET_HIDDEN_INPUTS: "GET_HIDDEN_INPUTS",
  HIDDEN_INPUTS_RESULT: "HIDDEN_INPUTS_RESULT",
  HIDDEN_INPUTS_UPDATE: "HIDDEN_INPUTS_UPDATE",
  UPDATE_INPUT_VALUE: "UPDATE_INPUT_VALUE",

  // Pin/Overlay messages
  TOGGLE_PIN: "TOGGLE_PIN",
  PIN_STATE: "PIN_STATE",
  CHECK_PIN_STATE: "CHECK_PIN_STATE",
  UNPIN_OVERLAY: "UNPIN_OVERLAY",

  // Port messages
  SUBSCRIBE_UPDATES: "SUBSCRIBE_UPDATES",
  ALL_FRAMES_DATA: "ALL_FRAMES_DATA",
  FRAME_DATA: "FRAME_DATA",
  UPDATE_RESULT: "UPDATE_RESULT"
} as const

/**
 * タイミング定数（ミリ秒）
 */
export const TIMING = {
  /** デバウンス用遅延 */
  DEBOUNCE_MS: 100,
  /** フレーム初期化待機時間 */
  FRAME_INIT_DELAY_MS: 500,
  /** ピン状態チェック遅延 */
  PIN_CHECK_DELAY_MS: 100,
  /** オーバーレイクローズ遅延 */
  OVERLAY_CLOSE_DELAY_MS: 100
} as const

/**
 * UI設定定数
 */
export const UI_CONFIG = {
  /** ポップアップ/オーバーレイの幅 */
  PANEL_WIDTH: "400px",
  /** ポップアップ/オーバーレイの最大高さ */
  PANEL_MAX_HEIGHT: "500px",
  /** オーバーレイのz-index（最大値） */
  OVERLAY_Z_INDEX: "2147483647"
} as const

/**
 * エラーメッセージ定数
 */
export const ERROR_MESSAGES = {
  TAB_NOT_FOUND: "タブが見つかりません",
  PIN_FAILED: "固定表示に失敗しました",
  CONTENT_SCRIPT_NOT_LOADED:
    "ページをリロードしてください。拡張機能のコンテンツスクリプトがまだ読み込まれていません。",
  CONNECTION_LOST: "接続が切断されました"
} as const
