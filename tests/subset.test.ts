import { collectChars } from '../scripts/subset-fonts.mjs';

test('使う文字を重複なしで集め、ASCII も必ず含める', () => {
  const chars = collectChars(['あい', 'いう']);
  for (const c of ['あ', 'い', 'う']) expect([...chars].filter((x) => x === c)).toHaveLength(1);
  expect(chars).toContain('A');
  expect(chars).toContain('%');
});
