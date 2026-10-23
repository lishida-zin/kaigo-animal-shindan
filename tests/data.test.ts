import { axes } from '../src/data';
import { checkCopy } from './copy';

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
