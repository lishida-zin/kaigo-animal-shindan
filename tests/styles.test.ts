import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '../src/styles');
const files = readdirSync(dir).filter((f) => f.endsWith('.css'));
const all = files.map((f) => ({ f, css: readFileSync(join(dir, f), 'utf-8') }));
const tokens = readFileSync(join(dir, 'tokens.css'), 'utf-8');

function vars(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1] ?? '', m[2] ?? '']));
}
const light = vars(tokens.split('@media')[0] ?? '');
const dark = vars(tokens.slice(tokens.indexOf('prefers-color-scheme: dark')));

function luminance(hex: string): number {
  const lin = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5);
}
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const pairs: [string, string][] = [
  ['--text', '--bg'], ['--text', '--card'], ['--head', '--bg'], ['--head', '--card'], ['--text', '--mark'], ['--muted', '--bg'],
  ...(['drive', 'unite', 'craft', 'care'].map((g) => [`--g-${g}-ink`, `--g-${g}-soft`]) as [string, string][]),
];

describe.each([['ライト', light], ['ダーク', dark]] as const)('%s：コントラスト 4.5:1 以上', (_, t) => {
  test.each(pairs)('%s / %s', (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg] ?? '', t[bg] ?? '')).toBeGreaterThanOrEqual(4.5);
  });
});

test.each(all.map((x) => [x.f, x.css] as const))('%s：15px 未満の文字がない', (_, css) => {
  for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem|em)/g)) {
    const px = m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
    expect(px, m[0]).toBeGreaterThanOrEqual(15);
  }
});

test.each(all.map((x) => [x.f, x.css] as const))('%s：真っ白・真っ黒を使わない', (_, css) => {
  expect(css).not.toMatch(/#fff\b|#ffffff\b|#000\b|#000000\b/i);
  expect(css).not.toMatch(/:\s*[^;{}]*\b(white|black)\b/i);
});

test.each(all.map((x) => [x.f, x.css] as const))('%s：斜体を使わない', (_, css) => {
  expect(css).not.toMatch(/font-style:\s*italic/);
});

// 書体の woff2 はビルドの前に作られる生成物なので、ここでは調べない（tests/subset.test.ts で確認）
test.each(all.map((x) => [x.f, x.css] as const))('%s：url() で読みこむファイルがある', (_, css) => {
  const urls = [...css.matchAll(/url\("(\.\.\/[^"]+)"\)/g)].map((m) => m[1] ?? '').filter((u) => !u.startsWith('../assets/fonts/'));
  for (const u of urls) expect(existsSync(join(dir, u)), u).toBe(true);
});

// 押せる箱の枠が見えること（WCAG 1.4.11：まわりとの差 3:1 以上）
const base = readFileSync(join(dir, 'base.css'), 'utf-8');
const buttonBorder = base.match(/(?:^|\n)button \{[^}]*border:[^;]*var\((--[\w-]+)\)/)?.[1] ?? '';
test.each([['ライト', light], ['ダーク', dark]] as const)('%s：ボタンの枠と背景のコントラストが 3:1 以上', (_, t) => {
  expect(buttonBorder).not.toBe('');
  expect(contrast(t[buttonBorder] ?? '', t['--bg'] ?? '')).toBeGreaterThanOrEqual(3);
});

// 端末やブラウザで「文字を大きく」している人の設定が効くよう、基準の文字の大きさは % で決める
test('html の文字の大きさは px ではなく % で決める', () => {
  const sizes = [...base.matchAll(/html\s*\{[^}]*font-size:\s*([^;]+);/g)].map((m) => m[1]?.trim() ?? '');
  expect(sizes.length).toBeGreaterThan(0);
  for (const s of sizes) expect(s, s).toMatch(/%$/);
});
