# Menú lateral de categorías + barra de subetiquetas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un menú lateral de categorías fijas (selección única, hover/tap) que, combinado con la barra de subetiquetas existente (multi-OR, dinámica por categoría), crea un filtrado de dos niveles sincronizado mediante un módulo de estado compartido.

**Architecture:** Cada foto gana un campo `category` además de `tags` (subetiquetas). La lógica pura se amplía en `src/lib/filter.ts` (testeable). Un módulo cliente único, `src/scripts/gallery-filter.ts`, mantiene el estado (`activeCategory` + `activeSubtags`), aplica visibilidad y coordina menú y barra. El menú y la barra son vistas de dos niveles distintos: elegir categoría resetea y repuebla la barra de subetiquetas.

**Tech Stack:** Astro 5 (`astro:content`), TypeScript, Vitest, JavaScript vanilla (sin librerías), CSS con variables de tema.

## Global Constraints

- **Prioridades, en orden:** estético, rápido, simple de mantener.
- **Sin librerías externas** (JS vanilla).
- **Filtrado de dos niveles:** una foto es visible si `matchesCategory(cats, activeCategory) && photoMatches(tags, [...activeSubtags])` — categoría (AND) Y subetiquetas (OR).
- **Categorías fijas** (minúscula en datos, capitalizadas al mostrar): `mar, montaña, casa, ciudad, naturaleza`, más "Todas" (`data-category=""`). Selección única, activa resaltada.
- **Barra de subetiquetas:** multi-OR; botones dinámicos según la categoría activa; "Todas" categoría → unión de todas las subetiquetas. Al cambiar de categoría se **resetean** las subetiquetas.
- **Menú:** oculto por defecto (`translateX(-100%)`); desktop hover sobre icono o panel; móvil/táctil tap; ☰ → ✕ al abrir; slide suave; respeta `prefers-reduced-motion`; usa variables de tema (`--bg`, `--fg`, `--muted`).
- **Sincronización** = el menú dirige la barra (no espejo 1:1). Estado en un único módulo compartido.
- **Mejora progresiva:** sin JS la galería se ve completa (fallback existente); el filtrado no se activa.

---

## File Structure

```
src/lib/filter.ts               # MOD: + matchesCategory, subtagsForCategory
src/lib/filter.test.ts          # MOD: + tests de las dos funciones nuevas
src/content.config.ts           # MOD: schema + category
src/content/photos/*.yaml       # MOD: + category, tags = subetiquetas
src/components/PhotoCard.astro   # MOD: + prop categories, + data-categories
src/components/PhotoGrid.astro   # MOD: pasa categories a PhotoCard
src/scripts/gallery-filter.ts   # NUEVO: estado compartido (categoría + subtags), única fuente de verdad
src/components/FilterBar.astro   # MOD: contenedor de subetiquetas (sin script propio; lo maneja el módulo)
src/components/SideMenu.astro    # NUEVO: hamburguesa + panel deslizante + script open/close + clic de categoría
src/pages/index.astro            # MOD: <SideMenu>, prop subtags, import del módulo, hueco para el icono
src/styles/global.css           # MOD: estilos del menú, hamburguesa→X, capitalize, reduced-motion
```

**Decisiones de límites:** la lógica pura (filtro) queda aislada y testeada en `filter.ts`. El módulo `gallery-filter.ts` concentra TODO el estado de cliente y la coordinación, de modo que `SideMenu` y `FilterBar` no se conocen entre sí: solo llaman a `setCategory`/`toggleSubtag` o exponen contenedores con atributos `data-*`.

---

## Task 1: Lógica de categorías (TDD)

**Files:**
- Modify: `src/lib/filter.ts`
- Modify: `src/lib/filter.test.ts`

**Interfaces:**
- Consumes: `uniqueTags` (existente).
- Produces:
  - `matchesCategory(photoCategories: string[], activeCategory: string): boolean` — `true` si `activeCategory === ''`, o si `photoCategories.includes(activeCategory)`.
  - `subtagsForCategory(photos: { categories: string[]; tags: string[] }[], activeCategory: string): string[]` — unión ordenada (sin duplicados) de las subetiquetas de las fotos cuya categoría coincide (todas si `''`).

- [ ] **Step 1: Añadir los tests que fallan al final de `src/lib/filter.test.ts`**

```ts
import { matchesCategory, subtagsForCategory } from './filter';

describe('matchesCategory', () => {
  it('"Todas" (vacío) muestra cualquier foto', () => {
    expect(matchesCategory(['mar'], '')).toBe(true);
    expect(matchesCategory([], '')).toBe(true);
  });

  it('coincide si la foto incluye la categoría activa', () => {
    expect(matchesCategory(['mar', 'naturaleza'], 'naturaleza')).toBe(true);
  });

  it('no coincide si la foto no incluye la categoría', () => {
    expect(matchesCategory(['casa'], 'mar')).toBe(false);
  });
});

describe('subtagsForCategory', () => {
  const photos = [
    { categories: ['mar', 'naturaleza'], tags: ['costa', 'atardecer'] },
    { categories: ['ciudad'], tags: ['calle', 'noche'] },
    { categories: ['montaña', 'naturaleza'], tags: ['bosque', 'niebla'] },
  ];

  it('"Todas" devuelve la unión ordenada de todas las subetiquetas', () => {
    expect(subtagsForCategory(photos, '')).toEqual([
      'atardecer', 'bosque', 'calle', 'costa', 'niebla', 'noche',
    ]);
  });

  it('filtra por categoría y une sus subetiquetas, ordenadas', () => {
    expect(subtagsForCategory(photos, 'naturaleza')).toEqual([
      'atardecer', 'bosque', 'costa', 'niebla',
    ]);
  });

  it('una categoría sin fotos devuelve []', () => {
    expect(subtagsForCategory(photos, 'casa')).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test`
Expected: FAIL — `matchesCategory` / `subtagsForCategory` no exportadas.

- [ ] **Step 3: Añadir las funciones al final de `src/lib/filter.ts`**

```ts
/**
 * ¿La foto pertenece a la categoría activa?
 * - "" ("Todas") → siempre verdadero.
 * - Si no → verdadero si la foto incluye esa categoría.
 */
export function matchesCategory(photoCategories: string[], activeCategory: string): boolean {
  if (activeCategory === '') return true;
  return photoCategories.includes(activeCategory);
}

/**
 * Subetiquetas disponibles para una categoría: unión ordenada y sin duplicados
 * de los `tags` de las fotos que pertenecen a esa categoría (todas si "").
 */
export function subtagsForCategory(
  photos: { categories: string[]; tags: string[] }[],
  activeCategory: string,
): string[] {
  const relevant = photos.filter((p) => matchesCategory(p.categories, activeCategory));
  return uniqueTags(relevant.map((p) => p.tags));
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test`
Expected: PASS — todos los tests de `filter.test.ts` en verde (los 6 previos + los nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter.ts src/lib/filter.test.ts
git commit -m "feat: lógica de categorías (matchesCategory, subtagsForCategory) con tests"
```

---

## Task 2: Modelo de datos — categorías en la colección y en las tarjetas

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/photos/uno.yaml` … `cinco.yaml`
- Modify: `src/components/PhotoCard.astro`
- Modify: `src/components/PhotoGrid.astro`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - Cada entrada de la colección tiene `entry.data.category` (`string[]`) además de `tags`.
  - `PhotoCard` acepta `categories: string[]` y renderiza `data-categories={categories.join(' ')}` en el `<figure>`.

- [ ] **Step 1: Añadir `category` al schema en `src/content.config.ts`**

En el objeto del schema, junto a `tags`, añade `category`:

```ts
    z.object({
      image: image(),
      caption: z.string(),
      alt: z.string().min(1),
      category: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
    }),
```

- [ ] **Step 2: Reescribir los 5 YAML con categorías y subetiquetas**

`src/content/photos/uno.yaml`:
```yaml
image: ./uno.jpg
caption: El día que dejé de contar las olas.
alt: Muestra uno
category: [mar, naturaleza]
tags: [costa, atardecer]
```

`src/content/photos/dos.yaml`:
```yaml
image: ./dos.jpg
caption: Una calle que no llevaba a ninguna parte, y daba igual.
alt: Muestra dos
category: [ciudad]
tags: [calle, noche]
```

`src/content/photos/tres.yaml`:
```yaml
image: ./tres.jpg
caption: Aquí el tiempo iba más despacio.
alt: Muestra tres
category: [montaña, naturaleza]
tags: [bosque, niebla]
```

`src/content/photos/cuatro.yaml`:
```yaml
image: ./cuatro.jpg
caption: No recuerdo el sitio, pero sí cómo me sentí.
alt: Muestra cuatro
category: [casa]
tags: [interior, ventana]
```

`src/content/photos/cinco.yaml`:
```yaml
image: ./cinco.jpg
caption: Luz de última hora, de las que se quedan.
alt: Muestra cinco
category: [mar, ciudad]
tags: [costa, puerto]
```

- [ ] **Step 3: Añadir la prop `categories` y `data-categories` en `src/components/PhotoCard.astro`**

Actualiza la interfaz `Props` y la desestructuración:

```ts
interface Props {
  image: ImageMetadata;
  caption: string;
  alt: string;
  categories: string[];
  tags: string[];
  index: number;
}

const { image, caption, alt, categories, tags, index } = Astro.props;
```

Y añade `data-categories` al `<figure>` (junto a `data-tags`):

```astro
<figure
  class="card"
  data-card
  data-index={index}
  data-categories={categories.join(' ')}
  data-tags={tags.join(' ')}
  data-full={full.src}
  data-caption={caption}
  data-alt={alt}
>
```

- [ ] **Step 4: Pasar `categories` desde `src/components/PhotoGrid.astro`**

En el `.map`, añade la prop `categories`:

```astro
      {photos.map((entry, index) => (
        <PhotoCard
          image={entry.data.image}
          caption={entry.data.caption}
          alt={entry.data.alt}
          categories={entry.data.category}
          tags={entry.data.tags}
          index={index}
        />
      ))}
```

- [ ] **Step 5: Verificar tests y build**

Run: `npm test`
Expected: PASS (sin cambios respecto a Task 1).

Run: `npm run build`
Expected: build con éxito; el schema valida `category` + `tags` en las 5 entradas. La barra de filtros existente ahora lista las subetiquetas (costa, atardecer, calle, noche, bosque, niebla, interior, ventana, puerto) y sigue filtrando (multi-OR). Las tarjetas llevan `data-categories`.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/content/photos src/components/PhotoCard.astro src/components/PhotoGrid.astro
git commit -m "feat: añadir categorías al modelo de datos y a las tarjetas"
```

---

## Task 3: Módulo de estado compartido y barra de subetiquetas dinámica

**Files:**
- Create: `src/scripts/gallery-filter.ts`
- Modify: `src/components/FilterBar.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `matchesCategory`, `photoMatches`, `subtagsForCategory` (Task 1); los `[data-card]` con `data-categories`/`data-tags` (Task 2); el contenedor `[data-filters]`; el evento `gallery:filtered` (lo escucha el fade-in existente).
- Produces:
  - Módulo `src/scripts/gallery-filter.ts` que exporta `setCategory(category: string)` y `toggleSubtag(tag: string)`. Al importarse, ejecuta su `init()` (lee tarjetas, cablea la barra por delegación, render inicial categoría "Todas", aplica visibilidad).
  - `FilterBar.astro` con `Props { subtags: string[] }`: solo el contenedor `[data-filters]` con el render inicial; sin script propio.

- [ ] **Step 1: Crear `src/scripts/gallery-filter.ts`**

```ts
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
```

- [ ] **Step 2: Reescribir `src/components/FilterBar.astro` (contenedor sin script)**

```astro
---
interface Props {
  subtags: string[];
}

const { subtags } = Astro.props;
---

{/* Barra de subetiquetas. Los botones se reconstruyen en cliente al cambiar
   de categoría (ver src/scripts/gallery-filter.ts). Render inicial = "Todas". */}
<div class="filters" data-filters role="group" aria-label="Filtrar por subetiqueta">
  <button class="filter is-active" data-tag="" type="button" aria-pressed="true">Todas</button>
  {subtags.map((tag) => (
    <button class="filter" data-tag={tag} type="button" aria-pressed="false">{tag}</button>
  ))}
</div>
```

- [ ] **Step 3: Actualizar `src/pages/index.astro` (prop `subtags` + import del módulo)**

En el frontmatter, renombra la variable de etiquetas a `subtags` (misma derivación):

```astro
---
import '../styles/global.css';
import { getCollection } from 'astro:content';
import FilterBar from '../components/FilterBar.astro';
import PhotoGrid from '../components/PhotoGrid.astro';
import Lightbox from '../components/Lightbox.astro';
import ThemeToggle from '../components/ThemeToggle.astro';
import { uniqueTags } from '../lib/filter';

const photos = await getCollection('photos');
const subtags = uniqueTags(photos.map((p) => p.data.tags));
---
```

Cambia el uso de `<FilterBar>`:

```astro
        <FilterBar subtags={subtags} />
```

Y añade, justo antes de `</body>`, un script que carga el módulo (después de `<Lightbox />`):

```astro
    <Lightbox />
    <script>
      import '../scripts/gallery-filter';
    </script>
  </body>
```

- [ ] **Step 4: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected:
- La barra muestra "Todas" + las subetiquetas (costa, atardecer, calle, noche, bosque, niebla, interior, ventana, puerto), ordenadas.
- Multi-OR sigue funcionando: activar varias subetiquetas muestra las fotos con al menos una; "Todas" resetea.
- Sin regresiones: fade-in al scroll y lightbox siguen funcionando.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/gallery-filter.ts src/components/FilterBar.astro src/pages/index.astro
git commit -m "refactor: barra de subetiquetas gobernada por un módulo de estado compartido"
```

---

## Task 4: Menú lateral de categorías

**Files:**
- Create: `src/components/SideMenu.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `setCategory` de `src/scripts/gallery-filter.ts` (Task 3); las variables de tema y el patrón `.filter` de `global.css`.
- Produces: el menú lateral funcional. `SideMenu` renderiza `[data-menu]` con `[data-menu-toggle]` (☰/✕) y `[data-menu-panel]` con un botón por categoría (`data-category`), incluido "Todas" (`data-category=""`).

- [ ] **Step 1: Crear `src/components/SideMenu.astro`**

```astro
---
interface Props {
  categories: string[];
}

const { categories } = Astro.props;
---

<div class="menu" data-menu>
  <button
    class="menu__toggle"
    data-menu-toggle
    type="button"
    aria-label="Abrir menú de categorías"
  >
    <span class="menu__bar"></span>
    <span class="menu__bar"></span>
    <span class="menu__bar"></span>
  </button>
  <nav class="menu__panel" data-menu-panel aria-label="Categorías">
    <button class="menu__item is-active" data-category="" type="button" aria-pressed="true">
      Todas
    </button>
    {categories.map((cat) => (
      <button class="menu__item" data-category={cat} type="button" aria-pressed="false">
        {cat}
      </button>
    ))}
  </nav>
</div>

<script>
  import { setCategory } from '../scripts/gallery-filter';

  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const toggle = menu?.querySelector<HTMLElement>('[data-menu-toggle]');
  const panel = menu?.querySelector<HTMLElement>('[data-menu-panel]');
  const canHover = window.matchMedia('(hover: hover)').matches;

  if (menu && toggle && panel) {
    // Clic en una categoría: fija el filtro (el módulo resetea/repobla la barra).
    panel.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-category]');
      if (!btn) return;
      setCategory(btn.dataset.category ?? '');
      if (!canHover) menu.classList.remove('is-open');
    });

    // En táctil (sin hover) el icono abre/cierra; tocar fuera cierra.
    if (!canHover) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('is-open');
      });
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target as Node)) menu.classList.remove('is-open');
      });
    }
  }
</script>
```

- [ ] **Step 2: Añadir los estilos del menú al final de `src/styles/global.css`**

```css
.menu__toggle {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 40;
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: var(--bg);
  border: 1px solid var(--muted);
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
}

.menu__bar {
  width: 1.1rem;
  height: 2px;
  background: var(--fg);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.menu__panel {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 220px;
  z-index: 35;
  background: var(--bg);
  border-right: 1px solid var(--muted);
  padding: 4.5rem 1rem 1rem;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Abierto: hover sobre icono o panel (desktop) o clase .is-open (táctil). */
.menu:hover .menu__panel,
.menu.is-open .menu__panel {
  transform: translateX(0);
}

/* Hamburguesa → X */
.menu:hover .menu__bar:nth-child(1),
.menu.is-open .menu__bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.menu:hover .menu__bar:nth-child(2),
.menu.is-open .menu__bar:nth-child(2) {
  opacity: 0;
}

.menu:hover .menu__bar:nth-child(3),
.menu.is-open .menu__bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.menu__item {
  background: none;
  border: none;
  text-align: left;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 300;
  color: var(--fg);
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.7;
  text-transform: capitalize;
  transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.menu__item:hover {
  opacity: 1;
}

.menu__item.is-active {
  opacity: 1;
  background: var(--fg);
  color: var(--bg);
}

/* Subetiquetas también capitalizadas, para que casen con las categorías. */
.filter {
  text-transform: capitalize;
}

/* Hueco para el icono fijo, que no choque con el título. */
.page__header {
  padding-left: 3rem;
}

@media (prefers-reduced-motion: reduce) {
  .menu__panel,
  .menu__bar {
    transition: none;
  }
}
```

- [ ] **Step 3: Renderizar `<SideMenu>` en `src/pages/index.astro`**

Añade el import y la lista fija de categorías en el frontmatter:

```astro
---
import '../styles/global.css';
import { getCollection } from 'astro:content';
import SideMenu from '../components/SideMenu.astro';
import FilterBar from '../components/FilterBar.astro';
import PhotoGrid from '../components/PhotoGrid.astro';
import Lightbox from '../components/Lightbox.astro';
import ThemeToggle from '../components/ThemeToggle.astro';
import { uniqueTags } from '../lib/filter';

const photos = await getCollection('photos');
const subtags = uniqueTags(photos.map((p) => p.data.tags));
const categories = ['mar', 'montaña', 'casa', 'ciudad', 'naturaleza'];
---
```

Coloca `<SideMenu>` como primer hijo del `<body>` (antes de `<div class="page">`):

```astro
  <body>
    <SideMenu categories={categories} />
    <div class="page">
```

- [ ] **Step 4: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected:
- Icono ☰ fijo arriba a la izquierda; el título "Galería" no queda tapado.
- *Desktop:* hover sobre el icono despliega el panel con slide; se mantiene al pasar al panel; al salir de ambos se oculta. El icono se transforma en ✕ mientras está abierto.
- Clic en una categoría (p. ej. "Naturaleza") filtra las fotos a esa categoría y **repuebla** la barra de arriba con sus subetiquetas (atardecer, bosque, costa, niebla); la categoría queda resaltada.
- Dentro de la categoría, las subetiquetas filtran en multi-OR; al cambiar de categoría se resetean.
- *Móvil (emulado):* tap en el icono abre/cierra; tap en una categoría filtra y cierra; tap fuera cierra.
- Tema claro/oscuro correcto; con `prefers-reduced-motion: reduce` el panel aparece/desaparece sin transición.

- [ ] **Step 5: Commit**

```bash
git add src/components/SideMenu.astro src/pages/index.astro src/styles/global.css
git commit -m "feat: menú lateral de categorías con hover/tap y filtrado de dos niveles"
```

---

## Verificación final

- [ ] `npm test` → todos los tests de `filter.test.ts` en verde (incluye matchesCategory y subtagsForCategory).
- [ ] `npm run build` → sin errores; schema valida `category` + `tags`.
- [ ] Revisión visual en `npm run preview`:
  - Menú: hover (desktop), tap (móvil), ☰→✕, slide, tema, reduced-motion.
  - Categoría repuebla y resetea la barra; "Todas" muestra todas las subetiquetas.
  - Filtro combinado categoría-AND-subtags (OR) correcto.
  - Lightbox respeta el conjunto visible; fade-in re-anima al filtrar.

---

## Notas

- **Añadir una foto:** soltar imagen + crear su `.yaml` con `category` (de la lista fija) y `tags` (subetiquetas libres). Reconstruir.
- **Añadir una categoría nueva:** añadirla al array `categories` en `index.astro` y usarla en los YAML. (Las categorías son fijas a propósito.)
- **Las subetiquetas** se derivan solas de los datos por categoría.
