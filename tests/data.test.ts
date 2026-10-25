import { existsSync } from 'node:fs';
import { axes, animals, groups, questions, questionSetVersion } from '../src/data';
import { checkCopy } from './copy';
import ui from '../data/ui.json';

const sides = axes.flatMap((axis) => (['left', 'right'] as const).map((side) => ({ axis, side, def: axis[side] })));

describe('軸の文章（axes.json）', () => {
  test.each(sides.map((s) => [`${s.axis.id}-${s.def.label}`, s] as const))('%s：必要な欄がそろっている', (_, { def }) => {
    for (const text of [def.weakness, def.tip, def.strengthLead, def.scene, def.future,
      def.growth.day1, def.growth.month1, def.growth.month3, def.growth.goal]) {
      expect(text?.trim()).toBeTruthy();
    }
  });

  test.each(sides.map((s) => [`${s.axis.id}-${s.def.label}`, s] as const))('%s：のびしろは一文', (_, { def }) => {
    expect(def.weakness.endsWith('。')).toBe(true);
    expect(def.weakness.split('。').length).toBe(2);
  });

  test.each(sides.map((s) => [`${s.axis.id}-${s.def.label}`, s] as const))('%s：強みのほうが長い', (_, { def }) => {
    expect((def.strengthLead + def.scene + def.future).length).toBeGreaterThan(def.weakness.length);
  });

  test.each(sides.map((s) => [`${s.axis.id}-${s.def.label}`, s] as const))('%s：文章ルールを守っている', (_, { def }) => {
    const texts = [def.weakness, def.tip, def.strengthLead, def.scene, def.future, ...Object.values(def.growth),
      ...(def.typeSentence ? [def.typeSentence] : [])];
    expect(texts.flatMap(checkCopy)).toEqual([]);
  });

  test('5軸すべてにアイコン、E の左右に型の一文がある', () => {
    for (const axis of axes) expect(axis.icon?.trim()).toBeTruthy();
    const e = axes.find((a) => a.id === 'E')!;
    expect(e.left.typeSentence?.trim()).toBeTruthy();
    expect(e.right.typeSentence?.trim()).toBeTruthy();
  });
});

describe('checkCopy', () => {
  test('「短所」と50字をこえる文を見つける', () => {
    expect(checkCopy('短所があります。')).toHaveLength(1);
    expect(checkCopy('あ'.repeat(51) + '。')).toHaveLength(1);
    expect(checkCopy('「どう思う？」と聞いてみてください。')).toEqual([]);
  });
});

describe('質問（questions.json）', () => {
  test('40問・各軸8問・各軸で左向き4問と右向き4問', () => {
    expect(questions).toHaveLength(40);
    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      const own = questions.filter((q) => q.axis === id);
      expect(own).toHaveLength(8);
      expect(own.filter((q) => q.direction === 'left')).toHaveLength(4);
      expect(own.filter((q) => q.direction === 'right')).toHaveLength(4);
    }
  });

  test('id が重ならない', () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
  });

  test('となり合う2問が同じ軸にならない', () => {
    questions.slice(1).forEach((cur, i) => {
      const prev = questions[i]!;
      expect(cur.axis, `${prev.id} と ${cur.id}`).not.toBe(prev.axis);
    });
  });

  test('質問の文が文章ルールを守っている', () => {
    expect(questions.flatMap((q) => checkCopy(q.text))).toEqual([]);
  });

  test('質問の版は 1.0', () => {
    expect(questionSetVersion).toBe('1.0');
  });
});

describe('動物（animals.json）', () => {
  test('16匹で、A〜D の組み合わせ16通りをすべて含む', () => {
    expect(animals).toHaveLength(16);
    const expected: string[] = [];
    for (const a of 'LS') for (const b of 'TH') for (const c of 'PF') for (const d of 'KN') expected.push(a + b + c + d);
    expect(animals.map((x) => x.code).sort()).toEqual(expected.sort());
  });

  test.each(animals.map((a) => [a.name, a.leader.habit] as const))('%s：「△ クセ」は決めつけず「かもしれません。」で終わる', (_, habit) => {
    expect(habit).toMatch(/かもしれません。$/);
  });

  test.each(animals.map((a) => [a.name, a] as const))('%s：文章の欄がそろい、ルールを守っている', (_, a) => {
    const texts = [a.oneLiner, a.leader.strength, a.leader.habit, a.leader.hint,
      a.follower.strength, a.follower.instruction, a.follower.encouragement];
    for (const t of texts) expect(t?.trim()).toBeTruthy();
    expect(texts.flatMap(checkCopy)).toEqual([]);
  });

  test.each(animals.map((a) => [a.name, a] as const))('%s：入口のひとことは2文までで、のびしろを含まない', (_, a) => {
    expect(a.oneLiner.split(/(?<=[。！？])/).filter((s) => s.trim()).length).toBeLessThanOrEqual(2);
    const weaknesses = axes.slice(0, 4).map((axis, i) => (axis.left.code === a.code[i] ? axis.left : axis.right).weakness);
    for (const w of weaknesses) expect(a.oneLiner).not.toContain(w);
  });

  test('画像のファイル名は .webp', () => {
    for (const a of animals) expect(a.image).toMatch(/^[a-z]+\.webp$/);
  });

  test('グループに色の名前がある', () => {
    expect(Object.fromEntries(groups.map((g) => [g.id, g.colorName]))).toEqual({
      drive: 'coral', unite: 'yellow', craft: 'mint', care: 'lavender',
    });
  });
});

describe('画面の文字（ui.json）', () => {
  test('文章ルールを守っている', () => {
    const texts = [ui.appName, ui.lead, ui.notice.title, ...ui.notice.items, ...Object.values(ui.buttons), ui.confirmClear, ...Object.values(ui.result)];
    expect(texts.flatMap(checkCopy)).toEqual([]);
  });
});

describe('動物のイラスト（public/images/animals）', () => {
  test.each(animals.map((a) => [a.name, a.image] as const))('%s：%s がある', (_, image) => {
    expect(existsSync(`public/images/animals/${image}`)).toBe(true);
  });
});
