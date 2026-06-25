import { matchesCategory, photoMatches, subtagsForCategory } from '../lib/filter';

interface Card {
  el: HTMLElement;
  categories: string[];
  tags: string[];
}

let activeCategory = '';
const activeSubtags = new Set<string>();
let cards: Card[] = [];
let bar: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let titleBase = '';
let initialized = false;

function applyVisibility() {
  const subs = [...activeSubtags];
  cards.forEach(({ el, categories, tags }) => {
    const visible = matchesCategory(categories, activeCategory) && photoMatches(tags, subs);
    el.classList.toggle('is-hidden', !visible);
  });
  const anyVisible = cards.some(({ el }) => !el.classList.contains('is-hidden'));
  document.querySelector('[data-empty-filter]')?.classList.toggle('is-hidden', anyVisible);
}

function notifyFiltered() {
  document.dispatchEvent(new CustomEvent('gallery:filtered'));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// El título refleja la categoría activa: "Galería" (Todas) o "Galería Mar".
function updateTitle() {
  if (!titleEl) return;
  titleEl.textContent = activeCategory ? `${titleBase} ${capitalize(activeCategory)}` : titleBase;
}

function highlightCategory() {
  document.querySelectorAll<HTMLElement>('[data-category]').forEach((btn) => {
    const on = (btn.dataset.category ?? '') === activeCategory;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function highlightSubtags() {
  if (!bar) return;
  bar.querySelectorAll<HTMLElement>('.filter').forEach((btn) => {
    const tag = btn.dataset.tag ?? '';
    const on = tag === '' ? activeSubtags.size === 0 : activeSubtags.has(tag);
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function makeSubtagButton(tag: string, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'filter';
  btn.type = 'button';
  btn.dataset.tag = tag;
  btn.setAttribute('aria-pressed', 'false');
  btn.textContent = label;
  return btn;
}

function renderBar() {
  if (!bar) return;
  const subtags = subtagsForCategory(
    cards.map((c) => ({ categories: c.categories, tags: c.tags })),
    activeCategory,
  );
  bar.replaceChildren(
    makeSubtagButton('', 'Todas'),
    ...subtags.map((t) => makeSubtagButton(t, t)),
  );
  highlightSubtags();
}

export function setCategory(category: string) {
  activeCategory = category;
  activeSubtags.clear();
  renderBar();
  highlightCategory();
  updateTitle();
  applyVisibility();
  notifyFiltered();
}

export function toggleSubtag(tag: string) {
  if (tag === '') activeSubtags.clear();
  else if (activeSubtags.has(tag)) activeSubtags.delete(tag);
  else activeSubtags.add(tag);
  highlightSubtags();
  applyVisibility();
  notifyFiltered();
}

function init() {
  if (initialized) return; // el módulo se importa desde varios sitios; init una vez
  initialized = true;
  cards = Array.from(document.querySelectorAll<HTMLElement>('[data-card]')).map((el) => ({
    el,
    categories: (el.dataset.categories ?? '').split(' ').filter(Boolean),
    tags: (el.dataset.tags ?? '').split(' ').filter(Boolean),
  }));
  bar = document.querySelector<HTMLElement>('[data-filters]');
  titleEl = document.querySelector<HTMLElement>('.page__title');
  titleBase = titleEl?.textContent?.trim() ?? 'Galería';
  // Delegación: un solo listener sobrevive a los re-render de los botones.
  bar?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.filter');
    if (btn) toggleSubtag(btn.dataset.tag ?? '');
  });
  // Estado inicial (categoría "Todas" → todas las subetiquetas). Sin notificar:
  // el fade-in inicial lo gestiona su propio IntersectionObserver.
  renderBar();
  highlightCategory();
  applyVisibility();
}

init();
