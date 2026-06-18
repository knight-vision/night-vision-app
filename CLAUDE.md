# CLAUDE.md — NIGHT VISION (iOSアプリ)

このファイルは Claude Code がこのプロジェクトで作業する際の指針です。**毎セッション開始時に必ずこのファイルを読み込み、内容を遵守してください**。

---

## 0. プロジェクト概要

**NIGHT VISION** は、ナイトライフ業界（バー・ラウンジ・キャバクラ・スナック等）の店舗オーナーとキャストスタッフ向けの B2B SaaS プラットフォーム。

- **このリポジトリ**: `knight-vision/night-vision-app` — React Native (Expo) iOS アプリ
- **連携リポジトリ**: `knight-vision/night-vision` — Next.js Web アプリ（公開店舗情報・管理画面・API）
- **運営会社**: bit garden k.k.（北海道釧路発）
- **ドメイン**: night-vision.jp
- **App Store**: 公開済み（v1.2.0）、Apple ID `6772972448`、Bundle ID `app.nightvision`

### プロダクトのコア価値
- **オーナー向け**: 伝票入力・売上分析・キャスト人件費管理・シフト承認・店舗ページ管理
- **キャスト向け**: 自分のシフト確認/希望提出・給与/実績閲覧・顧客管理（メモ・お気に入り）

### ロール
- **オーナー（owner）**: 店舗管理者。`shop_owners` テーブルに紐付く（id は数値型）
- **キャスト（cast）**: 在籍スタッフ。`cast_accounts` テーブルに紐付く（id は UUID 型 ⚠️）

---

## 1. 技術スタック

### モバイル（このリポジトリ）
- **React Native** 0.81 / **Expo SDK 55**
- **TypeScript**
- **expo-router** (file-based routing)
- **Zustand** + **AsyncStorage**（状態管理 & 永続化）
- **expo-glass-effect**（iOS 26 Liquid Glass）
- **expo-haptics**（触覚フィードバック）
- **@react-native-community/datetimepicker**（ネイティブ日付ピッカー）
- **expo-notifications**（プッシュ通知）

### バックエンド（連携リポジトリ）
- **Next.js 14.1.0** / **Vercel** / **Supabase**（PostgreSQL + Auth）
- **Resend**（メール）
- **Stripe**（決済）

### API ベース
- 本番: `https://www.night-vision.jp/api`
- 認証: トークンレス。`owner_id` / `cast_id` / `shop_id` を localStorage / AsyncStorage に保存し、API 側で `shop_owners` `cast_accounts` テーブルと照合（`verifyOwner()` 等）

---

## 2. ディレクトリ構成

```
app/
  _layout.tsx              # ルートレイアウト・テーマ初期化
  index.tsx                # ログイン画面 + ForgotPasswordModal + LoginModal
  (tabs)/
    _layout.tsx            # タブナビ。role==null時はLoginContentを描画
    index.tsx              # ホーム（OwnerHome / CastHome + WeeklyShiftTable）
    shift.tsx              # シフト管理・希望提出
    slip.tsx               # 伝票入力（オーナーのみ）
    manage.tsx             # キャスト管理 + CustomerSection（exportされている）
    shopmanage.tsx         # 店舗情報・求人管理（オーナーのみ）
    customers.tsx          # 顧客管理（キャスト専用タブ）
    results.tsx            # 給与・実績（キャスト専用）
    account.tsx            # アカウント設定
    salary.tsx, jobs.tsx   # 隠しページ
components/
  GlassCard.tsx            # iOS 26ガラスエフェクト or fallback
  SectionCard.tsx          # ホーム画面のセクションカード
  StatCard.tsx             # 数値表示カード（ガラス対応）
  MonthCalendar.tsx        # 月カレンダー（祝日・スワイプ対応）
  PunyTouchable.tsx        # ぷにぷにアニメ + ハプティクス
  ShiftRow.tsx
constants/
  theme.ts                 # Colors / THEMES（neon=default） / useColors()
  api.ts                   # API_BASE
store/
  auth.ts                  # role/userId/shopId/castId/shopSlug をpersist
  theme.ts                 # themeId（neon固定）
lib/
  notifications.ts         # Expo Push設定
```

---

## 3. 重要な技術ルール（必ず守る）

### 3.1. 型と ID
- `cast_accounts.id` は **UUID**。`Number()` 変換すると NaN になり、プッシュトークン保存等が無音で失敗する。**必ず `String()` を使う**
- `shop_owners.id` は **数値型**
- 比較する時は両方を `String(x) === String(y)` で揃える

### 3.2. 認証
- トークンレス。API エンドポイントは必ずサーバー側で `shop_owners` テーブル等との照合認証 (`verifyOwner()`) を行う
- 書き込み系（POST/PATCH/DELETE）は必ず認証付き、GET はキャッシュ可

### 3.3. Supabase time 型
- `time` 型は **0〜23時のみ受け付け**。25:00 などは内部で 01:00 に正規化が必要（API・アプリ両層で対応）
- 表示時は「翌1時」など 24時超表記に戻す（UI 仕様）

### 3.4. RLS
- クライアントサイドの anon キーで Supabase を直接操作すると RLS 違反になる
- 店舗写真・伝票・キャスト操作はすべて **service-role API エンドポイント経由**

### 3.5. キャッシュとデータ取得
- 週ナビゲーション・月ナビゲーションで**ページ全体がリロードしない**こと
- 「初回のみ loading=true」「月切替時はバックグラウンドフェッチ」の二段構え（`shiftCache` / `monthCache` パターン）
- `useFocusEffect` でフォーカス時の再フェッチを実装する

### 3.6. テーマ
- **neon テーマ固定**。`#ff88cc`（ピンク）と `#aa88ff`（パープル）が主要アクセント
- オーナー = パープル、キャスト = ゴールド（ピンク）
- 背景: `#0c0c1a`
- `useColors()` フックで取得（コンポーネント先頭で `const Colors = useColors();`）
- **StyleSheet.create 内で Colors を参照すると初期化前にクラッシュ**。StyleSheet 内は静的 hex 値のみ。動的色はインラインスタイルで上書き

### 3.7. UIコンポーネント
- タップ可能要素は原則 `PunyTouchable` を使う（ぷにぷにアニメ + ハプティクス）。`Pressable`/`TouchableOpacity` を直接使うのは禁止
- カード類は可能な限り `GlassCard` または `SectionCard`（GlassView ベース）を使う
- 日付選択は `DateTimePicker` の compact モード（iOS ネイティブ）

### 3.8. ファイル操作
- `str_replace` は絶対パス必須
- 大きな置換は Python3 インラインスクリプト（`python3 - << 'PYEOF'`）が安定
- 正規表現による文字列置換は **import 文や色値を壊しやすい**。リテラル置換を優先

---

## 4. 開発フロー

### 4.1. セッション開始時
1. **このファイル（CLAUDE.md）を読む**
2. `git status` でクリーンか確認、`git pull --rebase` で最新化
3. 連携リポジトリも作業が必要そうなら `~/dev/night-vision/` をチェック

### 4.2. 機能追加・修正時の手順
1. **設計を明示**: 変更ファイル、影響範囲、DB スキーマ変更の有無を最初にユーザーに提示
2. **DBスキーマ変更がある場合**: SQL を提示し、ユーザーが Supabase Studio で実行する指示を出す（自動実行しない）
3. **Web API が必要な場合**: `~/dev/night-vision/app/api/...` に追加し、別途コミット・プッシュ
4. **コード変更**: 該当ファイルを編集
5. **検証**: 必ず以下を実行
   - `npx tsc --noEmit 2>&1 | grep -E "error" | head -20` で型エラーチェック
   - `next build` 等の本格ビルドは時間がかかるので原則スキップ
6. **コミット**: 適切な粒度で日本語コミットメッセージ。`feat:` / `fix:` / `chore:` プレフィックス
7. **プッシュ**: `git push`（必要なら `git pull --rebase` 先行）

### 4.3. コミット前チェックリスト
- [ ] TypeScript エラーゼロ
- [ ] `import` 文が壊れていない（特に正規表現置換後）
- [ ] StyleSheet.create 内に `Colors.xxx` 参照がない
- [ ] `useColors()` が必要なコンポーネント全てで呼ばれている
- [ ] `padStart(2, '0')` が `padStart(2, '')` になっていない
- [ ] 文字列リテラル末尾に余分な文字が残っていない (`'#ff88cc'Dim` のような残骸)
- [ ] `</TouchableOpacity>` と `</PunyTouchable>` の混在がない

### 4.4. ビルド検証（Web 側）
```bash
# next build の前に必ずダミー .env.local を作成
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy
SUPABASE_SERVICE_ROLE_KEY=dummy
RESEND_API_KEY=dummy
STRIPE_SECRET_KEY=dummy
EOF
npx next build 2>&1 | grep -E "Compiled successfully|Type error|Failed to compile" | head -20
rm .env.local
```

### 4.5. 動作確認（モバイル）
- ローカルで `npx expo start` 実行を**ユーザーに依頼**（Claude Code は実機/シミュレーターを操作できない）
- バグ報告には**画面スクリーンショット + エラーログ**を必ず求める

---

## 5. データモデル要点

### shops
`id`(数値), `slug`(URL用), `name`, `area`, `is_active`(非公開), `system_charge`, ...

### shop_owners
`id`(数値), `email`(unique), `password_hash`(bcrypt), `shop_id`, `push_token`, `push_platform`

### casts
`id`(数値), `shop_id`, `name`, `hourly_wage`

### cast_accounts
`id`(**UUID**), `cast_id`(数値), `email`(unique), `password_hash`, `push_token`, `push_platform`

### slips
売上伝票。`slip_id`(UUID), `shop_id`, `visit_date`, `payment`(現金/カード), `total_amount`

### cast_entries
伝票内のキャスト情報。`slip_id`, `cast_id`, `type`(指名/フリー/同伴)

### confirmed_shifts
確定シフト。`shop_id`, `cast_id`, `date`, `start_time`, `end_time` (time型)

### cast_shift_requests
キャストの希望。`cast_id`, `shop_id`, `date`, `start_time`, `end_time`, `status`(pending/approved/rejected)

### customers (顧客管理)
`id`(UUID), `shop_id`, `cast_id`, `name`, `nickname`, `birthday`, `memo`,
`is_favorite`, `favorite_drink`, `occupation`, `referral_source`, `ng_topics`,
`vip_rank`('normal'/'silver'/'gold'/'platinum'), `budget`, `tags`(TEXT[]),
`visit_date`, `last_visited`, `created_at`, `updated_at`

### cast_daily_allowances
日次手当。`amount` は直接正負（`sign` フィールドなし）

---

## 6. テスト・動作確認

### 6.1. 必須セルフチェック
コード変更後、必ず以下を実行：
```bash
# TypeScriptチェック
cd ~/dev/night-vision-app
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -30

# 壊れやすいパターンのスキャン
grep -rn "'%'" app/ components/                              # '100%' が '%' になっていないか
grep -rn "padStart(2, '')" app/ components/                  # padStart の引数欠落
grep -rn "<TouchableOpacity\|</TouchableOpacity>" app/       # 旧 TouchableOpacity 残存
grep -rn "fontWeight: ''" app/                               # フォントウェイト空文字
```

### 6.2. 致命的バグの予防策
過去発生したバグ：
1. `Colors.purpleDim` → `'#aa88ff'Dim` のような文字列残骸（正規表現置換のミス）
2. `padStart(2, '0')` → `padStart(2, '')` で NaN 日付
3. `'100%'` → `'%'` でレイアウト崩壊
4. `useColors()` を `StyleSheet.create` 内で参照しクラッシュ
5. `</TouchableOpacity>` を `</PunyTouchable>` に変えずタグ不一致
6. import 文を正規表現置換で破壊（`react-native` → `-native`）

**正規表現による一括置換は import 文を絶対に対象外にする**こと。

### 6.3. 動作確認の依頼方法
ユーザーに以下を依頼：
```
git pull
npm install     # 新規パッケージ追加時のみ
npx expo prebuild --platform ios --clean   # ネイティブモジュール追加時のみ
npx expo start
```

---

## 7. コミュニケーション規約

### 言語・トーン
- **コミットメッセージ・コードコメントは日本語**
- ユーザー（光平）への返答も日本語、簡潔に
- 散文での確認の方が選択肢提示より効果的なことが多い

### 確認のタイミング
- 大きなUI変更前: **HTML モックアップで先に確認**
- 実装方向が確定したら逐一確認せず一気に進める
- 不要・冗長と判断された機能はすぐ削除・統合する

### NG
- 「やってよろしいですか」を連発しない
- やる前に「これからXXXします」と長文で予告しない（実行→事後報告）
- DBスキーマ変更を勝手にしない（必ずSQLを提示してユーザーに実行依頼）

---

## 8. リリース手順

### バージョン管理
- `app.json` の `version` と `ios.buildNumber` を更新
- セマンティックバージョン：機能追加→minor、バグ修正→patch

### App Store提出
```bash
./build.sh   # prebuild + archive、Xcode Organizer起動
```
1. Organizer で対象ビルド選択
2. Distribute App → App Store Connect → Upload
3. App Store Connect でリリースノート記載・ビルド選択・提出

### 既知のリリース情報
- Bundle ID: `app.nightvision`
- Apple Team ID: `HCF97943N8`
- App Store Connect App ID: `6772972448`
- EAS Project ID: `ef432d11-9794-4de8-ad5b-095cac6076aa`

---

## 9. デモアカウント

開発・審査用：
- **オーナー**: `demo01@night-vision.jp` / `nightvision-demo`
- **キャスト**: `demo-cast@night-vision.jp` / `nightvision-demo`

テスト環境：
- shop_id=97 (ラウンジ光)
- cast_id=21 (ひかり)、cast_id=22 (なな)

---

## 10. 連絡先

- Git: `user.email = dev@night-vision.jp` / `user.name = Night Vision Dev`
- 運営: 川倉光平 / +81 90-2819-3128 / info@night-vision.jp

---

## 付録：頻出スニペット

### 月ごとキャッシュパターン
```tsx
const [shiftCache, setShiftCache] = useState<Record<string, any[]>>({});
const cacheKey = `${y}-${m}`;
const allConfirmed = shiftCache[cacheKey] ?? [];

useEffect(() => {  // 初回のみ
  if (!shopId) return;
  setLoading(true);
  // ...初回フェッチ
}, [shopId]);

useEffect(() => {  // 月切替時、loadingなし
  if (!shopId || shiftCache[cacheKey] !== undefined) return;
  fetch(/* ... */).then((/* update */));
}, [shopId, cacheKey]);
```

### 認証エンドポイント（Web側）
```ts
const verified = await verifyOwner(req);
if (!verified.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
const shopId = verified.shopId;
```

### 時間正規化
```ts
function normalizeTime(t: string): string {
  // "25:00" -> "01:00"
  const [h, m] = t.split(':').map(Number);
  return String(h % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
```
