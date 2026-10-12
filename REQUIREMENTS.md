# Workout Logger 要件定義書（v1.3）

本書は、iPhoneブラウザ（Safari等、PWA対応）での利用に特化した筋トレ・有酸素記録Webアプリケーション「**Workout Logger**」の要件定義書です。  
ユーザーのフィードバックに基づき、**不要な機能（種別、経過時間、総ボリューム）を徹底的に削ぎ落とし**、**有酸素運動記録（カロリー自動計算）**、**上のSetからの完全コピー（重量・回数・完了フラグ）**、**身長・体重設定（Appleヘルスケアからの体重取得）**を追加した最新仕様です。

---

## 1. プロジェクト概要

### 1.1 アプリ名
**Workout Logger**

### 1.2 目的・コンセプト
- **利用環境**: **iPhoneブラウザをメインターゲットとしたWebアプリケーション**（PWA対応）。
- **徹底したミニマリズム**:
  - タイマーや総ボリューム計算、セット種別（ウォームアップ等）の管理を排除し、**「何を・何kgで・何回挙げたか」「有酸素をどれだけやったか」**の記録に純化。
  - ジムのインターバル中に片手で迷わず記録できる操作性を最優先。
- **データ・システム構成（パターンA）**:
  - **フロントエンド**: Vite + React + TypeScript + Tailwind CSS (PWA)。完全無料、オフラインファースト。
  - **バックエンド / DB**: Googleスプレッドシート ＋ GAS。PCから直感的に閲覧・編集可能。
  - **Appleヘルスケア連携**: iOSショートカット経由で「体重取得」および「ワークアウト書き込み」に対応。

---

## 2. 機能要件一覧

### 2.1 筋力トレーニング記録（Strength Logging）
- [ ] **F-101 セッション管理**:
  - ワークアウトの開始・完了。
  - 日付跨ぎ（深夜トレ）対応。
- [ ] **F-102 種目・セット入力（ミニマル仕様）**:
  - 各セットの入力項目: **重量 (kg) / 回数 (reps) / 完了フラグ (チェックボックス)** のみ。
  - ※「種別（通常/W/D/F）」は排除し、余計な選択肢を無くしてシンプル化。
  - 自重トレーニング対応（加重・自重）。
- [ ] **F-103 片手高速入力 & Setコピー機能（強化）**:
  - **前回の記録のフロート表示**: テーブル内にPrevious列を置かず、種目横の「履歴(🕒)」ボタンで前回の全セット実績をフロート表示。
  - **上のSetからの完全コピーボタン**:
    - **`上のSetをコピー (重量・回数・完了)`**: 上のセットの「重量」「回数」「完了チェック」をすべてワンタップで次のセットへ反映。
    - **`重量のみコピー`** / **`回数のみコピー`**: 必要に応じて一部のみコピーも可能。
  - 専用大型テンキー ＋ クイック増減ボタン（`+1.25kg`, `+2.5kg`, `+5kg`, `+1rep`）。
  - 1RM自動計算表示（参考値としてテンキー上部に表示）。

> **※除外された機能**:
> - ~~セット種別機能（Normal/Warmup/Drop/Failure）~~: 完全削除。
> - ~~経過時間の計測機能（タイマー）~~: 完全削除。
> - ~~総ボリューム機能（総重量計算・表示）~~: 完全削除。
> - ~~インターバルタイマー~~: 削除済み。
> - ~~体組成記録（アプリ単体での記録）~~: 体重・身長は設定に集約。
> - ~~プレート計算機 / SNSシェア~~: 削除済み。

---

### 2.2 有酸素運動記録（Cardio Logging）★新規追加
- [ ] **F-201 有酸素運動の記録**:
  - 記録項目:
    - **種別**: ランニング、サイクリング、ウォーキング（初期プリセット ＋ 自由追加可能）
    - **距離**: km
    - **時間**: 分
    - **終了日時**: 日時（デフォルトは現在日時）
    - **消費カロリー**: **自動計算（kcal）**
- [ ] **F-202 消費カロリー自動計算ロジック**:
  - 設定されている「体重 (kg)」「身長 (cm)」と、実施した種別（METs値）、時間、距離（速度）をもとに、科学的根拠（厚生労働省「健康づくりのための身体活動基準」等のMETs換算式）に基づきリアルタイム自動計算。
  - 計算式: $\text{消費カロリー (kcal)} = 1.05 \times \text{METs} \times \text{体重(kg)} \times \left(\frac{\text{時間(分)}}{60}\right)$
  - 種別ごとの基準METs（速度連動）:
    - ウォーキング: 3.5〜4.5 METs
    - ランニング: 7.0〜11.0 METs（時速に応じた動的補正）
    - サイクリング: 6.0〜8.5 METs
- [ ] **F-203 有酸素種別のマスタ管理（追加可能）**:
  - ユーザーが独自の有酸素種別（例: 水泳、ステアマスター、エリプティカル、ローイングなど）を自由に追加・編集可能。

---

### 2.3 トレーニングメニュー・曜日別スケジュール（Routines）
- [ ] **F-301 曜日別デフォルトメニュー設定**:
  - 月〜日曜の各曜日にデフォルトメニュー（例: 月曜=Push A、水曜=Pull A、金曜=Legs、他=オフ）を割り当て。
- [ ] **F-302 メニューテンプレート管理**:
  - メニューの作成・編集（種目リスト、目標セット数・レップ数）。
- [ ] **F-303 今日のメニュー自動サジェスト**:
  - 当日の曜日のメニューをホーム画面最上部に表示、1タップで開始。

---

### 2.4 設定 & Appleヘルスケア連携（Settings & HealthKit）★強化
- [ ] **F-401 身長・体重の設定**:
  - 設定画面で「身長 (cm)」および「体重 (kg)」を手動入力・保存。有酸素のカロリー計算に活用。
- [ ] **F-402 Appleヘルスケアからの体重取得**:
  - 「**ヘルスケアから最新体重を取得**」ボタンを設置。
  - iOSショートカット（`GetWeightFromHealth`）をキックし、ヘルスケアから最新の体重を自動取得してWorkout Loggerに反映。
- [ ] **F-403 Appleヘルスケアへのワークアウト書き込み**:
  - 筋トレ・有酸素の終了時、iOSショートカット経由でヘルスケアへアクティビティを自動記録。
- [ ] **F-404 Googleスプレッドシート（GAS）設定**:
  - GAS Web App URL の設定、最新マスタの手動同期。

---

## 3. Googleスプレッドシート設計（更新版）

| シート名 | カラム構成 | 説明 |
| :--- | :--- | :--- |
| **`schedule`** | `day_of_week`, `day_name`, `menu_id` | 曜日別メニュー割当 |
| **`menus`** | `menu_id`, `menu_name`, `target_parts`, `sort_order` | メニューマスタ |
| **`menu_exercises`** | `menu_id`, `exercise_id`, `order_index`, `target_sets`, `target_reps` | メニュー構成種目 |
| **`exercises`** | `exercise_id`, `body_part`, `exercise_name`, `equipment`, `note` | 筋トレ種目マスタ |
| **`workouts`** | `session_id`, `started_at`, `ended_at`, `menu_name`, `note` | ワークアウトセッション履歴（時間・ボリューム項目を排除） |
| **`sets`** | `session_id`, `exercise_name`, `set_number`, `weight_kg`, `reps`, `is_completed`, `completed_at` | セット詳細（種別を排除し、完了フラグを追加） |
| **`cardio_types`** | `type_id`, `name`, `default_mets` | 有酸素種別マスタ（ランニング等） |
| **`cardio_logs`** | `log_id`, `cardio_type_name`, `distance_km`, `duration_min`, `calories_kcal`, `ended_at` | 有酸素運動履歴 |

---

## 4. データモデル設計（ER図）

```mermaid
erDiagram
    WEEKDAY_SCHEDULE ||--o| ROUTINE_MENU : assigns
    ROUTINE_MENU ||--o{ ROUTINE_EXERCISE : contains
    EXERCISE ||--o{ ROUTINE_EXERCISE : includes
    
    BODY_PART ||--o{ EXERCISE : categorizes
    EXERCISE ||--o{ WORKOUT_EXERCISE : references
    
    WORKOUT_SESSION ||--o{ WORKOUT_EXERCISE : logs
    WORKOUT_EXERCISE ||--o{ WORKOUT_SET : records
    
    CARDIO_TYPE ||--o{ CARDIO_LOG : classifies

    WORKOUT_SET {
        string id PK
        int set_number
        float weight "重量 (kg)"
        int reps "回数"
        boolean is_completed "完了フラグ"
    }

    CARDIO_TYPE {
        string id PK
        string name "ランニング, サイクリング 等"
        float default_mets "基準METs"
    }

    CARDIO_LOG {
        string id PK
        string cardio_type_id FK
        float distance_km "距離 (km)"
        float duration_minutes "時間 (分)"
        datetime ended_at "終了日時"
        float calories "消費カロリー (kcal, 自動計算)"
    }

    USER_PROFILE {
        float height_cm "身長 (cm)"
        float weight_kg "体重 (kg)"
        datetime weight_updated_at "体重取得日時"
    }
```
