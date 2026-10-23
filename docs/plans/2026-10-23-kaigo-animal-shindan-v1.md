# 介護どうぶつ診断（仮） v1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 40問に答えると動物キャラでリーダータイプと半年の成長ステップがわかる静的 Web アプリを作り、GitHub Pages に載せてスマホで使える状態にする。

**Architecture:** Vite ＋ TypeScript（フレームワークなし）の1ページアプリ。判定（`scoring.ts`）と保存（`storage.ts`）は DOM に触れない純粋なモジュールにし、画面（`screens/*.ts`）は `dom.ts` の小さな要素生成ヘルパーで `textContent` だけを使って組み立てる。文章・質問は `data/*.json` をビルド時に import する。

**Tech Stack:** Vite（8.0.16 以上）, TypeScript, Vitest ＋ jsdom, pnpm, subset-font（書体のサブセット化）, GitHub Actions ＋ GitHub Pages, Codex CLI（イラスト生成）, Python ＋ Pillow（画像の背景抜き）

**Spec:** `docs/02_requirements.md`（確認用 `html/02_requirements.html`）

## Global Constraints

- 静的サイトのみ。サーバー側のコード（PHP など）を持たない
- 回答・結果は `localStorage` だけに保存し、外部に送らない。アクセス解析・広告・外部フォント・外部スクリプトを入れない
- Vite は **8.0.16 以上**（CVE-2026-53571 修正版）。開発サーバーを `--host` でネットワークに出さない
- pnpm：`minimumReleaseAge` 1440（24時間）、インストール時スクリプトは許可したものだけ、`pnpm-lock.yaml` をコミット、CI は `--frozen-lockfile`。**設定名は pnpm 公式ドキュメントで確かめてから書く**
- DOM へ文字列を入れるのは `textContent`／`setAttribute` だけ。`innerHTML`・`outerHTML`・`insertAdjacentHTML`・`document.write` を使わない
- 本番ビルドの `index.html` に CSP（自サイト以外からの読み込み禁止）と `<meta name="robots" content="noindex, nofollow">`、`public/robots.txt` で全拒否
- 画面の文字は日本語、中学生にわかる言葉。画面で「短所」と書かない（「のびしろ」「気をつけたい」）。「〜かもしれません」で決めつけない
- 文字：本文 18px（〜599px）／19px（600〜999px）／20px（1000px〜）、見出し 22px 以上、**15px 未満を使わない**、行間 1.85、字間 0.04em、左そろえ、斜体なし、段落 `max-width: 34em`、押せる要素は 44px 以上
- 真っ白・真っ黒（`#fff` `#ffffff` `white` `#000` `#000000` `black`）を使わない。文字と背景のコントラスト 4.5:1 以上（ライト・ダーク両方）
- 色だけで区別しない（記号・枠・太字・バッジを併用）。`prefers-color-scheme: dark` と `prefers-reduced-motion` に対応
- 本文の書体：`"UD デジタル 教科書体 N-R", "UD Digi Kyokasho N-R", "Klee One", "BIZ UDPGothic", sans-serif`。見出し・ボタン・数字：`"BIZ UDPGothic", "UD デジタル 教科書体 N-B", "UD Digi Kyokasho N-B", sans-serif`。Klee One と BIZ UDPゴシックは同梱（サブセット化）、UD デジタル 教科書体は同梱しない
- 時刻など毎回変わる値は引数で注入する
- コミットは Conventional Commits、本文は日本語。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- ファイルのダウンロード（書体）と GitHub 上の操作（リポジトリ作成・公開）は、実行前に作者の許可をとる

## Review Focus

1. **質問の途中でページを再読み込み／ブラウザの「戻る」で離れた** → もう一度開くと「つづきから」が出て、同じ問題・同じ回答から再開できる（Task 6 のテスト）
2. **`localStorage` が使えない端末（Safari のプライベートモードなど）** → エラーで止まらず、その場では最後まで診断できる（Task 3・Task 6 のテスト）
3. **質問を直したあとに、古い途中データが残っている** → 古いデータを捨てて最初から始まり、NaN や存在しない質問 ID で壊れない（Task 3 のテスト）
4. **スマホでの連続タップ** → 1回のタップで1問だけ進み、次の問題に誤って答えが入らない（Task 6 のテスト：300ms 以内の2回目は無視）
5. **端末の文字サイズを大きくしている／幅 320px の小さいスマホ** → 横スクロールが出ず、ボタンが折り返して押せる（Task 10 の Playwright 確認）

---

## ファイル構成

```
index.html                      … 入口。#app と noindex
vite.config.ts                  … base（環境変数 BASE_PATH）、CSP 注入プラグイン、Vitest 設定
pnpm-workspace.yaml             … pnpm の安全設定
data/                           … 既存 JSON 6つを移動（v1 は axes / animals / questions を使う）
public/robots.txt
public/licenses/                … 同梱書体の OFL ライセンス文（Task 6）
public/images/animals/*.webp    … 動物16匹（Task 9）
src/main.ts                     … 起動
src/types.ts                    … 型
src/data.ts                     … JSON を型つきで読み出す
src/scoring.ts                  … 判定（純粋関数）
src/storage.ts                  … 保存（Storage を注入）
src/dom.ts                      … h() 要素生成ヘルパー
src/app.ts                      … 画面の切りかえ
src/screens/top.ts, quiz.ts, result.ts
src/styles/tokens.css, base.css, layout.css, fonts.css
src/assets/fonts/               … サブセット済み woff2（生成物・Git に入れない）
src/assets/deco/*.webp          … あしらい（Task 9）
fonts-src/                      … 書体の元ファイルと OFL ライセンス文
scripts/subset-fonts.mjs        … 使う文字だけの woff2 を作る
scripts/remove-bg.py            … イラストの背景を透明にする
scripts/illust/prompt-template.md
tests/*.test.ts
docs/03_scoring-logic.md, docs/04_writing-guide.md
.github/workflows/ci.yml, deploy.yml, .github/dependabot.yml
AGENTS.md, CLAUDE.md, README.md, tasks/todo.md, tasks/lessons.md
```

設計書 §11-2 からの変更：書体とあしらいは CSS から相対パスで参照するため `src/assets/` に置く（Vite が base とハッシュを処理する）。動物画像は設計書どおり `public/images/animals/`。

---

### Task 1: プロジェクトの土台

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `public/robots.txt`, `.gitattributes`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `tasks/todo.md`, `tasks/lessons.md`, `tests/smoke.test.ts`
- Move: `*.json`（6つ）→ `data/`
- Modify: `.gitignore`（`src/assets/fonts/` を追加）

**Interfaces:**
- Produces: `pnpm dev` / `pnpm build` / `pnpm test` / `pnpm typecheck` / `pnpm audit:ci`（= `pnpm audit --prod --audit-level=moderate`）のスクリプト。`vite.config.ts` の `base: process.env.BASE_PATH ?? '/'`

- [ ] **Step 1: ブランチを切る** — `git switch -c feature/v1`（Task 1〜10 はこのブランチで進める）
- [ ] **Step 2: `.gitattributes` に `* text=auto eol=lf` と `*.png binary` `*.webp binary` `*.woff2 binary` `*.ttf binary` を書き、`git add --renormalize .`**
- [ ] **Step 3: `git mv` で JSON 6つを `data/` へ移す**
- [ ] **Step 4: pnpm の安全設定を公式ドキュメントで確認し、`pnpm-workspace.yaml` を書く** — 最低限：公開24時間未満の版を入れない（`minimumReleaseAge: 1440`）、インストール時スクリプトは esbuild など必要なものだけ許可。確認した URL と pnpm の版を `tasks/lessons.md` に書く
- [ ] **Step 5: 依存を入れる** — `pnpm add -D vite@^8.0.16 typescript vitest jsdom @types/node subset-font`。`package.json` に `"engines": { "node": ">=22.12" }`、`"packageManager"` を記録。`pnpm ls vite` で 8.0.16 以上を確認
- [ ] **Step 6: `tsconfig.json`（`strict: true`, `resolveJsonModule: true`, `module: "ESNext"`, `moduleResolution: "bundler"`）、`vite.config.ts`（`base`、`test.environment: 'node'`、画面テストはファイル先頭の `// @vitest-environment jsdom` で切りかえ）、`index.html`（`lang="ja"`、viewport、`<meta name="robots" content="noindex, nofollow">`、`<div id="app">`）、`public/robots.txt`（`User-agent: *` / `Disallow: /`）を書く**
- [ ] **Step 7: 失敗するテストを書く** — `tests/smoke.test.ts`

```ts
import axes from '../data/axes.json';
import animals from '../data/animals.json';
test('データを読み込める', () => {
  expect(axes.axes).toHaveLength(5);
  expect(animals.animals).toHaveLength(16);
});
```

- [ ] **Step 8: `pnpm test` で PASS、`pnpm typecheck` と `pnpm build` がエラーなし、`pnpm audit:ci` が脆弱性 0 件**（JSON を移す前に書いた場合は FAIL → 移動後 PASS）
- [ ] **Step 9: `AGENTS.md` と `CLAUDE.md`（同じ内容）を書く** — 作成考慮案 §19 の作業ルール＋この計画の Global Constraints＋「文章は `data/` だけで直す」「1作業ごとにコミット」。`README.md` に動かし方（`pnpm install` → `pnpm dev`）。`tasks/todo.md` にこの計画の Task 1〜10 をチェックリストで
- [ ] **Step 10: コミット** — `chore: Vite＋TypeScript の土台とデータ移動`

---

### Task 2: 判定ロジック

**Files:**
- Create: `src/types.ts`, `src/data.ts`, `src/scoring.ts`, `tests/scoring.test.ts`, `docs/03_scoring-logic.md`

**Interfaces:**
- Produces（`src/types.ts`）:

```ts
export type AxisId = 'A' | 'B' | 'C' | 'D' | 'E';
export type Side = 'left' | 'right';
export type Answer = 1 | 2 | 3 | 4 | 5;
export type GroupId = 'drive' | 'unite' | 'craft' | 'care';
export interface Question { id: string; axis: AxisId; direction: Side; text: string }
export interface AxisScore { axis: AxisId; rightness: number; side: Side; percent: number; balanced: boolean }
export interface Diagnosis { scores: Record<AxisId, AxisScore>; animalCode: string; typeCode: string; fullCode: string; groupId: GroupId }
```

- Produces（`src/scoring.ts`）:
  - `scoreAxis(questions: Question[], answers: Record<string, Answer>, axis: AxisId, balanceRange: readonly [number, number]): AxisScore`
  - `isComplete(questions: Question[], answers: Record<string, Answer>): boolean`
  - `diagnose(questions: Question[], answers: Record<string, Answer>, axes: AxisDef[], groups: GroupDef[], balanceRange: readonly [number, number]): Diagnosis` — 未回答があれば `IncompleteAnswersError` を throw
  - `class IncompleteAnswersError extends Error`
- Produces（`src/data.ts`）: `AxisDef` / `AnimalDef` / `GroupDef` 型と、`axes`・`animals`・`groups`・`questions`・`balanceRange`・`scaleLabels`・`questionSetVersion` の型つき export。`findAnimal(code: string): AnimalDef`

- [ ] **Step 1: 失敗するテストを書く** — `tests/scoring.test.ts`。8問すべて `direction: 'right'` の架空の質問で `scoreAxis` を確かめる（答え＝値）

```ts
const range = [40, 60] as const;
test.each([
  // 答え8つ, rightness, side, percent, balanced
  [[5,5,5,5,5,5,5,5], 100,    'right', 100, false],
  [[1,1,1,1,1,1,1,1], 0,      'left',  100, false],
  [[1,1,1,2,3,3,3,3], 28.125, 'left',  72,  false], // 表示「72％」
  [[2,2,2,3,3,3,3,3], 40.625, 'left',  59,  true ], // バランス型の下限側
  [[2,2,2,2,3,3,3,3], 37.5,   'left',  63,  false],
  [[3,3,3,3,3,3,3,3], 50,     'right', 50,  true ], // 50 ちょうどは右側
  [[3,3,3,3,3,4,4,4], 59.375, 'right', 59,  true ],
  [[3,3,3,3,4,4,4,4], 62.5,   'right', 63,  false],
])('scoreAxis %j', (ans, rightness, side, percent, balanced) => { /* toEqual で5項目を確認 */ });
```

  追加のテスト：
  - 左向きの質問は `6 − 答え` になる（左向き1問に「5」→ その問の値は 1）
  - 全問「そう思う」（右4問・左4問の軸）→ rightness 50・バランス型
  - `diagnose`：A 左・B 左・C 右・D 左・E 左 になる答え → `fullCode === 'LTFK-D'`, `animalCode === 'LTFK'`, `groupId === 'drive'`、`findAnimal('LTFK').name === 'ライオン'`
  - `diagnose`：全問「どちらともいえない」→ 全軸 rightness 50・`fullCode === 'SHFN-M'`・全軸 `balanced === true`
  - 未回答が1問でもあると `IncompleteAnswersError`
- [ ] **Step 2: `pnpm test tests/scoring.test.ts` → FAIL（`scoreAxis` が無い）**
- [ ] **Step 3: `src/types.ts`・`src/data.ts`・`src/scoring.ts` を実装** — rightness ＝ `(平均 − 1) / 4 × 100`、`side = rightness >= 50 ? 'right' : 'left'`、`percent = Math.round(side === 'right' ? rightness : 100 - rightness)`、`balanced = range[0] <= rightness && rightness <= range[1]`。コードは `axes.json` の `left.code`／`right.code`。グループは `animals.json` の `groups[].axes`（例 `"LT"`）と animalCode の先頭2文字で引く
- [ ] **Step 4: `pnpm test` → PASS**
- [ ] **Step 5: `docs/03_scoring-logic.md` に計算式・境目・3.125 きざみ・上の表を書く**
- [ ] **Step 6: コミット** — `feat: 5軸の点数計算とタイプ判定`

---

### Task 3: 端末内の保存

**Files:**
- Create: `src/storage.ts`, `tests/storage.test.ts`

**Interfaces:**
- Consumes: `Answer`, `AxisId`（Task 2）
- Produces:

```ts
export interface SavedState {
  schemaVersion: 1;
  questionSetVersion: string;
  answers: Record<string, Answer>;
  currentIndex: number;
  completedAt: string | null;   // ISO 文字列
  growthAxis: AxisId | null;
}
export interface Store { get(): SavedState; update(patch: Partial<SavedState>): SavedState; reset(): SavedState }
export function createStore(opts: { questionSetVersion: string; storage?: Storage | null; key?: string }): Store
export function defaultStorage(): Storage | null  // localStorage に触れて例外なら null
```

  key の既定値は `'kaigo-doubutsu-shindan'`。

- [ ] **Step 1: 失敗するテストを書く** — `tests/storage.test.ts`（Storage は Map を使った自作のにせものを注入）
  - 保存した内容を、新しく作った store で読み戻せる
  - 保存値が壊れた JSON → 初期状態（`answers` は空、`currentIndex` 0）
  - 保存値の `questionSetVersion` が違う → 初期状態に戻り、古い `answers` は残らない（Review Focus 3）
  - `setItem` が例外を投げる Storage → `update` は例外を出さず、`get()` には反映されている（Review Focus 2）
  - `storage: null` でも `update` / `get` / `reset` が動く
  - `reset()` で key が Storage から消える
- [ ] **Step 2: `pnpm test tests/storage.test.ts` → FAIL**
- [ ] **Step 3: `src/storage.ts` を実装** — 読み込み時に `schemaVersion`・`questionSetVersion`・各フィールドの型を確かめ、合わなければ初期状態。書き込みは try/catch でメモリ上の状態を正とする
- [ ] **Step 4: `pnpm test` → PASS**
- [ ] **Step 5: コミット** — `feat: 回答と結果の端末内保存`

---

### Task 4: 文章ルールと軸の文章

**Files:**
- Create: `docs/04_writing-guide.md`, `tests/data.test.ts`
- Modify: `data/axes.json`, `src/data.ts`（型に新しい欄を足す）

**Interfaces:**
- Produces（`axes.json` の各 `left`／`right` に足す欄）: `strengthLead`（★の太字の一文）, `scene`（介護の場面の強み、2〜4文）, `future`（強みがのびた先、一文）, `growth: { day1, month1, month3, goal }`。軸ごとに `icon`（例 A `🚩`、B `👀`。絵文字1文字）。E の左右に `typeSentence`（入口に出す型の一文）。既存の `strength`／`weakness`／`tip` は残す

- [ ] **Step 1: `docs/04_writing-guide.md` を書く** — 設計書 §7-3 のルールとお手本（引っぱる側）をそのまま入れ、成長ステップのお手本も入れる
- [ ] **Step 2: 失敗するテストを書く** — `tests/data.test.ts`
  - 10の側すべてで `weakness`・`tip`・`strengthLead`・`scene`・`future`・`growth` の4つが空でない
  - `weakness` は一文（「。」が文末の1つだけ）
  - `strengthLead + scene + future` の文字数 ＞ `weakness` の文字数
  - 5軸すべてに `icon`、E の左右に `typeSentence`
  - 共通の文字チェック関数 `checkCopy(text)`：「短所」を含まない、「。！？」で区切った1文が50字以内
- [ ] **Step 3: `pnpm test tests/data.test.ts` → FAIL**
- [ ] **Step 4: 10の側の文章を下書きして `data/axes.json` に入れる** — 書き方は `docs/04_writing-guide.md`。引っぱる側は設計書のお手本の文をそのまま使う
- [ ] **Step 5: `pnpm test` → PASS**
- [ ] **Step 6: コミット** — `content: 軸ごとの長所・のびしろ・成長ステップの文章`

---

### Task 5: 質問40問と動物の文章

**Files:**
- Modify: `data/questions.json`, `data/animals.json`, `src/data.ts`, `tests/data.test.ts`

**Interfaces:**
- Produces（`animals.json`）: 各動物に `oneLiner`（入口のひとこと、強みだけ、2文まで）, `leader: { strength, habit, hint }`, `follower: { strength, instruction, encouragement }`。`image` を `<英名>.webp` に変更。`groups[]` に `colorName`（`'coral' | 'yellow' | 'mint' | 'lavender'`。drive＝coral、unite＝yellow、craft＝mint、care＝lavender）
- Produces（`questions.json`）: `version` を `"1.0"` にし、40問

- [ ] **Step 1: 失敗するテストを足す**（`tests/data.test.ts`）
  - 質問は40問、各軸8問、各軸で `direction` が `left` 4問・`right` 4問、`id` が重ならない
  - **となり合う2問が同じ軸にならない**（固定順でまぜる）
  - 動物は16、`code` が A〜D の組み合わせ16通りをすべて含む
  - 全動物で `oneLiner`・`leader`・`follower` の各欄が空でない、`checkCopy` に通る
  - `oneLiner` に、その動物の4軸の `weakness` の文が含まれない（入口は強みだけ）
- [ ] **Step 2: `pnpm test` → FAIL**
- [ ] **Step 3: 質問40問を下書きする** — 介護現場の場面を多めに。既存10問は活かす
- [ ] **Step 4: 16動物の文章を下書きする**
- [ ] **Step 5: `pnpm test` → PASS**
- [ ] **Step 6: コミット** — `content: 質問40問と16動物の文章`

> **確認ポイント（作者）**：Task 8 のあと、動く画面で質問と文章を読んでもらう。直しは `data/` だけで行う。

---

### Task 6: 見た目の土台と書体

**Files:**
- Create: `src/styles/tokens.css`, `base.css`, `layout.css`, `fonts.css`, `scripts/subset-fonts.mjs`, `fonts-src/`（4書体＋ OFL）, `tests/styles.test.ts`, `tests/subset.test.ts`
- Modify: `package.json`（`predev` / `prebuild` で `node scripts/subset-fonts.mjs`）, `src/main.ts`（CSS を import）

**Interfaces:**
- Produces（CSS 変数）: 土台 `--bg --text --head --accent --card --sub --mark --line`（値は設計書 §8-3 の表）。グループ `--g-{drive|unite|craft|care}-{soft|strong|ink}`。結果画面のルートに `data-group="drive"` などを付けると `--group-soft/--group-strong/--group-ink` が切りかわる
- Produces（`scripts/subset-fonts.mjs`）: `export function collectChars(texts: string[]): string`（重複なし、ASCII 印字可能文字 0x20–0x7E を必ず含む）

- [ ] **Step 1: 書体の入手を作者に確認する** — 入手先と大きさを伝えて許可をとる：Klee One（`github.com/fontworks-fonts/Klee` の Regular・SemiBold TTF）、BIZ UDPGothic（`github.com/googlefonts/morisawa-biz-ud-gothic` の Regular・Bold TTF）、各 OFL.txt。許可後 `fonts-src/` に置き、OFL.txt は配布物にも入るよう `public/licenses/KleeOne-OFL.txt`・`public/licenses/BIZUDPGothic-OFL.txt` にもコピーする（OFL は書体を配るときにライセンス文の同梱を求めるため）
- [ ] **Step 2: 失敗するテストを書く**
  - `tests/subset.test.ts`：`collectChars(['あい', 'いう'])` が「あ」「い」「う」をそれぞれ1回だけ含み、`'A'` と `'%'` も含む
  - `tests/styles.test.ts`（CSS を文字列で読む）：
    - ライト・ダークそれぞれで、`--text`／`--bg`、`--text`／`--card`、`--head`／`--bg`、`--text`／`--mark`、4グループの `--g-*-ink`／`--g-*-soft` のコントラスト比が 4.5 以上（WCAG の相対輝度で計算）
    - 全 CSS で `font-size` の px 値が 15 以上、rem 値 × 16 が 15 以上
    - 禁止色（`#fff` `#ffffff` `white` `#000` `#000000` `black`）が値として出てこない
    - `font-style: italic` が無い
- [ ] **Step 3: `pnpm test` → FAIL**
- [ ] **Step 4: `subset-fonts.mjs` を実装** — `data/*.json`・`src/**/*.ts`・`index.html` の全文字＋ ASCII を集め、`fonts-src/*.ttf` から `src/assets/fonts/*.woff2` を作る
- [ ] **Step 5: CSS を書く** — `fonts.css` に @font-face（`font-display: swap`、`src: url('../assets/fonts/KleeOne-Regular.woff2')` など相対パス）。`base.css` に Global Constraints の文字・書体の決まり、`prefers-reduced-motion`。`layout.css` に `@media (min-width: 600px)` と `@media (min-width: 1000px)` の配置（設計書 §8-5）。グループ4色はライト・ダークとも 4.5:1 を満たす値に決める
- [ ] **Step 6: `pnpm test` → PASS、`pnpm build` 後の `dist/assets/` の woff2 合計が 1MB 未満**
- [ ] **Step 7: コミット** — `feat: 配色・文字の土台と書体のサブセット化`

---

### Task 7: トップと質問の画面

**Files:**
- Create: `src/dom.ts`, `src/app.ts`, `src/screens/top.ts`, `src/screens/quiz.ts`, `tests/app.test.ts`, `tests/no-html-injection.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `createStore`・`defaultStorage`（Task 3）、`questions`・`scaleLabels`・`questionSetVersion`（Task 2）、`isComplete`（Task 2）
- Produces:
  - `h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string | boolean | ((e: Event) => void)>, ...children: (Node | string | null)[]): HTMLElementTagNameMap[K]` — 文字列の子は `document.createTextNode`
  - `createApp(root: HTMLElement, deps: { store: Store; now: () => number; confirm: (msg: string) => boolean }): { show(screen: 'top' | 'quiz' | 'result'): void }`
  - 画面の要素には `data-screen="top|quiz|result"`、結果の各部分には `data-section`（Task 8）

- [ ] **Step 1: 失敗するテストを書く** — `tests/app.test.ts`（`// @vitest-environment jsdom`、store は Task 3 のにせ Storage、`now` は手で進める時計）
  - トップ：注意書き「正式な心理検査ではありません」「人事評価には使いません」「この端末の中だけ」が出る。途中データ無し→「はじめる」だけ、途中データあり→「つづきから」、`completedAt` あり→「前回の結果を見る」
  - 質問：「1／40」と1問目の文が出る。5つの答えボタンは `scaleLabels` の文。「そう思う」を押すと「2／40」になり、store の答えが 5。「戻る」で「1／40」に戻り、押した答えのボタンが `aria-pressed="true"`
  - **連続タップ**：答えを押してから 300ms 未満にもう一度押しても2問目には答えが入らない。300ms 以上たてば入る（Review Focus 4）
  - **再開**：`currentIndex` 5 の状態で `createApp` を作り直し「つづきから」→「6／40」（Review Focus 1）
  - **保存できない端末**：`storage: null` の store で40問答えると結果画面になる（Review Focus 2）
  - 40問目に答えると `completedAt` が `new Date(now()).toISOString()` になり、結果画面に移る
- [ ] **Step 2: 失敗するテストを書く** — `tests/no-html-injection.test.ts`：`src/**/*.ts` に `innerHTML`・`outerHTML`・`insertAdjacentHTML`・`document.write` が無い
- [ ] **Step 3: `pnpm test` → FAIL**
- [ ] **Step 4: `dom.ts`・`app.ts`・`top.ts`・`quiz.ts` を実装** — 答えたら自動で次の問題へ。進み具合バーは `<progress>` と「○／40」の文字の両方。`main.ts` で `createApp(document.getElementById('app')!, { store: createStore({ questionSetVersion, storage: defaultStorage() }), now: Date.now, confirm: (m) => window.confirm(m) })`
- [ ] **Step 5: `pnpm test` → PASS**
- [ ] **Step 6: コミット** — `feat: トップと質問の画面`

---

### Task 8: 結果の画面

**Files:**
- Create: `src/screens/result.ts`, `tests/result.test.ts`
- Modify: `src/app.ts`

**Interfaces:**
- Consumes: `diagnose`・`findAnimal`（Task 2）、`axes`（Task 4 の欄）、`animals`（Task 5 の欄）、`Store`（Task 3）
- Produces: `renderResult(root: HTMLElement, ctx: { diagnosis: Diagnosis; store: Store; onRetry(): void; onClear(): void }): void`

- [ ] **Step 1: 失敗するテストを書く** — `tests/result.test.ts`（jsdom）
  - `data-section` の並びが `hero, axes, cards, leader, follower, growth` の順
  - ルートの `data-group` が `diagnosis.groupId`
  - hero の文字に、どの軸の `weakness` の文も含まれない
  - 右側寄り度 28.125 の軸の行に「引っぱる 寄り（72％）」、40.625 の軸に「◎ バランス型（どちらもできる）」、各行に軸の `icon`
  - 各カードのラベルが「△ 気をつけたい」「〇 やってみる」「★ あなたの力」の順で、その人が寄っている側の文章
  - 成長ステップ：最初はどの軸も選ばれていない。「進め方」を押すと C の寄っている側の `growth` 4つ（①明日から ②1か月 ③3か月 ◎半年後の目標）が出て、`store.get().growthAxis === 'C'`。バランス型の軸を選んだときも寄っている側が出る。`growthAxis` が保存済みなら最初から選ばれている
  - 「結果を消す」：`confirm` が true なら store が初期状態になりトップへ、false なら何もしない
  - 「もう一度やる」：答えを消して1問目へ
- [ ] **Step 2: `pnpm test tests/result.test.ts` → FAIL**
- [ ] **Step 3: `result.ts` を実装** — 設計書 §7-1 の構成。イラストは `${import.meta.env.BASE_URL}images/animals/${animal.image}`（`alt` は「{動物名}のイラスト」）。画像がまだ無い間は枠だけ表示
- [ ] **Step 4: `pnpm test` → PASS**
- [ ] **Step 5: `pnpm dev` で 40問答えて結果まで通しで動くことを目で確かめる**
- [ ] **Step 6: コミット** — `feat: 結果の画面と成長ステップ`

> **確認ポイント（作者）**：`pnpm dev` の画面で質問と文章を読んでもらい、直しを `data/` に反映してコミット（`content: …`）。

---

### Task 9: イラストとあしらい

**Files:**
- Create: `scripts/illust/prompt-template.md`, `scripts/remove-bg.py`, `public/images/animals/*.webp`（16）, `src/assets/deco/*.webp`（6〜10）
- Modify: `src/styles/layout.css`（あしらいの配置）, `tests/data.test.ts`

**Interfaces:**
- Consumes: `animals[].image`・`groups[].colorName`（Task 5）

- [ ] **Step 1: 動物16種の一覧（コード・動物・グループ・制服の色）を作者に見せて確定する** — 変更があれば `animals.json` を直す
- [ ] **Step 2: `prompt-template.md` を書く** — 絵柄D の条件（2頭身・点の目・太めで均一な濃い茶色の線・影なしのベタ塗り・くすみカラー・ピンクのほっぺ・ポロシャツと無地の名札・中性的・背景は無地クリーム `#faf6f0`・文字なし・真っ白真っ黒なし・1024×1024）。差し込み欄は `{animal}` と `{uniformColor}`
- [ ] **Step 3: 失敗するテストを足す** — 全動物の `public/images/animals/<image>` が存在する
- [ ] **Step 4: 16匹を Codex で作る** — 1匹ずつ `codex exec --skip-git-repo-check -s workspace-write -i docs/reference/lion-style-d.png -`（指示文は標準入力）。出力は `.superpowers/illust/raw/` へ
- [ ] **Step 5: `remove-bg.py` を実装して実行** — 四隅からの塗りつぶしで背景色に近い画素を透明にし、512×512 の WebP（透過）で `public/images/animals/` に保存。各出力の四隅の alpha が 0、中心の alpha が 255 であることを確かめる
- [ ] **Step 6: あしらい（キラキラ・ハート・葉っぱ・手のひら・名札など）を同じ手順で作り `src/assets/deco/` へ。`layout.css` で入口とカードのまわりに散らす（`aria-hidden` の飾り扱い、文字に重ねない）**
- [ ] **Step 7: 16匹とあしらいを一覧にして、作者に見てもらう。タッチがずれたものだけ作り直す**
- [ ] **Step 8: `pnpm test` → PASS**
- [ ] **Step 9: コミット** — `feat: 動物イラストとあしらい`

---

### Task 10: 公開の準備と最終確認

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`, `tests/build.test.ts`
- Modify: `vite.config.ts`（CSP 注入プラグイン）

**Interfaces:**
- Consumes: 全タスク

- [ ] **Step 1: 失敗するテストを書く** — `tests/build.test.ts`：Vite の `build()` を一時フォルダに出力し、`index.html` に次が含まれる
  - `Content-Security-Policy` で `default-src 'self'`・`connect-src 'none'`・`object-src 'none'`・`base-uri 'none'`・`form-action 'none'`
  - `<meta name="robots" content="noindex, nofollow">`
  - `https://` で始まる `src=` / `href=` が無い（外部読み込みなし）
- [ ] **Step 2: `pnpm test tests/build.test.ts` → FAIL**
- [ ] **Step 3: CSP を本番ビルドだけで注入する Vite プラグインを `vite.config.ts` に書く**（`transformIndexHtml`、`apply: 'build'`。開発中は Vite がスタイルを直接入れるため付けない）
- [ ] **Step 4: `pnpm test` → PASS**
- [ ] **Step 5: CI とデプロイを書く** — `ci.yml`（push・PR で `pnpm install --frozen-lockfile` → `typecheck` → `test` → `audit:ci` → `build`）、`deploy.yml`（main への push で `BASE_PATH=/${{ github.event.repository.name }}/ pnpm build` → `actions/upload-pages-artifact` → `actions/deploy-pages`）、`dependabot.yml`（npm と github-actions、毎週）。Actions はコミット SHA で固定
- [ ] **Step 6: 画面の確認（playwright-cli）** — `pnpm build && pnpm preview` を開き、幅 320・375・800・1200px で通しで答えて結果まで進む。各幅で `document.documentElement.scrollWidth <= window.innerWidth`（横スクロールなし）、文字サイズ 200% でも同じ（Review Focus 5）。ライト・ダーク両方でスクリーンショットを撮り、作者に送る
- [ ] **Step 7: コミット** — `ci: CSP・CI・GitHub Pages への公開設定`
- [ ] **Step 8: GitHub への公開を作者に確認する** — リポジトリ名を決めてもらい、許可を得てから `gh repo create <名前> --public --source . --push`、Settings の Pages を「GitHub Actions」に。公開 URL をスマホで開いて通しで確認し、URL を伝える
- [ ] **Step 9: `tasks/todo.md` を更新し、`superpowers:finishing-a-development-branch` で main に統合する**
