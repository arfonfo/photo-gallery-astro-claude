# Filtros por etiquetas + animaciones de entrada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a la galería una barra de filtros por etiquetas (multi-selección OR) y animaciones fade-in escalonadas al hacer scroll, migrando los metadatos de las fotos a Astro Content Collections.

**Architecture:** Los metadatos pasan de `src/data/photos.ts` a una colección `photos` (Content Layer de Astro 5) con un archivo YAML por foto y su imagen co-localizada. La lógica de filtrado se aísla en un módulo puro testeable (`src/lib/filter.ts`) que consumen tanto la página (build) como el script de cliente. Tres comportamientos de cliente (filtro, fade-in con IntersectionObserver, lightbox) se coordinan vía clases CSS (`.is-hidden`, `.in`) y un evento de DOM (`gallery:filtered`).

**Tech Stack:** Astro 5.18 (`astro:content` + `glob` loader + helper `image()`), TypeScript, Vitest, Intersection Observer API nativa.

## Global Constraints

- **Prioridades, en orden:** estético, rápido, simple de mantener.
- **Sin librerías externas** para la animación (Intersection Observer nativo).
- **Filtro multi-selección OR:** varias etiquetas activas; se muestran las fotos con al menos una. Botón "Todas" resetea (sin activas → todas visibles).
- **Etiquetas derivadas** de la unión de los `tags` de la colección, ordenadas alfabéticamente. Sin lista codificada a mano.
- **Re-animan al filtrar:** las fotos que pasan a visibles repiten el fade-in escalonado.
- **Respeta `prefers-reduced-motion`:** si está activo, las fotos aparecen al instante sin animación.
- **Lightbox respeta el filtro:** ‹ › y flechas recorren solo las fotos visibles.
- **`alt` obligatorio** (validado en el schema).
- **Añadir una foto** = soltar imagen en `src/content/photos/` + crear su `.yaml` al lado.
- **Una sola página** (`src/pages/index.astro`).

---

## File Structure

```
src/content.config.ts            # NUEVO: colección 'photos' (glob loader + schema Zod con image())
src/content/photos/<id>.yaml     # NUEVO: 1 YAML por foto (image, caption, alt, tags)
src/content/photos/<id>.jpg      # imágenes co-localizadas (movidas desde src/images/)
src/lib/filter.ts                # NUEVO: uniqueTags(), photoMatches() — lógica pura
src/lib/filter.test.ts           # NUEVO: tests de la lógica de filtrado
src/components/FilterBar.astro   # NUEVO: botones de etiquetas + script de filtro
src/components/PhotoGrid.astro   # MOD: recibe CollectionEntry[]; script IO fade-in; mensaje vacío-filtro
src/components/PhotoCard.astro   # MOD: props desde la colección + data-tags
src/components/Lightbox.astro    # MOD: navegar solo sobre tarjetas visibles
src/pages/index.astro            # MOD: getCollection + uniqueTags + <FilterBar>
src/styles/global.css            # MOD: .is-hidden, estado fade-in, .filter, reduced-motion
scripts/gen-placeholders.mjs     # MOD: genera imágenes en src/content/photos/
(eliminar) src/data/photos.ts, src/lib/images.ts, src/lib/images.test.ts
```

**Decisiones de límites:** `filter.ts` aísla la lógica de negocio del DOM para poder testearla y reutilizarla (la importa el script de cliente). Cada comportamiento de cliente vive en el componente dueño de su markup y se comunica con los demás por un contrato de atributos `data-*` y un evento, sin acoplarse a la implementación interna del otro.

---

## Task 1: Lógica de filtrado (TDD)

**Files:**
- Create: `src/lib/filter.ts`
- Create: `src/lib/filter.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `function uniqueTags(photosTags: string[][]): string[]` — unión de todas las etiquetas, sin duplicados, ordenada alfabéticamente (`localeCompare`).
  - `function photoMatches(photoTags: string[], activeTags: string[]): boolean` — `true` si `activeTags` está vacío, o si comparten al menos una etiqueta (OR).

- [ ] **Step 1: Escribir el test que falla (`src/lib/filter.test.ts`)**

```ts
import { describe, it, expect } from 'vitest';
import { uniqueTags, photoMatches } from './filter';

describe('uniqueTags', () => {
  it('une todas las etiquetas sin duplicados y ordenadas', () => {
    const result = uniqueTags([['paisaje', 'mar'], ['calle'], ['paisaje']]);
    expect(result).toEqual(['calle', 'mar', 'paisaje']);
  });

  it('devuelve [] si no hay etiquetas', () => {
    expect(uniqueTags([[], []])).toEqual([]);
  });
});

describe('photoMatches', () => {
  it('muestra todas las fotos cuando no hay etiquetas activas', () => {
    expect(photoMatches(['paisaje'], [])).toBe(true);
    expect(photoMatches([], [])).toBe(true);
  });

  it('coincide si comparten al menos una etiqueta (OR)', () => {
    expect(photoMatches(['paisaje', 'mar'], ['calle', 'mar'])).toBe(true);
  });

  it('no coincide si no comparten ninguna', () => {
    expect(photoMatches(['retrato'], ['paisaje', 'mar'])).toBe(false);
  });

  it('una foto sin etiquetas no coincide con ningún filtro activo', () => {
    expect(photoMatches([], ['paisaje'])).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npm test`
Expected: FAIL — `filter.ts` no existe / funciones no definidas.

- [ ] **Step 3: Crear `src/lib/filter.ts`**

```ts
/** Unión ordenada de todas las etiquetas, sin duplicados. */
export function uniqueTags(photosTags: string[][]): string[] {
  const set = new Set<string>();
  for (const tags of photosTags) {
    for (const tag of tags) set.add(tag);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * ¿Debe verse esta foto con el filtro actual?
 * - Sin etiquetas activas ("Todas") → siempre visible.
 * - Con activas → visible si comparte AL MENOS una (OR).
 */
export function photoMatches(photoTags: string[], activeTags: string[]): boolean {
  if (activeTags.length === 0) return true;
  return photoTags.some((tag) => activeTags.includes(tag));
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npm test`
Expected: PASS — los tests de `filter.test.ts` en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter.ts src/lib/filter.test.ts
git commit -m "feat: lógica pura de filtrado por etiquetas con tests"
```

---

## Task 2: Migración de datos a Content Collections

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/photos/uno.yaml` … `cinco.yaml`
- Move: `src/images/*.jpg` → `src/content/photos/*.jpg`
- Modify: `src/components/PhotoCard.astro`
- Modify: `src/components/PhotoGrid.astro`
- Modify: `src/pages/index.astro`
- Modify: `scripts/gen-placeholders.mjs`
- Delete: `src/data/photos.ts`, `src/lib/images.ts`, `src/lib/images.test.ts`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - Colección `photos` accesible vía `getCollection('photos')`; cada entrada tiene `entry.data.image` (`ImageMetadata`), `entry.data.caption`, `entry.data.alt`, `entry.data.tags` (`string[]`), y `entry.id`.
  - `PhotoCard` acepta `Props { image: ImageMetadata; caption: string; alt: string; tags: string[]; index: number }` y renderiza un `<figure data-card data-tags="...">` con los mismos `data-full`/`data-caption`/`data-alt`/`data-index` que antes.

- [ ] **Step 1: Crear `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Costura de origen de imágenes. HOY: imágenes locales co-localizadas,
// optimizadas por Astro vía el helper image().
// FUTURO (servidor externo): cambiar `image: image()` por
// `image: z.string().url()` y declarar los dominios en astro.config.mjs
// (image.domains / remotePatterns).
const photos = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      caption: z.string(),
      alt: z.string().min(1),
      tags: z.array(z.string()).default([]),
    }),
});

export const collections = { photos };
```

- [ ] **Step 2: Mover las imágenes de muestra a la colección**

```bash
mkdir -p src/content/photos
git mv src/images/uno.jpg src/content/photos/uno.jpg
git mv src/images/dos.jpg src/content/photos/dos.jpg
git mv src/images/tres.jpg src/content/photos/tres.jpg
git mv src/images/cuatro.jpg src/content/photos/cuatro.jpg
git mv src/images/cinco.jpg src/content/photos/cinco.jpg
```

- [ ] **Step 3: Crear los 5 archivos YAML (un archivo por foto)**

`src/content/photos/uno.yaml`:
```yaml
image: ./uno.jpg
caption: El día que dejé de contar las olas.
alt: Muestra uno
tags: [paisaje, mar]
```

`src/content/photos/dos.yaml`:
```yaml
image: ./dos.jpg
caption: Una calle que no llevaba a ninguna parte, y daba igual.
alt: Muestra dos
tags: [calle]
```

`src/content/photos/tres.yaml`:
```yaml
image: ./tres.jpg
caption: Aquí el tiempo iba más despacio.
alt: Muestra tres
tags: [paisaje]
```

`src/content/photos/cuatro.yaml`:
```yaml
image: ./cuatro.jpg
caption: No recuerdo el sitio, pero sí cómo me sentí.
alt: Muestra cuatro
tags: [retrato]
```

`src/content/photos/cinco.yaml`:
```yaml
image: ./cinco.jpg
caption: Luz de última hora, de las que se quedan.
alt: Muestra cinco
tags: [paisaje, mar]
```

- [ ] **Step 4: Reescribir `src/components/PhotoCard.astro`**

```astro
---
import { Image, getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

interface Props {
  image: ImageMetadata;
  caption: string;
  alt: string;
  tags: string[];
  index: number;
}

const { image, caption, alt, tags, index } = Astro.props;

// Variante grande optimizada para el lightbox (su URL va en data-full).
const full = await getImage({ src: image, width: 2000, format: 'webp' });
---

<figure
  class="card"
  data-card
  data-index={index}
  data-tags={tags.join(' ')}
  data-full={full.src}
  data-caption={caption}
  data-alt={alt}
>
  <Image
    src={image}
    alt={alt}
    widths={[320, 480, 640]}
    sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 320px"
    loading="lazy"
    class="card__img"
  />
  <figcaption class="card__caption">{caption}</figcaption>
</figure>

<style>
  .card {
    position: relative;
    break-inside: avoid;
    margin: 0 0 var(--gap);
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    background: var(--bg);
  }

  .card__img {
    display: block;
    width: 100%;
    height: auto;
  }

  .card__caption {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1.25rem;
    margin: 0;
    color: var(--overlay-fg);
    background: var(--overlay);
    font-size: 0.95rem;
    line-height: 1.4;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  @media (hover: hover) {
    .card:hover .card__caption {
      opacity: 1;
    }
  }

  .card.is-active .card__caption {
    opacity: 1;
  }
</style>
```

- [ ] **Step 5: Reescribir `src/components/PhotoGrid.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import PhotoCard from './PhotoCard.astro';

interface Props {
  photos: CollectionEntry<'photos'>[];
}

const { photos } = Astro.props;
---

{
  photos.length === 0 ? (
    <p class="empty">Aún no hay fotos.</p>
  ) : (
    <div class="grid" data-grid>
      {photos.map((entry, index) => (
        <PhotoCard
          image={entry.data.image}
          caption={entry.data.caption}
          alt={entry.data.alt}
          tags={entry.data.tags}
          index={index}
        />
      ))}
    </div>
  )
}

<style>
  .grid {
    column-width: 320px;
    column-gap: var(--gap);
  }
</style>
```

- [ ] **Step 6: Actualizar `src/pages/index.astro`**

Reemplaza el frontmatter y el uso de `<PhotoGrid>`:

```astro
---
import '../styles/global.css';
import { getCollection } from 'astro:content';
import PhotoGrid from '../components/PhotoGrid.astro';
import Lightbox from '../components/Lightbox.astro';
import ThemeToggle from '../components/ThemeToggle.astro';

const photos = await getCollection('photos');
---
```

(El `<body>` no cambia en esta tarea: sigue con `<PhotoGrid photos={photos} />`, `<ThemeToggle />` y `<Lightbox />` tal como están.)

- [ ] **Step 7: Actualizar `scripts/gen-placeholders.mjs` (generar en la colección)**

Cambia la línea del directorio destino:

```js
const dir = new URL('../src/content/photos/', import.meta.url);
```

(El resto del script no cambia.)

- [ ] **Step 8: Eliminar los archivos de la capa de datos antigua**

```bash
git rm src/data/photos.ts src/lib/images.ts src/lib/images.test.ts
```

- [ ] **Step 9: Verificar tests y build**

Run: `npm test`
Expected: PASS — solo queda `src/lib/filter.test.ts` en verde (ya no existe `images.test.ts`).

Run: `npm run build`
Expected: build con éxito; la colección `photos` se lee, el schema valida las 5 entradas y las imágenes se optimizan. La galería renderiza las 5 fotos igual que antes.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: migrar metadatos de fotos a content collections"
```

---

## Task 3: Barra de filtros (multi-selección OR)

**Files:**
- Create: `src/components/FilterBar.astro`
- Modify: `src/components/PhotoGrid.astro` (mensaje de filtro vacío)
- Modify: `src/pages/index.astro` (calcular etiquetas + render `<FilterBar>`)
- Modify: `src/styles/global.css` (estilos `.filter`, `.is-hidden`)

**Interfaces:**
- Consumes: `uniqueTags`, `photoMatches` (Task 1); los `[data-card]` con `data-tags` (Task 2).
- Produces:
  - `FilterBar.astro` con `Props { tags: string[] }`. Renderiza, solo si hay etiquetas, un `[data-filters]` con un botón "Todas" (`data-tag=""`) y un botón por etiqueta (`data-tag="<tag>"`, `aria-pressed`).
  - Comportamiento: aplica `.is-hidden` a las tarjetas que no cumplen `photoMatches`, resalta los botones activos, muestra/oculta `[data-empty-filter]`, y emite el evento `document` `gallery:filtered`.

- [ ] **Step 1: Crear `src/components/FilterBar.astro`**

```astro
---
interface Props {
  tags: string[];
}

const { tags } = Astro.props;
---

{
  tags.length > 0 && (
    <div class="filters" data-filters role="group" aria-label="Filtrar por etiqueta">
      <button class="filter is-active" data-tag="" type="button" aria-pressed="true">
        Todas
      </button>
      {tags.map((tag) => (
        <button class="filter" data-tag={tag} type="button" aria-pressed="false">
          {tag}
        </button>
      ))}
    </div>
  )
}

<script>
  import { photoMatches } from '../lib/filter';

  const bar = document.querySelector<HTMLElement>('[data-filters]');
  if (bar) {
    const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('.filter'));
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-card]'));
    const emptyMsg = document.querySelector<HTMLElement>('[data-empty-filter]');
    const active = new Set<string>();

    const apply = () => {
      const activeTags = [...active];

      cards.forEach((card) => {
        const cardTags = (card.dataset.tags ?? '').split(' ').filter(Boolean);
        card.classList.toggle('is-hidden', !photoMatches(cardTags, activeTags));
      });

      buttons.forEach((btn) => {
        const tag = btn.dataset.tag ?? '';
        const on = tag === '' ? active.size === 0 : active.has(tag);
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });

      const anyVisible = cards.some((c) => !c.classList.contains('is-hidden'));
      emptyMsg?.classList.toggle('is-hidden', anyVisible);

      document.dispatchEvent(new CustomEvent('gallery:filtered'));
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag ?? '';
        if (tag === '') {
          active.clear();
        } else if (active.has(tag)) {
          active.delete(tag);
        } else {
          active.add(tag);
        }
        apply();
      });
    });
  }
</script>
```

- [ ] **Step 2: Añadir el mensaje de filtro vacío en `src/components/PhotoGrid.astro`**

Dentro de la rama `photos.length > 0`, justo después del `</div>` del `.grid`, añade el mensaje (oculto por defecto):

```astro
    <div class="grid" data-grid>
      {photos.map((entry, index) => (
        <PhotoCard
          image={entry.data.image}
          caption={entry.data.caption}
          alt={entry.data.alt}
          tags={entry.data.tags}
          index={index}
        />
      ))}
    </div>
    <p class="empty is-hidden" data-empty-filter>Ninguna foto con esas etiquetas.</p>
```

- [ ] **Step 3: Renderizar la barra en `src/pages/index.astro`**

Frontmatter — calcular las etiquetas:

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
const tags = uniqueTags(photos.map((p) => p.data.tags));
---
```

Y en el `<main>`, coloca `<FilterBar>` antes de `<PhotoGrid>`:

```astro
      <main>
        <FilterBar tags={tags} />
        <PhotoGrid photos={photos} />
      </main>
```

- [ ] **Step 4: Añadir estilos en `src/styles/global.css`**

Añade al final del archivo:

```css
.is-hidden {
  display: none;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}

.filter {
  background: none;
  border: 1px solid var(--muted);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 300;
  color: var(--fg);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.filter:hover {
  opacity: 1;
}

.filter.is-active {
  opacity: 1;
  background: var(--fg);
  border-color: var(--fg);
  color: var(--bg);
}
```

- [ ] **Step 5: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected:
- Aparece la barra con "Todas", "calle", "mar", "paisaje", "retrato" (orden alfabético).
- "Todas" arranca resaltada. Clic en "mar" muestra solo fotos con `mar` (uno, cinco) y resalta "mar"; clic en "paisaje" añade (OR) las de `paisaje` (uno, tres, cinco); ambos botones resaltados.
- Clic en "retrato" sola → solo `cuatro`. Combinar con una etiqueta sin solapamiento que deje 0 resultados muestra "Ninguna foto con esas etiquetas".
- "Todas" limpia la selección y muestra las 5.

- [ ] **Step 6: Commit**

```bash
git add src/components/FilterBar.astro src/components/PhotoGrid.astro src/pages/index.astro src/styles/global.css
git commit -m "feat: barra de filtros por etiquetas con multi-selección OR"
```

---

## Task 4: Animaciones de entrada (fade-in escalonado)

**Files:**
- Modify: `src/styles/global.css` (estado inicial + `.in` + reduced-motion)
- Modify: `src/components/PhotoGrid.astro` (script IntersectionObserver)
- Modify: `src/pages/index.astro` (fallback no-JS)

**Interfaces:**
- Consumes: los `[data-card]` y la clase `.is-hidden` (Task 3); el evento `gallery:filtered` (Task 3).
- Produces: comportamiento de fade-in. No expone API a otras tareas.

- [ ] **Step 1: Añadir el estado de animación en `src/styles/global.css`**

Añade al final del archivo:

```css
.card {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.card.in {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .card {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

- [ ] **Step 2: Añadir el fallback no-JS en `src/pages/index.astro`**

Dentro de `<head>`, después del `<title>`, añade:

```astro
    <title>Galería</title>
    <noscript><style>.card { opacity: 1; transform: none; }</style></noscript>
```

- [ ] **Step 3: Añadir el script de IntersectionObserver en `src/components/PhotoGrid.astro`**

Al final del archivo (después del bloque `<style>`), añade:

```astro
<script>
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-card]'));

  if (reduce) {
    cards.forEach((card) => card.classList.add('in'));
  } else {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        const appearing = entries.filter((e) => e.isIntersecting);
        appearing.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          // Escalonar las que entran juntas en este callback.
          el.style.transitionDelay = `${i * 70}ms`;
          el.classList.add('in');
          obs.unobserve(el);
        });
      },
      { threshold: 0.1 },
    );

    cards.forEach((card) => observer.observe(card));

    // Re-animar al filtrar: resetear las visibles y volver a observarlas.
    document.addEventListener('gallery:filtered', () => {
      const visible = cards.filter((c) => !c.classList.contains('is-hidden'));
      visible.forEach((c) => {
        c.classList.remove('in');
        c.style.transitionDelay = '';
      });
      // Forzar reflow para que el reset surta efecto antes de re-observar.
      void document.body.offsetHeight;
      visible.forEach((c) => observer.observe(c));
    });
  }
</script>
```

- [ ] **Step 4: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected:
- Al cargar y hacer scroll, las fotos arrancan invisibles/desplazadas y hacen fade-in al entrar en viewport, escalonadas (no todas a la vez).
- Al cambiar el filtro, las fotos resultantes repiten el fade-in escalonado.
- Emulando `prefers-reduced-motion: reduce` (DevTools › Rendering), las fotos aparecen al instante sin animación.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/components/PhotoGrid.astro src/pages/index.astro
git commit -m "feat: fade-in escalonado al scroll con re-animación al filtrar"
```

---

## Task 5: El lightbox respeta el filtro

**Files:**
- Modify: `src/components/Lightbox.astro` (script)

**Interfaces:**
- Consumes: los `[data-card]` con `data-full`/`data-caption`/`data-alt` (Task 2) y la clase `.is-hidden` (Task 3).
- Produces: navegación del lightbox limitada a las tarjetas visibles.

- [ ] **Step 1: Reescribir el `<script>` de `src/components/Lightbox.astro`**

Sustituye por completo el bloque `<script>` existente por:

```astro
<script>
  const lb = document.querySelector<HTMLElement>('[data-lightbox]');
  const grid = document.querySelector<HTMLElement>('[data-grid]');
  if (lb && grid) {
    const img = lb.querySelector<HTMLImageElement>('[data-lb-img]')!;
    const cap = lb.querySelector<HTMLElement>('[data-lb-caption]')!;
    const allCards = Array.from(grid.querySelectorAll<HTMLElement>('[data-card]'));
    const canHover = window.matchMedia('(hover: hover)').matches;
    let current: HTMLElement | null = null;

    // Solo las fotos visibles según el filtro activo.
    const visibleCards = () => allCards.filter((c) => !c.classList.contains('is-hidden'));

    const open = (card: HTMLElement) => {
      current = card;
      img.src = card.dataset.full ?? '';
      img.alt = card.dataset.alt ?? '';
      cap.textContent = card.dataset.caption ?? '';
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      current = null;
    };

    const step = (delta: number) => {
      if (!current) return;
      const vis = visibleCards();
      const idx = vis.indexOf(current);
      if (idx === -1) return;
      open(vis[(idx + delta + vis.length) % vis.length]);
    };

    allCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (canHover) {
          open(card);
          return;
        }
        // Táctil: primer toque revela, segundo abre.
        if (card.classList.contains('is-active')) {
          open(card);
        } else {
          allCards.forEach((c) => c.classList.remove('is-active'));
          card.classList.add('is-active');
        }
      });
    });

    // Tocar fuera de una foto oculta el pie revelado (táctil).
    document.addEventListener('click', () => {
      allCards.forEach((c) => c.classList.remove('is-active'));
    });

    lb.querySelector('[data-lb-close]')!.addEventListener('click', close);
    lb.querySelector('[data-lb-prev]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      step(-1);
    });
    lb.querySelector('[data-lb-next]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      step(1);
    });
    lb.addEventListener('click', (e) => {
      if (e.target === lb) close();
    });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
  }
</script>
```

- [ ] **Step 2: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected:
- Sin filtro: el lightbox abre y ‹ › recorren las 5 fotos.
- Con un filtro activo (p. ej. solo `paisaje`: uno, tres, cinco): abrir una y navegar ‹ › solo cicla entre esas tres, sin mostrar las ocultas.
- Cerrar (×/Esc/fondo) sigue funcionando; el tap en táctil (1er toque revela, 2º abre) sigue funcionando.

- [ ] **Step 3: Commit**

```bash
git add src/components/Lightbox.astro
git commit -m "feat: el lightbox navega solo sobre las fotos visibles del filtro"
```

---

## Verificación final

- [ ] `npm test` → `filter.test.ts` en verde.
- [ ] `npm run build` → sin errores; imágenes optimizadas desde la colección.
- [ ] Revisión visual en `npm run preview`:
  - Barra de filtros: orden alfabético, multi-OR, varias activas resaltadas, "Todas" resetea, mensaje de 0 resultados.
  - Fade-in escalonado al scroll; re-animación al filtrar; `prefers-reduced-motion` sin animación.
  - Lightbox recorre solo las fotos del filtro activo; cierre y tap intactos.
  - Modo claro/oscuro y masonry siguen funcionando.

---

## Notas

- **Añadir una foto:** soltar la imagen en `src/content/photos/` + crear su `.yaml` hermano (`image: ./archivo.jpg`, `caption`, `alt`, `tags`). Reconstruir. Las etiquetas nuevas aparecen solas en la barra.
- **Regenerar muestras de desarrollo:** `npm run gen:placeholders` (ahora escribe en `src/content/photos/`).
- **Migración futura a servidor externo:** cambiar en `src/content.config.ts` el `image: image()` por `image: z.string().url()` y declarar los dominios en `astro.config.mjs`.
