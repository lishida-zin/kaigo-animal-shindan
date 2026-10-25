/** 画面に出す文章のルール違反を返す（違反がなければ空の配列） */
export function checkCopy(text: string): string[] {
  const problems: string[] = [];
  if (text.includes('短所')) problems.push(`「短所」を含む: ${text}`);
  const sentences = text.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    const len = [...s].length;
    if (len > 50) problems.push(`50字をこえる文（${len}字）: ${s}`);
  }
  return problems;
}
