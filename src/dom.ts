type Attr = string | boolean | ((e: Event) => void);
type Child = Node | string | null | undefined | false;

/**
 * 要素を作る小さなヘルパー。文字列は必ずテキストノードとして入れる（HTML として解釈しない）
 * - on〜 で始まる属性は addEventListener
 * - true は空の属性、false は付けない
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Attr> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (value !== false) {
      el.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** {name} を値で置きかえる */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in values ? String(values[name]) : m));
}
