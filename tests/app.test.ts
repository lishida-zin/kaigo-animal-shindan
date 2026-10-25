// @vitest-environment jsdom
import { createApp } from '../src/app';
import { createStore, type SavedState } from '../src/storage';
import { questions, questionSetVersion, scaleLabels } from '../src/data';
import { FakeStorage, fakeClock, findButton } from './helpers';

function setup(opts: { storage?: Storage | null; state?: Partial<SavedState> } = {}) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const store = createStore({ questionSetVersion, storage: opts.storage ?? null });
  if (opts.state) store.update(opts.state);
  const clock = fakeClock();
  const app = createApp(root, { store, now: clock.now, confirm: () => true });
  return { root, store, clock, app };
}

function click(root: ParentNode, label: string) {
  const b = findButton(root, label);
  if (!b) throw new Error(`ボタンがありません: ${label}`);
  b.click();
}

const AGREE = scaleLabels[4]!; // そう思う

/** 「はじめる」を押し、画面が切りかわってからの連続タップ対策の時間を待つ */
function start(root: HTMLElement, clock: ReturnType<typeof fakeClock>) {
  click(root, 'はじめる');
  clock.advance(300);
}
const progressText = (root: HTMLElement) => root.querySelector('.progress-text')?.textContent;

describe('トップ', () => {
  test('注意書きが出る', () => {
    const { root } = setup();
    expect(root.textContent).toContain('正式な心理検査ではありません');
    expect(root.textContent).toContain('人事評価には使いません');
    expect(root.textContent).toContain('この端末の中だけ');
  });

  test('途中データが無ければ「はじめる」だけ', () => {
    const { root } = setup();
    const labels = [...root.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toEqual(['はじめる']);
  });

  test('途中データがあれば「つづきから」', () => {
    const { root } = setup({ state: { answers: { [questions[0]!.id]: 3 }, currentIndex: 1 } });
    expect(findButton(root, 'つづきから')).toBeDefined();
  });

  test('結果があれば「前回の結果を見る」', () => {
    const { root } = setup({ state: { completedAt: '2026-10-23T00:00:00.000Z' } });
    expect(findButton(root, '前回の結果を見る')).toBeDefined();
  });
});

describe('質問', () => {
  test('1問目と、5つの答えボタンが出る', () => {
    const { root } = setup();
    click(root, 'はじめる');
    expect(progressText(root)).toBe('1／40');
    expect(root.textContent).toContain(questions[0]!.text);
    const answerLabels = [...root.querySelectorAll('.answers button')].map((b) => b.textContent);
    expect([...answerLabels].sort()).toEqual([...scaleLabels].sort());
  });

  test('「そう思う」で次へ進み、答えが 5 で保存される', () => {
    const { root, store, clock } = setup();
    start(root, clock);
    click(root, AGREE);
    expect(progressText(root)).toBe('2／40');
    expect(store.get().answers[questions[0]!.id]).toBe(5);
  });

  test('「戻る」で前の問題に戻り、押した答えが選ばれた状態になる', () => {
    const { root, clock } = setup();
    start(root, clock);
    click(root, AGREE);
    clock.advance(500);
    click(root, '◀ 戻る');
    expect(progressText(root)).toBe('1／40');
    expect(findButton(root, AGREE)?.getAttribute('aria-pressed')).toBe('true');
  });

  test('300ms 未満の連続タップは、次の問題に答えを入れない', () => {
    const { root, store, clock } = setup();
    start(root, clock);
    click(root, AGREE);
    clock.advance(299);
    click(root, AGREE);
    expect(store.get().answers[questions[1]!.id]).toBeUndefined();
    expect(progressText(root)).toBe('2／40');
    clock.advance(1);
    click(root, AGREE);
    expect(store.get().answers[questions[1]!.id]).toBe(5);
  });

  test('「はじめる」から 300ms 未満の答えは入らない（ダブルタップ）', () => {
    const { root, store, clock } = setup();
    click(root, 'はじめる');
    clock.advance(299);
    click(root, AGREE);
    expect(store.get().answers[questions[0]!.id]).toBeUndefined();
    expect(progressText(root)).toBe('1／40');
  });

  test('「戻る」から 300ms 未満の「戻る」や答えは無視する（ダブルタップ）', () => {
    const { root, store, clock } = setup();
    start(root, clock);
    click(root, AGREE);
    clock.advance(300);
    click(root, AGREE);
    clock.advance(300);
    click(root, '◀ 戻る');
    expect(progressText(root)).toBe('2／40');
    clock.advance(100);
    click(root, '◀ 戻る');
    expect(progressText(root)).toBe('2／40');
    click(root, scaleLabels[0]!);
    expect(store.get().answers[questions[1]!.id]).toBe(5);
  });

  test('作り直しても「つづきから」で同じ問題から再開できる', () => {
    const storage = new FakeStorage();
    const answers = Object.fromEntries(questions.slice(0, 5).map((q) => [q.id, 3 as const]));
    createStore({ questionSetVersion, storage }).update({ answers, currentIndex: 5 });
    const { root } = setup({ storage });
    click(root, 'つづきから');
    expect(progressText(root)).toBe('6／40');
  });

  test('保存できない端末でも、40問答えると結果画面になり、終わった時刻が入る', () => {
    const { root, store, clock } = setup({ storage: null });
    start(root, clock);
    for (let i = 0; i < 40; i++) {
      click(root, AGREE);
      clock.advance(300);
    }
    expect(root.querySelector('[data-screen="result"]')).not.toBeNull();
    expect(store.get().completedAt).toBe(new Date(clock.now() - 300).toISOString());
  });
});
