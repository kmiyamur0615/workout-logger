# Workout Logger

iPhoneブラウザ（PWA対応）に特化した、筋トレ記録Webアプリケーション。  
「筋トレMemo」の細やかな部位管理・テンポ感をベースに、**曜日別メニューの自動サジェスト**、**片手専用テンキー**、**Previousフロート表示**、**上の行からの全コピー・一部コピー**、**Googleスプレッドシート（GAS）連携**、**Appleヘルスケア同期**を搭載しています。

---

## 🛠 技術スタック（パターンA）
- **フロントエンド**: React 18, TypeScript, Tailwind CSS, Lucide React
- **ビルド & PWA**: Vite, `vite-plugin-pwa`（iPhoneでホーム画面追加時に全画面アプリ化）
- **ローカルストレージ**: LocalStorage（オフラインファースト、0ミリ秒爆速レスポンス）
- **バックエンド / データベース**: Google Apps Script (GAS), Google スプレッドシート（完全無料・PCから自由編集）
- **外部連携**: iOS Shortcuts (URL Scheme) 経由での HealthKit 自動登録

---

## 🚀 起動方法

### ローカル開発サーバー起動
```bash
npm install
npm run dev
```
起動後、ブラウザで `http://localhost:3000` を開きます。  
スマホのSafariで同じローカルネットワーク内のIP（例: `http://192.168.x.x:3000`）を開くと、実機iPhoneでも動作確認できます。

### プロダクションビルド
```bash
npm run build
```
`dist/` ディレクトリにPWA対応の静的ファイルが生成されます。GitHub Pages や Vercel 等にそのままデプロイ可能です。

---

## 📱 Googleスプレッドシート ＆ ヘルスケア連携

- **Googleスプレッドシート / GAS セットアップ**: [`gas/README.md`](./gas/README.md) を参照
- **Appleヘルスケア連携ショートカット設定**: [`shortcuts/README.md`](./shortcuts/README.md) を参照
- **要件定義書**: [`REQUIREMENTS.md`](./REQUIREMENTS.md)
