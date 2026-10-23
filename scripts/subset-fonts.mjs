// 同梱する書体から、アプリで使う文字だけを取り出して小さな woff2 を作る
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'fonts-src');
const OUT_DIR = join(ROOT, 'src/assets/fonts');

/** 使う文字を重複なしで集める。ASCII の印字可能文字（0x20〜0x7E）は必ず含める */
export function collectChars(texts) {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(String.fromCharCode(c));
  for (const t of texts) for (const ch of t) set.add(ch);
  return [...set].join('');
}

function listFiles(dir, exts) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return listFiles(p, exts);
    return exts.some((e) => name.endsWith(e)) ? [p] : [];
  });
}

async function main() {
  const fonts = listFiles(SRC_DIR, ['.ttf']);
  if (fonts.length === 0) {
    console.warn('[subset-fonts] fonts-src/ に書体がないため、サブセット化をとばします（代わりの書体で表示されます）');
    return;
  }
  const { default: subsetFont } = await import('subset-font');
  const sources = [
    ...listFiles(join(ROOT, 'data'), ['.json']),
    ...listFiles(join(ROOT, 'src'), ['.ts']),
    join(ROOT, 'index.html'),
  ];
  const chars = collectChars(sources.map((p) => readFileSync(p, 'utf-8')));
  mkdirSync(OUT_DIR, { recursive: true });
  for (const font of fonts) {
    const out = join(OUT_DIR, basename(font).replace(/\.ttf$/, '.woff2'));
    const buf = await subsetFont(readFileSync(font), chars, { targetFormat: 'woff2' });
    writeFileSync(out, buf);
    console.log(`[subset-fonts] ${basename(out)}（${Math.round(buf.length / 1024)} KB）`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`[subset-fonts] ${e.message}`);
    process.exit(1);
  });
}
