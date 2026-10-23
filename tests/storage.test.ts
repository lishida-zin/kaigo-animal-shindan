import { createStore } from '../src/storage';

const KEY = 'kaigo-doubutsu-shindan';

class FakeStorage implements Storage {
  map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, v); }
}

class FullStorage extends FakeStorage {
  setItem(): void { throw new Error('QuotaExceededError'); }
}

test('保存した内容を、新しく作った store で読み戻せる', () => {
  const storage = new FakeStorage();
  createStore({ questionSetVersion: '1.0', storage }).update({ answers: { A01: 5 }, currentIndex: 1, growthAxis: 'C' });
  const state = createStore({ questionSetVersion: '1.0', storage }).get();
  expect(state.answers).toEqual({ A01: 5 });
  expect(state.currentIndex).toBe(1);
  expect(state.growthAxis).toBe('C');
});

test('保存値が壊れた JSON なら初期状態', () => {
  const storage = new FakeStorage();
  storage.setItem(KEY, '{こわれた');
  const state = createStore({ questionSetVersion: '1.0', storage }).get();
  expect(state.answers).toEqual({});
  expect(state.currentIndex).toBe(0);
  expect(state.completedAt).toBeNull();
});

test('質問の版が違えば初期状態に戻り、古い答えは残らない', () => {
  const storage = new FakeStorage();
  createStore({ questionSetVersion: '0.1', storage }).update({ answers: { A01: 5 }, currentIndex: 3 });
  const state = createStore({ questionSetVersion: '1.0', storage }).get();
  expect(state.answers).toEqual({});
  expect(state.currentIndex).toBe(0);
  expect(state.questionSetVersion).toBe('1.0');
});

test('答えに 1〜5 以外の値が入っていれば初期状態', () => {
  const storage = new FakeStorage();
  storage.setItem(KEY, JSON.stringify({
    schemaVersion: 1, questionSetVersion: '1.0', answers: { A01: 7 }, currentIndex: 1, completedAt: null, growthAxis: null,
  }));
  expect(createStore({ questionSetVersion: '1.0', storage }).get().answers).toEqual({});
});

test('保存できない Storage でも update は例外を出さず、get には反映される', () => {
  const store = createStore({ questionSetVersion: '1.0', storage: new FullStorage() });
  expect(() => store.update({ answers: { A01: 2 } })).not.toThrow();
  expect(store.get().answers).toEqual({ A01: 2 });
});

test('storage が null でも update / get / reset が動く', () => {
  const store = createStore({ questionSetVersion: '1.0', storage: null });
  store.update({ currentIndex: 4 });
  expect(store.get().currentIndex).toBe(4);
  expect(store.reset().currentIndex).toBe(0);
});

test('reset で key が Storage から消える', () => {
  const storage = new FakeStorage();
  const store = createStore({ questionSetVersion: '1.0', storage });
  store.update({ answers: { A01: 3 } });
  store.reset();
  expect(storage.getItem(KEY)).toBeNull();
});
