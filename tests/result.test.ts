// @vitest-environment jsdom
import { renderResult } from '../src/screens/result';
import { createApp } from '../src/app';
import { createStore } from '../src/storage';
import { axes, questions, questionSetVersion } from '../src/data';
import type { AxisId, AxisScore, Diagnosis, Side } from '../src/types';
import { fakeClock, findButton } from './helpers';

function score(axis: AxisId, rightness: number, side: Side, percent: number, balanced: boolean): AxisScore {
  return { axis, rightness, side, percent, balanced };
}

const diagnosis: Diagnosis = {
  scores: {
    A: score('A', 28.125, 'left', 72, false),
    B: score('B', 40.625, 'left', 59, true),
    C: score('C', 70, 'right', 70, false),
    D: score('D', 20, 'left', 80, false),
    E: score('E', 30, 'left', 70, false),
  },
  animalCode: 'LTFK',
  typeCode: 'D',
  fullCode: 'LTFK-D',
  groupId: 'drive',
};

const axis = (id: AxisId) => axes.find((a) => a.id === id)!;

function render(growthAxis: AxisId | null = null) {
  const store = createStore({ questionSetVersion, storage: null });
  store.update({ growthAxis });
  const el = renderResult({ diagnosis, store, onRetry: () => {}, onClear: () => {} });
  document.body.replaceChildren(el);
  return { el, store };
}

test('部分の並びが 入口・かたむき・カード・リーダー・部下・成長ステップ の順', () => {
  const { el } = render();
  const order = [...el.querySelectorAll('[data-section]')].map((s) => s.getAttribute('data-section'));
  expect(order).toEqual(['hero', 'axes', 'cards', 'leader', 'follower', 'growth']);
});

test('グループの色の目じるしがつく', () => {
  const { el } = render();
  expect(el.getAttribute('data-group')).toBe('drive');
});

test('入口に、のびしろの文が出ない', () => {
  const { el } = render();
  const hero = el.querySelector('[data-section="hero"]')!.textContent ?? '';
  expect(hero).toContain('ライオン');
  expect(hero).toContain('どっしり型');
  for (const a of axes) {
    expect(hero).not.toContain(a.left.weakness);
    expect(hero).not.toContain(a.right.weakness);
  }
});

test('かたむきの行に、寄っている側の％・バランス型・アイコンが出る', () => {
  const { el } = render();
  const rows = [...el.querySelectorAll('.axis-row')];
  expect(rows).toHaveLength(5);
  expect(rows[0]!.textContent).toContain('引っぱる 寄り（72％）');
  expect(rows[1]!.textContent).toContain('◎ バランス型（どちらもできる）');
  rows.forEach((row, i) => expect(row.textContent).toContain(axes[i]!.icon));
});

test('カードは △気をつけたい → 〇やってみる → ★あなたの力 の順で、寄っている側の文章', () => {
  const { el } = render();
  const cards = [...el.querySelectorAll('[data-section="cards"] .card')];
  expect(cards).toHaveLength(5);
  const first = cards[0]!;
  expect([...first.querySelectorAll('.tag')].map((t) => t.textContent)).toEqual(['△ 気をつけたい', '〇 やってみる', '★ あなたの力']);
  expect(first.textContent).toContain(axis('A').left.weakness);
  expect(first.textContent).toContain(axis('A').left.scene);
  expect(cards[2]!.textContent).toContain(axis('C').right.strengthLead);
});

describe('成長ステップ', () => {
  const growth = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-section="growth"]')!;

  test('最初はどの軸も選ばれていない', () => {
    const { el } = render();
    expect(growth(el).querySelectorAll('button[aria-pressed="true"]')).toHaveLength(0);
    expect(growth(el).querySelector('.steps')).toBeNull();
  });

  test('「進め方」を押すと、寄っている側（臨機応変）の4つのステップが出て保存される', () => {
    const { el, store } = render();
    findButton(growth(el), '進め方')!.click();
    const text = growth(el).textContent ?? '';
    const g = axis('C').right.growth;
    for (const t of [g.day1, g.month1, g.month3, g.goal, '① 明日から', '② 1か月', '③ 3か月', '◎ 半年後の目標']) {
      expect(text).toContain(t);
    }
    expect(store.get().growthAxis).toBe('C');
    expect(findButton(growth(el), '進め方')!.getAttribute('aria-pressed')).toBe('true');
  });

  test('バランス型の軸を選んでも、寄っている側のステップが出る', () => {
    const { el } = render();
    findButton(growth(el), '見るところ')!.click();
    expect(growth(el).textContent).toContain(axis('B').left.growth.day1);
  });

  test('保存済みの軸は最初から選ばれている', () => {
    const { el } = render('D');
    expect(findButton(growth(el), '変化への姿勢')!.getAttribute('aria-pressed')).toBe('true');
    expect(growth(el).textContent).toContain(axis('D').left.growth.goal);
  });
});

describe('結果画面のボタン（アプリ全体で確認）', () => {
  function completedApp(confirmAnswer: boolean) {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const store = createStore({ questionSetVersion, storage: null });
    const answers = Object.fromEntries(questions.map((q) => [q.id, 3 as const]));
    store.update({ result: { answers, completedAt: '2026-10-23T00:00:00.000Z' } });
    const app = createApp(root, { store, now: fakeClock().now, confirm: () => confirmAnswer });
    app.show('result');
    return { root, store };
  }

  test('「結果を消す」で確認に「はい」なら、初期状態に戻ってトップへ', () => {
    const { root, store } = completedApp(true);
    findButton(root, '結果を消す')!.click();
    expect(store.get().result).toBeNull();
    expect(store.get().answers).toEqual({});
    expect(root.querySelector('[data-screen="top"]')).not.toBeNull();
  });

  test('「結果を消す」で確認に「いいえ」なら何もしない', () => {
    const { root, store } = completedApp(false);
    findButton(root, '結果を消す')!.click();
    expect(store.get().result).not.toBeNull();
    expect(root.querySelector('[data-screen="result"]')).not.toBeNull();
  });

  test('「もう一度やる」で1問目へ。前回の結果は新しい結果が出るまで残る', () => {
    const { root, store } = completedApp(true);
    findButton(root, 'もう一度やる')!.click();
    expect(store.get().answers).toEqual({});
    expect(store.get().result).not.toBeNull();
    expect(root.querySelector('.progress-text')?.textContent).toBe('1／40');
  });
});
