import type { AxisDef, GroupDef } from './data';
import type { Answer, AxisId, AxisScore, Diagnosis, Question } from './types';

export class IncompleteAnswersError extends Error {
  constructor(missing: string[]) {
    super(`未回答の質問があります: ${missing.join(', ')}`);
    this.name = 'IncompleteAnswersError';
  }
}

export function isComplete(questions: Question[], answers: Record<string, Answer>): boolean {
  return questions.every((q) => answers[q.id] !== undefined);
}

export function scoreAxis(
  questions: Question[],
  answers: Record<string, Answer>,
  axis: AxisId,
  balanceRange: readonly [number, number],
): AxisScore {
  const own = questions.filter((q) => q.axis === axis);
  const missing = own.filter((q) => answers[q.id] === undefined).map((q) => q.id);
  if (missing.length > 0) throw new IncompleteAnswersError(missing);
  // 右側に寄るほど大きい値（1〜5）にそろえる
  const sum = own.reduce((acc, q) => {
    const a = answers[q.id] ?? 0;
    return acc + (q.direction === 'right' ? a : 6 - a);
  }, 0);
  // (平均 − 1) / 4 × 100 を、誤差が出にくい整数の計算で求める
  const rightness = ((sum - own.length) * 100) / (4 * own.length);
  const side = rightness >= 50 ? 'right' : 'left';
  const percent = Math.round(side === 'right' ? rightness : 100 - rightness);
  const balanced = balanceRange[0] <= rightness && rightness <= balanceRange[1];
  return { axis, rightness, side, percent, balanced };
}

export function diagnose(
  questions: Question[],
  answers: Record<string, Answer>,
  axes: AxisDef[],
  groups: GroupDef[],
  balanceRange: readonly [number, number],
): Diagnosis {
  const missing = questions.filter((q) => answers[q.id] === undefined).map((q) => q.id);
  if (missing.length > 0) throw new IncompleteAnswersError(missing);

  const scores = {} as Record<AxisId, AxisScore>;
  const codes = {} as Record<AxisId, string>;
  for (const axis of axes) {
    const score = scoreAxis(questions, answers, axis.id, balanceRange);
    scores[axis.id] = score;
    codes[axis.id] = axis[score.side].code;
  }
  const animalCode = codes.A + codes.B + codes.C + codes.D;
  const typeCode = codes.E;
  const group = groups.find((g) => g.axes === animalCode.slice(0, 2));
  if (!group) throw new Error(`グループが見つかりません: ${animalCode}`);
  return { scores, animalCode, typeCode, fullCode: `${animalCode}-${typeCode}`, groupId: group.id };
}
