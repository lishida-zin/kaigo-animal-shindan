import { scoreAxis, isComplete, diagnose, IncompleteAnswersError } from '../src/scoring';
import { axes, groups, findAnimal } from '../src/data';
import type { Answer, AxisId, Question, Side } from '../src/types';

const range = [40, 60] as const;

function q(id: string, axis: AxisId, direction: Side): Question {
  return { id, axis, direction, text: id };
}

function answersFor(questions: Question[], values: number[]): Record<string, Answer> {
  return Object.fromEntries(questions.map((qq, i) => [qq.id, values[i] as Answer]));
}

describe('scoreAxis', () => {
  const eightRight = Array.from({ length: 8 }, (_, i) => q(`A${i}`, 'A', 'right'));

  test.each([
    // 答え8つ, rightness, side, percent, balanced
    [[5, 5, 5, 5, 5, 5, 5, 5], 100, 'right', 100, false],
    [[1, 1, 1, 1, 1, 1, 1, 1], 0, 'left', 100, false],
    [[1, 1, 1, 2, 3, 3, 3, 3], 28.125, 'left', 72, false],
    [[2, 2, 2, 3, 3, 3, 3, 3], 40.625, 'left', 59, true],
    [[2, 2, 2, 2, 3, 3, 3, 3], 37.5, 'left', 63, false],
    [[3, 3, 3, 3, 3, 3, 3, 3], 50, 'right', 50, true],
    [[3, 3, 3, 3, 3, 4, 4, 4], 59.375, 'right', 59, true],
    [[3, 3, 3, 3, 4, 4, 4, 4], 62.5, 'right', 63, false],
  ] as const)('答え %j → 右側寄り度 %d・%s・%d％・バランス型 %s', (ans, rightness, side, percent, balanced) => {
    const result = scoreAxis(eightRight, answersFor(eightRight, [...ans]), 'A', range);
    expect(result).toEqual({ axis: 'A', rightness, side, percent, balanced });
  });

  test('左向きの質問は 6 − 答え になる', () => {
    const qs = [q('L1', 'B', 'left')];
    expect(scoreAxis(qs, { L1: 5 }, 'B', range).rightness).toBe(0);
    expect(scoreAxis(qs, { L1: 1 }, 'B', range).rightness).toBe(100);
  });

  test('右4問・左4問の軸で全問「そう思う」なら右側寄り度 50・バランス型', () => {
    const qs = [
      ...Array.from({ length: 4 }, (_, i) => q(`R${i}`, 'C', 'right')),
      ...Array.from({ length: 4 }, (_, i) => q(`L${i}`, 'C', 'left')),
    ];
    const result = scoreAxis(qs, answersFor(qs, Array(8).fill(5)), 'C', range);
    expect(result.rightness).toBe(50);
    expect(result.balanced).toBe(true);
  });

  test('ほかの軸の質問は計算に入らない', () => {
    const qs = [q('A1', 'A', 'right'), q('B1', 'B', 'right')];
    expect(scoreAxis(qs, { A1: 5, B1: 1 }, 'A', range).rightness).toBe(100);
  });
});

describe('diagnose', () => {
  const ids: AxisId[] = ['A', 'B', 'C', 'D', 'E'];
  const qs = ids.map((axis) => q(`${axis}1`, axis, 'right'));

  test('A左・B左・C右・D左・E左 → ライオン・どっしり型（LTFK-D）', () => {
    const result = diagnose(qs, { A1: 1, B1: 1, C1: 5, D1: 1, E1: 1 }, axes, groups, range);
    expect(result.animalCode).toBe('LTFK');
    expect(result.typeCode).toBe('D');
    expect(result.fullCode).toBe('LTFK-D');
    expect(result.groupId).toBe('drive');
    expect(findAnimal(result.animalCode).name).toBe('ライオン');
  });

  test('全問「どちらともいえない」→ 全軸 50・SHFN-M・全軸バランス型', () => {
    const result = diagnose(qs, answersFor(qs, Array(5).fill(3)), axes, groups, range);
    expect(result.fullCode).toBe('SHFN-M');
    for (const id of ids) {
      expect(result.scores[id].rightness).toBe(50);
      expect(result.scores[id].balanced).toBe(true);
    }
  });

  test('未回答が1問でもあると結果を出さない', () => {
    expect(() => diagnose(qs, { A1: 1, B1: 1, C1: 5, D1: 1 }, axes, groups, range)).toThrow(IncompleteAnswersError);
  });
});

describe('isComplete', () => {
  const qs = [q('A1', 'A', 'right'), q('B1', 'B', 'left')];
  test('全問答えていれば true、1問でも抜けていれば false', () => {
    expect(isComplete(qs, { A1: 3, B1: 2 })).toBe(true);
    expect(isComplete(qs, { A1: 3 })).toBe(false);
  });
});

describe('findAnimal', () => {
  test('存在しないコードはエラー', () => {
    expect(() => findAnimal('XXXX')).toThrow();
  });
});
