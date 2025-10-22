# Notion Gallery Slider Widget

Notion データベースを指定して、ギャラリーを横スライダーで埋め込める軽量ウィジェットです。Express + Notion SDK を用いて API からページ一覧を取得し、シンプルなフロントで表示します。

## セットアップ

1) 依存関係のインストール

```bash
npm install
```

2) 環境変数の設定（`.env` をプロジェクト直下に作成）

```bash
NOTION_TOKEN=secret_xxx
PORT=3000
CACHE_TTL_MS=300000
```

- NOTION_TOKEN: Notion の Internal Integration Token（対象データベースを統合に「共有」してください）
- PORT: サーバーポート（省略可、デフォルト 3000）
- CACHE_TTL_MS: メモリキャッシュ TTL（ms、省略可、デフォルト 300000）

3) 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセスします。

## 使い方（API）

- エンドポイント: `GET /api/gallery`
- クエリ:
  - `databaseId` (必須) Notion データベース ID
  - `limit` 表示件数 (1-100, 既定: 10)
  - `subtitleProp` サブタイトルに使うプロパティ名（rich_text, select 等）
  - `urlProp` リンク先に使う URL プロパティ名（任意）
  - `coverProp` カバー画像に使う `files` プロパティ名（任意）
  - `filter` Notion API の filter オブジェクト（JSON 文字列）
  - `sorts` Notion API の sorts オブジェクト（JSON 文字列）
  - `ttlMs` このリクエスト結果のキャッシュ TTL を上書き（ms）

レスポンス例:

```json
{
  "items": [
    { "id": "...", "title": "Title", "subtitle": "", "url": "...", "coverUrl": "..." }
  ],
  "count": 1
}
```

## 使い方（埋め込み）

デモページ `GET /` からフォームでも試せます。直接埋め込む場合は以下のように iframe を利用します。

```html
<iframe
  src="https://your-host.example.com/?databaseId=YOUR_DB_ID&limit=12&subtitleProp=Description"
  style="width:100%;height:380px;border:0;overflow:hidden"
  loading="lazy"
  referrerpolicy="no-referrer"
></iframe>
```

- ページの URL クエリに指定したパラメータ（例: `subtitleProp`, `filter` など）は API へそのまま引き継がれます。
- 高度なフィルタ・ソートが必要な場合は `filter` / `sorts` を JSON 文字列で追加してください（URL エンコード必要）。

## セキュリティと運用の注意

- トークンはサーバー側の環境変数にのみ保存し、クライアントへ露出させないでください。
- このウィジェットはメモリキャッシュを持ちます。レプリカ間でキャッシュ共有は行いません。
- Notion API のレート制限を考慮し、TTL を適切に設定してください。

## ライセンス

MIT
