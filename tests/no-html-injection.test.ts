import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? tsFiles(p) : name.endsWith('.ts') ? [p] : [];
  });
}

test.each(tsFiles(join(__dirname, '../src')))('%s：HTML を文字列で流しこまない', (file) => {
  const code = readFileSync(file, 'utf-8');
  expect(code).not.toMatch(/\b(innerHTML|outerHTML|insertAdjacentHTML)\b|document\.write/);
});
