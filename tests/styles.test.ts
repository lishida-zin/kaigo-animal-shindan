import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '../src/styles');
const files = readdirSync(dir).filter((f) => f.endsWith('.css'));
const all = files.map((f) => ({ f, css: readFileSync(join(dir, f), 'utf-8') }));
const tokens = readFileSync(join(dir, 'tokens.css'), 'utf-8');

function vars(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}
const light = vars(tokens.split('@media')[0]);
const dark = vars(tokens.slice(tokens.indexOf('prefers-color-scheme: dark')));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const pairs: [string, string][] = [
  ['--text', '--bg'], ['--text', '--card'], ['--head', '--bg'], ['--head', '--card'], ['--text', '--mark'], ['--muted', '--bg'],
  ...(['drive', 'unite', 'craft', 'care'].map((g) => [`--g-${g}-ink`, `--g-${g}-soft`]) as [string, string][]),
];

describe.each([['ライト', light], ['ダーク', dark]] as const)('%s：コントラスト 4.5:1 以上', (_, t) => {
  test.each(pairs)('%s / %s', (fg, bg) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
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
