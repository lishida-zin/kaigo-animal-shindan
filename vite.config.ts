import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

/** 自分のサイトのファイルだけを読みこみ、外部への通信と送信を止める */
const CSP = [
  "default-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** 本番ビルドの index.html だけに CSP を入れる（開発中は Vite がスタイルを直接入れるため付けない） */
function csp(): Plugin {
  return {
    name: 'kaigo-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [csp()],
  build: {
    // 小さな画像を CSS に data: で埋めこむと CSP の img-src で止められるので、埋めこまない
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
