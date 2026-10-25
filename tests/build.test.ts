import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';

// 本番ビルドを一時フォルダに出して、公開されるファイルを確かめる
let outDir = '';
let html = '';
let css = '';

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'kaigo-build-'));
  await build({ logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  html = readFileSync(join(outDir, 'index.html'), 'utf-8');
  const assets = join(outDir, 'assets');
  css = readdirSync(assets).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf-8')).join('\n');
}, 120_000);

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

test('CSP で、自分のサイト以外からの読みこみと送信を止める', () => {
  // Vite は属性の ' を &#39; と書く（ブラウザは読むときに ' に戻す）
  const csp = (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? '').replaceAll('&#39;', "'");
  for (const rule of ["default-src 'self'", "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
    expect(csp).toContain(rule);
  }
});

test('CSP は head の最初のほうにある（ほかの読みこみより前）', () => {
  const head = html.slice(html.indexOf('<head>'));
  expect(head.indexOf('Content-Security-Policy')).toBeLessThan(head.search(/<script|<link/));
});

test('検索エンジンに載せない', () => {
  expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
});

test('外部（https://）のファイルを読みこまない', () => {
  expect(html).not.toMatch(/(src|href)="https?:\/\//);
  expect(css).not.toMatch(/url\(\s*["']?https?:\/\//);
});

test('CSS に data: の画像を埋めこまない（CSP の img-src で止められるため）', () => {
  expect(css.match(/url\(\s*["']?data:[^,]{0,40}/g) ?? []).toEqual([]);
});
