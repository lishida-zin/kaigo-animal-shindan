# 作業ルール（Codex / Claude Code 共通）

このファイルと `AGENTS.md` は同じ内容にする。片方を直したら、もう片方も直す。

## このアプリ

介護職向けの動物タイプ診断 Web アプリ「介護どうぶつ診断（仮）」。
- 設計書：`docs/02_requirements.md`（正）／確認用 `html/02_requirements.html`
- 実装計画：`docs/plans/2026-10-23-kaigo-animal-shindan-v1.md`
- 判定のしくみ：`docs/03_scoring-logic.md`、文章の書き方：`docs/04_writing-guide.md`

## 文章と画面

- 画面の文字は日本語で、中学生にわかる言葉にする
- 画面で「短所」と書かない（「のびしろ」「気をつけたい」）。「〜かもしれません」で決めつけない
- 質問・説明文・成長ステップはすべて `data/` の JSON で管理し、コードに直接書かない。文章の直しは `data/` だけで行う
- スマホで使うことを一番に考える。タブレット・パソコンにも対応する

## 読みやすさ（LD・ディスレクシア対応）

- 本文 18px（〜599px）／19px（600〜999px）／20px（1000px〜）、見出し 22px 以上、15px 未満を使わない
- 行間 1.85、字間 0.04em、左そろえ、斜体なし、段落 `max-width: 34em`、押せる要素は 44px 以上
- 本文の書体：`"UD デジタル 教科書体 N-R", "UD Digi Kyokasho N-R", "Klee One", "BIZ UDPGothic", sans-serif`
- 見出し・ボタン・数字：`"BIZ UDPGothic", "UD デジタル 教科書体 N-B", "UD Digi Kyokasho N-B", sans-serif`
- Klee One と BIZ UDPゴシックは同梱（サブセット化）。UD デジタル 教科書体は同梱しない（配布許可がないため）
- 真っ白・真っ黒を使わない。文字と背景のコントラスト 4.5:1 以上（ライト・ダーク両方）
- 色だけで区別しない（記号・枠・太字・バッジを併用）。ダークモードと「動きを減らす」設定に対応

## セキュリティとプライバシー

- 静的サイトのみ。サーバー側のコードを持たない
- 回答・結果は端末の中（`localStorage`）だけに保存し、外部に送らない。アクセス解析・広告・外部フォント・外部スクリプトを入れない
- DOM へ文字列を入れるのは `textContent`／`setAttribute` だけ。`innerHTML` などを使わない（テストで見張っている）
- Vite は 8.0.16 以上。開発サーバーを `--host` でネットワークに出さない
- pnpm の安全設定は `pnpm-workspace.yaml`。`pnpm-lock.yaml` をコミットする
- 時刻など毎回変わる値は引数で注入する

## 作業の進め方

- パッケージ管理は pnpm
- ブランチ：`feature/*`・`fix/*`・`refactor/*`・`docs/*`。main に直接コミットしない
- 1つの作業が終わるごとにコミットし、何をしたか日本語で説明する（Conventional Commits）
- 新しい機能・バグ修正にはテストを書く（先に失敗するテストを書く）
- 作業の記録：`tasks/todo.md`、学んだこと：`tasks/lessons.md`
- ファイルのダウンロードと GitHub 上の操作（リポジトリ作成・公開）は、実行前に作者の許可をとる

## よく使うコマンド

```bash
pnpm install
pnpm dev        # 開発用サーバー（自分のパソコンの中だけ）
pnpm test       # テスト
pnpm typecheck  # 型チェック
pnpm build      # 本番ビルド
pnpm audit:ci   # 部品の脆弱性チェック
```
