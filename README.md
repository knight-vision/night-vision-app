# NIGHT VISION — 釧路ナイトビジョン

夜の店舗管理アプリ。オーナー・マネージャー・キャスト・バックスタッフ向けのモバイルアプリ。

## Tech Stack

- **React Native** + **Expo SDK 54**
- **Expo Router** v4 (ファイルベースルーティング)
- **EAS Update** — `main` push で即OTA配信
- **EAS Build** — `v*` タグ or 手動実行でバイナリビルド

---

## 開発セットアップ

### 前提条件
- Node.js 20+
- Expo CLIのインストール: `npm install -g expo-cli eas-cli`
- Expo アカウント: https://expo.dev

### インストール
```bash
git clone https://github.com/YOUR_ORG/night-vision.git
cd night-vision
npm install
```

### Expo プロジェクト初期化（初回のみ）
```bash
# Expoにログイン
eas login

# EASプロジェクトを作成してapp.jsonにprojectIdを設定
eas init

# app.json の extra.eas.projectId と updates.url を確認・更新
```

### ローカル起動（Expo Go）
```bash
npx expo start
# → QRコードをスキャンしてExpo Goで確認
```

---

## GitHub Actions 自動化

### Secrets 設定（GitHub → Settings → Secrets）

| Secret | 内容 |
|--------|------|
| `EXPO_TOKEN` | Expo アクセストークン（https://expo.dev/accounts/[user]/settings/access-tokens） |

### 自動実行タイミング

| トリガー | 処理 |
|---------|------|
| `main` へのpush | `eas update` — Expo Go / 既存アプリにOTA自動配信 |
| `v1.0.0` などのタグpush | `eas build` — iOS / Android バイナリビルド（preview） |
| GitHub Actions → 手動実行 | platform/profile を選んでビルド |

### 日常開発フロー
```bash
# コードを変更してpush → 自動でOTAアップデート配信
git add .
git commit -m "feat: シフト画面を更新"
git push origin main
# → 約1分でExpo Go / ビルド済みアプリに反映
```

### リリースビルドフロー
```bash
# バージョンタグをpush → 自動でEAS Buildが走る
git tag v1.0.1
git push origin v1.0.1
# → EAS Build完了後、TestFlight / 内部テストに配布
```

---

## 画面構成

```
app/
├── index.tsx          # ログイン画面
└── (tabs)/
    ├── _layout.tsx    # タブナビゲーション
    ├── index.tsx      # ホーム（ダッシュボード）
    ├── shift.tsx      # シフト管理
    ├── results.tsx    # 成績・給与明細
    └── account.tsx    # アカウント設定
```

## ユーザーロール

| ロール | 権限 |
|--------|------|
| オーナー | 全機能・全データ |
| マネージャー | 店舗管理・シフト承認 |
| キャスト | 自分の成績・シフト提出 |
| バックスタッフ | 自分のシフト・給与 |
