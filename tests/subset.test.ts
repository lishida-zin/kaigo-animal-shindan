import { readFileSync, readdirSync } from 'node:fs';
import { collectChars } from '../scripts/subset-fonts.mjs';

test('使う文字を重複なしで集め、ASCII も必ず含める', () => {
  const chars = collectChars(['あい', 'いう']);
  for (const c of ['あ', 'い', 'う']) expect([...chars].filter((x) => x === c)).toHaveLength(1);
  expect(chars).toContain('A');
  expect(chars).toContain('%');
});

test('fonts.css が読みこむ書体と、fonts-src/ に置いた書体が一致する（使わない書体を配らない）', () => {
  const css = readFileSync('src/styles/fonts.css', 'utf-8');
  const used = [...css.matchAll(/url\("\.\.\/assets\/fonts\/([\w-]+)\.woff2"\)/g)].map((m) => m[1]).sort();
  const shipped = readdirSync('fonts-src').filter((f) => f.endsWith('.ttf')).map((f) => f.replace(/\.ttf$/, '')).sort();
  expect(used.length).toBeGreaterThan(0);
  expect(used).toEqual(shipped);
});
