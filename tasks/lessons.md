# 学んだこと

## 2026-10-23 pnpm の安全設定
- 確認した資料：https://pnpm.io/settings/dependency-resolution 、 https://pnpm.io/settings/build （pnpm 10.34.5 で使用）
- `minimumReleaseAge`（分、v10.16〜。v11 から既定 1440）、`blockExoticSubdeps`（v10.26〜）、`trustPolicy: no-downgrade`（v10.21〜）、`strictDepBuilds`、`allowBuilds`（v10.26〜。v11 で `onlyBuiltDependencies` は廃止）
- 設定は `.npmrc` ではなく `pnpm-workspace.yaml` に書く（`.npmrc` は認証とレジストリだけ）
- `pnpm audit --prod` は devDependencies を見ない。このアプリは依存がすべて開発用なので `--prod` を付けない
- 学び: Git Bash で長いヒアドキュメントを複数つなぐと構文エラーになることがある。長いファイルは Write ツールで書く

## 2026-10-24 画像と CSS
- CSS の `background:` 一括指定は `background-image` も初期値（none）に戻す。共通ルールで一括指定すると、指定の細かさ（詳細度）が低い個別ルールの画像が消える → 共通ルールでは `background-position` / `background-size` / `background-repeat` を個別に書く
- Pillow の `Image.fromarray()` の画像は numpy 配列と中身を共有し読み取り専用。`ImageDraw.floodfill` の結果が消えるので `.copy()` してから描く
- 確認（四隅が透明か等）は、必ず失敗する条件（余白をつけた後など）で行うと何も見張れない。わざと壊した状態で落ちることを確かめる
