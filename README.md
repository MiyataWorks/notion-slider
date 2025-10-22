# 🎨 Notion Gallery Slider Widget

Notionデータベースを美しいスライダー形式のギャラリービューで表示するウィジェットです。

![Notion Gallery Slider](https://img.shields.io/badge/Notion-Gallery_Slider-000000?style=for-the-badge&logo=notion&logoColor=white)

## ✨ 特徴

- 📊 **Notionデータベース連携**: Notion APIを使用してデータベースの内容を動的に表示
- 🎠 **スライダービュー**: 横スクロール可能なモダンなギャラリー表示
- 📱 **レスポンシブデザイン**: デスクトップ、タブレット、モバイルに対応
- 🎨 **美しいUI**: モダンでクリーンなデザイン
- ⌨️ **キーボード操作**: 矢印キーで操作可能
- 👆 **タッチ対応**: スワイプジェスチャーに対応
- 💾 **設定の保存**: ローカルストレージに設定を保存

## 🚀 クイックスタート

### 1. Notion Integrationの作成

1. [Notion Integrations](https://www.notion.so/my-integrations)にアクセス
2. 「+ New integration」をクリック
3. Integration名を入力（例：Gallery Slider）
4. 権限を設定：
   - **Read content**: ✅ 有効化
   - **Update content**: 無効化（読み取り専用）
   - **Insert content**: 無効化
5. 「Submit」をクリック
6. **Internal Integration Token**をコピー（`secret_xxxxxxxxxxxxx`の形式）

### 2. データベースの共有設定

1. Notionで対象のデータベースページを開く
2. 右上の「Share」または「共有」ボタンをクリック
3. 「Add connections」または「コネクションを追加」を選択
4. 作成したIntegrationを選択して追加

### 3. Database IDの取得

データベースのURLから取得します：

```
https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyyyyyyyyyyyyyyyyy
                      ↑ これがDatabase ID（32文字）
```

または、データベースページを開いて：
1. 右上の「...」メニューをクリック
2. 「Copy link」でURLをコピー
3. URLから32文字のIDを抽出

### 4. ウィジェットの使用

1. `index.html`をブラウザで開く
2. 設定フォームに以下を入力：
   - **Notion Integration Token**: `secret_xxxxxxxxxxxxx`
   - **Database ID**: データベースの32文字のID
   - **表示アイテム数**: 一度に表示するカードの数（1-6）
3. 「ギャラリーを読み込む」ボタンをクリック

## 📁 ファイル構成

```
notion-slider/
├── index.html      # メインHTMLファイル
├── style.css       # スタイルシート
├── script.js       # JavaScript（ロジック）
└── README.md       # このファイル
```

## 🎯 使い方

### 基本操作

- **矢印ボタン**: 前後のアイテムに移動
- **ページネーションドット**: 特定のページにジャンプ
- **キーボード**: ← → キーで操作
- **タッチ**: スワイプで移動（モバイル）
- **カードクリック**: Notionページを新しいタブで開く

### 設定の変更

1. 右上の「⚙️ 設定」ボタンをクリック
2. 設定を変更
3. 「ギャラリーを読み込む」で再読み込み

## 🎨 カスタマイズ

### 表示されるプロパティ

ウィジェットは以下のNotionプロパティを自動的に検出して表示します：

- **タイトル**: `Name`, `Title`, または最初のtitleプロパティ
- **カバー画像**: データベースアイテムのカバー画像
- **アイコン**: 絵文字または画像アイコン
- **説明**: `rich_text`タイプのプロパティ
- **タグ**: `multi_select`または`select`タイプのプロパティ

### スタイルのカスタマイズ

`style.css`の`:root`セクションでカラーテーマを変更できます：

```css
:root {
    --primary-color: #2563eb;      /* メインカラー */
    --primary-hover: #1d4ed8;      /* ホバーカラー */
    --background: #f8fafc;         /* 背景色 */
    --card-bg: #ffffff;            /* カード背景色 */
    --text-primary: #1e293b;       /* メインテキスト */
    --text-secondary: #64748b;     /* サブテキスト */
}
```

## 🔧 技術仕様

### 使用技術

- **HTML5**: セマンティックマークアップ
- **CSS3**: Flexbox、CSS Grid、カスタムプロパティ、アニメーション
- **JavaScript (Vanilla)**: ES6+、Fetch API、LocalStorage API

### ブラウザ対応

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+
- モダンモバイルブラウザ

### Notion API

- **バージョン**: 2022-06-28
- **エンドポイント**: `/v1/databases/{database_id}/query`
- **最大取得数**: 100アイテム

## 📱 レスポンシブ対応

| デバイス | 表示 |
|---------|------|
| デスクトップ (>1024px) | 設定した数のカードを表示 |
| タブレット (768-1024px) | 2-3カードを表示 |
| モバイル (<768px) | 1カードを表示、スワイプ操作 |

## 🔒 セキュリティ

- **Integration Token**はローカルストレージに保存されます
- すべての通信はHTTPS経由
- トークンは読み取り専用権限で使用することを推奨
- 本番環境では、トークンをサーバーサイドで管理することを推奨

## ⚠️ 注意事項

1. **Integration Token**は秘密情報です。他者と共有しないでください
2. 公開サーバーにデプロイする場合、トークンをハードコードしないでください
3. Notion APIには[レート制限](https://developers.notion.com/reference/request-limits)があります
4. 100アイテムを超えるデータベースの場合、ページネーションは実装されていません

## 🐛 トラブルシューティング

### エラー: "Unauthorized"
- Integration Tokenが正しいか確認
- データベースにIntegrationが追加されているか確認

### エラー: "Object not found"
- Database IDが正しいか確認
- データベースのURLから正しくIDを抽出しているか確認

### カードが表示されない
- データベースにアイテムが存在するか確認
- ブラウザのコンソールでエラーを確認

### 画像が表示されない
- Notionのカバー画像が設定されているか確認
- 画像URLが有効か確認（Notion画像URLは一時的な場合があります）

## 📄 ライセンス

MIT License - 自由に使用、修正、配布できます。

## 🤝 貢献

バグ報告や機能要望は、GitHubのIssuesでお願いします。

## 🔗 関連リンク

- [Notion API Documentation](https://developers.notion.com/)
- [Notion API Reference](https://developers.notion.com/reference/intro)
- [Notion Community](https://www.notion.so/community)

---

**Enjoy your beautiful Notion Gallery Slider! 🎉**
