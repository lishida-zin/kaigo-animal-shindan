import type { Answer, AxisId } from './types';

export interface SavedState {
  schemaVersion: 1;
  questionSetVersion: string;
  answers: Record<string, Answer>;
  currentIndex: number;
  /** ISO 文字列 */
  completedAt: string | null;
  growthAxis: AxisId | null;
}

export interface Store {
  get(): SavedState;
  update(patch: Partial<SavedState>): SavedState;
  reset(): SavedState;
}

const AXIS_IDS: readonly string[] = ['A', 'B', 'C', 'D', 'E'];

function initialState(questionSetVersion: string): SavedState {
  return { schemaVersion: 1, questionSetVersion, answers: {}, currentIndex: 0, completedAt: null, growthAxis: null };
}

function isValid(value: unknown, questionSetVersion: string): value is SavedState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || v.questionSetVersion !== questionSetVersion) return false;
  if (typeof v.answers !== 'object' || v.answers === null || Array.isArray(v.answers)) return false;
  const answersOk = Object.values(v.answers).every((a) => Number.isInteger(a) && (a as number) >= 1 && (a as number) <= 5);
  if (!answersOk) return false;
  if (!Number.isInteger(v.currentIndex) || (v.currentIndex as number) < 0) return false;
  if (v.completedAt !== null && typeof v.completedAt !== 'string') return false;
  if (v.growthAxis !== null && !AXIS_IDS.includes(v.growthAxis as string)) return false;
  return true;
}

/** localStorage が使えない端末（プライベートモードなど）では null */
export function defaultStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__kaigo_probe__';
    s.setItem(probe, probe);
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createStore(opts: { questionSetVersion: string; storage?: Storage | null; key?: string }): Store {
  const { questionSetVersion, storage = null, key = 'kaigo-doubutsu-shindan' } = opts;

  function load(): SavedState {
    try {
      const raw = storage?.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed, questionSetVersion)) return parsed;
      }
    } catch {
      // 壊れたデータは捨てて初期状態にする
    }
    return initialState(questionSetVersion);
  }

  // メモリ上の状態を正とし、保存はできるときだけ行う
  let state = load();

  function save(): void {
    try {
      storage?.setItem(key, JSON.stringify(state));
    } catch {
      // 保存できなくても、その場では使い続けられる
    }
  }

  return {
    get: () => state,
    update(patch) {
      state = { ...state, ...patch };
      save();
      return state;
    },
    reset() {
      state = initialState(questionSetVersion);
      try {
        storage?.removeItem(key);
      } catch {
        // 消せなくても、メモリ上は初期状態
      }
      return state;
    },
  };
}
