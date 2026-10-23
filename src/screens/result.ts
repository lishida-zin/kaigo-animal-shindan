import { fill, h } from '../dom';
import { axes, findAnimal, groups, ui } from '../data';
import type { AxisDef, SideDef } from '../data';
import type { Store } from '../storage';
import type { AxisId, AxisScore, Diagnosis } from '../types';

export type ResultContext = {
  diagnosis: Diagnosis;
  store: Store;
  onRetry(): void;
  onClear(): void;
};

const t = ui.result;

/** その人が寄っている側（バランス型でも side は決まっている） */
function sideOf(axis: AxisDef, score: AxisScore): SideDef {
  return axis[score.side];
}

function renderHero(diagnosis: Diagnosis): HTMLElement {
  const animal = findAnimal(diagnosis.animalCode);
  const group = groups.find((g) => g.id === diagnosis.groupId);
  const eAxis = axes.find((a) => a.id === 'E');
  const type = eAxis ? sideOf(eAxis, diagnosis.scores.E) : undefined;

  // 画像がまだ無いときは枠だけ残す
  const img = h('img', {
    src: `${import.meta.env.BASE_URL}images/animals/${animal.image}`,
    alt: fill(t.illustAlt, { name: animal.name }),
    width: '150',
    height: '150',
    onerror: () => img.remove(),
  });

  return h('section', { class: 'r-hero', 'data-section': 'hero' },
    h('div', { class: 'r-illust' }, img),
    h('div', {},
      group ? h('span', { class: 'r-group' }, group.name) : null,
      h('h1', { class: 'r-name', tabindex: '-1' }, type?.typeName ? `${animal.name}・${type.typeName}` : animal.name),
      h('div', {}, h('span', { class: 'r-catch' }, fill(t.catch, { catch: animal.catch }))),
      h('p', {}, animal.oneLiner),
      type?.typeSentence ? h('p', {}, type.typeSentence) : null,
    ),
  );
}

function renderAxes(diagnosis: Diagnosis): HTMLElement {
  const rows = axes.map((axis) => {
    const score = diagnosis.scores[axis.id];
    const dot = h('span', { class: 'axis-dot' });
    dot.style.setProperty('--pos', `${score.rightness}%`);
    const result = score.balanced
      ? t.balanced
      : fill(t.lean, { label: sideOf(axis, score).label, percent: score.percent });

    return h('div', { class: 'axis-row' },
      h('h3', {}, `${axis.icon} ${axis.name}`),
      h('div', { class: 'axis-labels' }, h('span', {}, axis.left.label), h('span', {}, axis.right.label)),
      h('div', { class: 'axis-bar', 'aria-hidden': 'true' }, h('span', { class: 'axis-mid' }), dot),
      h('div', { class: 'axis-result' }, result),
    );
  });
  return h('section', { 'data-section': 'axes' }, h('h2', {}, t.axesTitle), ...rows);
}

function renderCards(diagnosis: Diagnosis): HTMLElement {
  const cards = axes.map((axis) => {
    const side = sideOf(axis, diagnosis.scores[axis.id]);
    return h('article', { class: 'card' },
      h('h3', {}, `${axis.icon} ${fill(t.cardTitle, { axis: axis.name, side: side.label })}`),
      h('span', { class: 'tag' }, t.weakness),
      h('p', {}, side.weakness),
      h('span', { class: 'tag' }, t.tip),
      h('p', {}, side.tip),
      h('span', { class: 'tag tag-star' }, t.strength),
      h('p', {}, h('strong', {}, side.strengthLead)),
      h('p', {}, side.scene),
      h('p', {}, side.future),
    );
  });
  return h('section', { 'data-section': 'cards' }, h('h2', {}, t.cardsTitle), ...cards);
}

function renderRoles(diagnosis: Diagnosis): HTMLElement {
  const { leader, follower } = findAnimal(diagnosis.animalCode);
  return h('div', { class: 'r-pair' },
    h('section', { class: 'card', 'data-section': 'leader' },
      h('h2', {}, t.leaderTitle),
      h('span', { class: 'tag tag-star' }, t.leaderStrength),
      h('p', {}, leader.strength),
      h('span', { class: 'tag' }, t.habit),
      h('p', {}, leader.habit),
      h('span', { class: 'tag' }, t.hint),
      h('p', {}, leader.hint),
    ),
    h('section', { class: 'card', 'data-section': 'follower' },
      h('h2', {}, t.followerTitle),
      h('span', { class: 'tag tag-star' }, t.followerStrength),
      h('p', {}, follower.strength),
      h('span', { class: 'tag' }, t.instruction),
      h('p', {}, follower.instruction),
      h('span', { class: 'tag' }, t.encouragement),
      h('p', {}, follower.encouragement),
    ),
  );
}

function renderGrowth(diagnosis: Diagnosis, store: Store): HTMLElement {
  const body = h('div', {});

  function showSteps(id: AxisId | null): void {
    const axis = axes.find((a) => a.id === id);
    if (!axis) return body.replaceChildren();
    const g = sideOf(axis, diagnosis.scores[axis.id]).growth;
    body.replaceChildren(
      h('ol', { class: 'steps' },
        h('li', {}, h('span', { class: 'when' }, t.day1), g.day1),
        h('li', {}, h('span', { class: 'when' }, t.month1), g.month1),
        h('li', {}, h('span', { class: 'when' }, t.month3), g.month3),
      ),
      h('p', { class: 'goal' }, t.goal, h('br'), g.goal),
    );
  }

  const chips = axes.map((axis) =>
    h('button', {
      type: 'button',
      'aria-pressed': 'false',
      onclick: () => {
        store.update({ growthAxis: axis.id });
        select(axis.id);
      },
    }, axis.name),
  );

  function select(id: AxisId | null): void {
    chips.forEach((chip, i) => chip.setAttribute('aria-pressed', axes[i]?.id === id ? 'true' : 'false'));
    showSteps(id);
  }

  select(store.get().growthAxis);

  return h('section', { 'data-section': 'growth' },
    h('h2', {}, t.growthTitle),
    h('p', {}, t.growthLead),
    h('div', { class: 'chips' }, ...chips),
    body,
  );
}

export function renderResult(ctx: ResultContext): HTMLElement {
  const { diagnosis, store } = ctx;
  return h('section', { class: 'screen result', 'data-screen': 'result', 'data-group': diagnosis.groupId },
    h('div', { class: 'result-grid' },
      h('div', { class: 'col-a' }, renderHero(diagnosis), renderAxes(diagnosis)),
      h('div', { class: 'col-b' },
        renderCards(diagnosis),
        renderRoles(diagnosis),
        renderGrowth(diagnosis, store),
        h('div', { class: 'r-actions' },
          h('button', { type: 'button', onclick: ctx.onRetry }, ui.buttons.retry),
          h('button', { type: 'button', onclick: ctx.onClear }, ui.buttons.clear),
        ),
      ),
    ),
  );
}
