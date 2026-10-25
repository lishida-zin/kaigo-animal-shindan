import { fill, h } from '../dom';
import { scaleLabels, ui } from '../data';
import type { Answer, Question } from '../types';

export type QuizView = {
  question: Question;
  index: number;
  total: number;
  selected: Answer | undefined;
};

export type QuizActions = {
  onAnswer(value: Answer): void;
  onBack(): void;
};

export function renderQuiz(view: QuizView, actions: QuizActions): HTMLElement {
  const { question, index, total, selected } = view;
  const progressText = fill(ui.quiz.progress, { n: index + 1, total });

  // 「そう思う」を上に並べる（値は 5 → 1）
  const values: Answer[] = [5, 4, 3, 2, 1];
  const answerButtons = values.map((value) =>
    h('li', {},
      h('button', {
        type: 'button',
        'aria-pressed': selected === value ? 'true' : 'false',
        onclick: () => actions.onAnswer(value),
      }, scaleLabels[value - 1] ?? String(value)),
    ),
  );

  const heading = h('h1', { class: 'question-text', tabindex: '-1' }, question.text);

  const section = h('section', { class: 'screen quiz', 'data-screen': 'quiz' },
    h('div', { class: 'progress-text', 'aria-hidden': 'true' }, progressText),
    h('progress', { class: 'progress', max: String(total), value: String(index + 1), 'aria-label': `${ui.quiz.progressLabel} ${progressText}` }),
    heading,
    h('ul', { class: 'answers' }, ...answerButtons),
    h('div', { class: 'quiz-nav' },
      h('button', { type: 'button', onclick: actions.onBack }, ui.buttons.back),
    ),
  );
  return section;
}
