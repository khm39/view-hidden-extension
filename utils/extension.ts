/**
 * Chrome拡張機能のコンテキスト検証ユーティリティ
 */

/**
 * 拡張機能の実行コンテキストが有効かどうかを確認
 * 拡張機能がリロードされた場合、コンテキストは無効になる
 */
export function isExtensionContextValid(): boolean {
  return !!chrome.runtime?.id
}

/**
 * 有効なコンテキストでのみ関数を実行
 * コンテキストが無効な場合は何もしない
 */
export function withValidContext<T>(fn: () => T): T | undefined {
  if (!isExtensionContextValid()) return undefined
  return fn()
}

/**
 * 有効なコンテキストでのみPromiseを実行
 * コンテキストが無効な場合は即座にresolve
 */
export async function withValidContextAsync<T>(
  fn: () => Promise<T>
): Promise<T | undefined> {
  if (!isExtensionContextValid()) return undefined
  return fn()
}
