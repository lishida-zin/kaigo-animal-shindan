import { h } from '../dom';
import { ui } from '../data';
import type { SavedState } from '../storage';

export type TopActions = {
  onStart(): void;
  onResume(): void;
  onShowResult(): void;
};

export function renderTop(state: SavedState, actions: TopActions): HTMLElement {
  const hasProgress = Object.keys(state.answers).length > 0;
  const hasResult = state.result !== null;

  const buttons: HTMLElement[] = [];
  if (hasProgress) {
    buttons.push(h('button', { type: 'button', class: 'btn-primary', onclick: actions.onResume }, ui.buttons.resume));
    buttons.push(h('button', { type: 'button', onclick: actions.onStart }, ui.buttons.restart));
    if (hasResult) buttons.push(h('button', { type: 'button', onclick: actions.onShowResult }, ui.buttons.showResult));
  } else if (hasResult) {
    buttons.push(h('button', { type: 'button', class: 'btn-primary', onclick: actions.onShowResult }, ui.buttons.showResult));
    buttons.push(h('button', { type: 'button', onclick: actions.onStart }, ui.buttons.retry));
  } else {
    buttons.push(h('button', { type: 'button', class: 'btn-primary', onclick: actions.onStart }, ui.buttons.start));
  }

  return h('section', { class: 'screen top', 'data-screen': 'top' },
    h('h1', {}, ui.appName),
    h('p', {}, ui.lead),
    h('div', { class: 'notice', role: 'note' },
      h('h2', { class: 'ui' }, ui.notice.title),
      ...ui.notice.items.map((item) => h('p', {}, item)),
    ),
    h('div', { class: 'top-actions' }, ...buttons),
  );
}
