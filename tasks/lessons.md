# 学んだこと

## 2026-10-23 pnpm の安全設定
- 確認した資料：https://pnpm.io/settings/dependency-resolution 、 https://pnpm.io/settings/build （pnpm 10.34.5 で使用）
- `minimumReleaseAge`（分、v10.16〜。v11 から既定 1440）、`blockExoticSubdeps`（v10.26〜）、`trustPolicy: no-downgrade`（v10.21〜）、`strictDepBuilds`、`allowBuilds`（v10.26〜。v11 で `onlyBuiltDependencies` は廃止）
- 設定は `.npmrc` ではなく `pnpm-workspace.yaml` に書く（`.npmrc` は認証とレジストリだけ）
- `pnpm audit --prod` は devDependencies を見ない。このアプリは依存がすべて開発用なので `--prod` を付けない
- 学び: Git Bash で長いヒアドキュメントを複数つなぐと構文エラーになることがある。長いファイルは Write ツールで書く
