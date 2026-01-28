# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## 言語

すべてのやり取りは日本語で行うこと。

## プロジェクト概要

Webページの `<input type="hidden">` フィールドを閲覧・編集できるChrome拡張機能。**Plasmo** (v0.90.5)、React 18、TypeScript、Tailwind CSS v4を使用。

## コマンド

```bash
pnpm dev      # 開発サーバー起動（ホットリロード対応）
pnpm build    # 本番ビルド作成（build/chrome-mv3-prodに出力）
pnpm package  # 拡張機能をzipにパッケージ化
```

開発中にChromeで拡張機能を読み込む手順：
1. `pnpm dev` を実行
2. `chrome://extensions` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、`build/chrome-mv3-dev` を選択

## アーキテクチャ

**Plasmoのファイルベース規約** - プロジェクトルートのファイルが自動的に拡張機能のエントリーポイントになる：
- `popup.tsx` - 拡張機能のポップアップUI（Reactコンポーネント）
- `options.tsx` - オプションページ（このファイルを追加して作成）
- `content.ts` - コンテンツスクリプト（ページに注入するコード）
- `background.ts` - バックグラウンドサービスワーカー

**マニフェスト設定** は `package.json` の `manifest` キーで定義。現在、すべてのHTTPSサイトに対する `host_permissions` が設定済み。

**パスエイリアス**: `~` プレフィックスでプロジェクトルートからインポート可能（例：`import { foo } from "~utils/foo"`）

**Tailwind CSS**: `style.css` に定義。コンポーネントで `import "./style.css"` してユーティリティクラスを使用。

## コードスタイル

Prettierの設定：
- セミコロンなし
- ダブルクォート
- 末尾カンマなし
- インポート自動ソート（Plasmoパッケージは別グループ）

フォーマット実行: `npx prettier --write .`
