import { axes, balanceRange, groups, questions, ui } from './data';
import { diagnose, isComplete } from './scoring';
import type { Store } from './storage';
import type { Answer } from './types';
import { renderTop } from './screens/top';
import { renderQuiz } from './screens/quiz';
import { renderResult } from './screens/result';

export type Screen = 'top' | 'quiz' | 'result';

export type AppDeps = {
  store: Store;
  /** ミリ秒の時刻（テストでは手で進める時計を渡す） */
  now: () => number;
  confirm: (message: string) => boolean;
};

/** 連続タップを無視する時間（ミリ秒） */
const TAP_GUARD_MS = 300;

export function createApp(root: HTMLElement, deps: AppDeps): { show(screen: Screen): void } {
  const { store, now } = deps;
  let lastAnswerAt = Number.NEGATIVE_INFINITY;

  function mount(el: HTMLElement, focus?: HTMLElement | null): void {
    root.replaceChildren(el);
    document.documentElement.scrollTop = 0;
    focus?.focus();
  }

  function startFresh(): void {
    store.update({ answers: {}, currentIndex: 0, completedAt: null, growthAxis: null });
    show('quiz');
  }

  function showQuiz(): void {
    const state = store.get();
    const index = Math.min(Math.max(state.currentIndex, 0), questions.length - 1);
    const question = questions[index];
    if (!question) return show('top');

    const el = renderQuiz(
      { question, index, total: questions.length, selected: state.answers[question.id] },
      {
        onAnswer(value: Answer) {
          const t = now();
          if (t - lastAnswerAt < TAP_GUARD_MS) return;
          lastAnswerAt = t;
          const answers = { ...store.get().answers, [question.id]: value };
          if (index + 1 < questions.length) {
            store.update({ answers, currentIndex: index + 1 });
            show('quiz');
          } else {
            store.update({ answers, currentIndex: index, completedAt: new Date(t).toISOString() });
            show('result');
          }
        },
        onBack() {
          if (index === 0) return show('top');
          store.update({ currentIndex: index - 1 });
          show('quiz');
        },
      },
    );
    mount(el, el.querySelector<HTMLElement>('.question-text'));
  }

  function showResult(): void {
    const { answers } = store.get();
    if (!isComplete(questions, answers)) return show('top');
    const el = renderResult({
      diagnosis: diagnose(questions, answers, axes, groups, balanceRange),
      store,
      onRetry: startFresh,
      onClear() {
        if (!deps.confirm(ui.confirmClear)) return;
        store.reset();
        show('top');
      },
    });
    mount(el, el.querySelector<HTMLElement>('.r-name'));
  }

  function show(screen: Screen): void {
    if (screen === 'quiz') return showQuiz();
    if (screen === 'result') return showResult();
    mount(renderTop(store.get(), {
      onStart: startFresh,
      onResume: () => show('quiz'),
      onShowResult: () => show('result'),
    }));
  }

  show('top');
  return { show };
}
