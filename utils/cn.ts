/**
 * クラス名結合ユーティリティ
 * Tailwind CSSのクラス名を安全に結合する
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}
