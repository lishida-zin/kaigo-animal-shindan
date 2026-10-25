import type { Answer, AxisId } from './types';

/** 前回の結果。新しく40問を答え終えたときにだけ置きかえる */
export type SavedResult = {
  answers: Record<string, Answer>;
  /** ISO 文字列 */
  completedAt: string;
}

export type SavedState = {
  schemaVersion: 2;
  questionSetVersion: string;
  /** いま答えている途中の答え */
  answers: Record<string, Answer>;
  currentIndex: number;
  result: SavedResult | null;
  growthAxis: AxisId | null;
}

export type Store = {
  get(): SavedState;
  update(patch: Partial<SavedState>): SavedState;
  reset(): SavedState;
}

const AXIS_IDS: readonly string[] = ['A', 'B', 'C', 'D', 'E'];

function initialState(questionSetVersion: string): SavedState {
  return { schemaVersion: 2, questionSetVersion, answers: {}, currentIndex: 0, result: null, growthAxis: null };
}

function isAnswers(value: unknown): value is Record<string, Answer> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((a) => Number.isInteger(a) && (a as number) >= 1 && (a as number) <= 5);
}

function isResult(value: unknown): value is SavedResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return isAnswers(r.answers) && typeof r.completedAt === 'string';
}

function isValid(value: unknown, questionSetVersion: string): value is SavedState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 2 || v.questionSetVersion !== questionSetVersion) return false;
  if (!isAnswers(v.answers)) return false;
  if (!Number.isInteger(v.currentIndex) || (v.currentIndex as number) < 0) return false;
  if (v.result !== null && !isResult(v.result)) return false;
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
