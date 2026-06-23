# Galería de fotos personal (Astro) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una galería de fotos personal estática en Astro: masonry minimalista, pie de foto en hover/tap, lightbox a pantalla completa y toggle de tema claro/oscuro, con las fotos gestionadas manualmente desde un archivo de datos.

**Architecture:** Sitio estático (SSG) de una sola página. Las fotos viven en `src/images/` y se describen en `src/data/photos.ts`; un resolutor (`src/lib/images.ts`) las convierte en metadatos de imagen optimizables por Astro — este resolutor es la única costura que cambiará el día que las imágenes se sirvan desde un servidor externo. La UI son componentes `.astro` con estilos scoped y pequeños scripts vanilla (sin frameworks ni islas).

**Tech Stack:** Astro 5, `astro:assets` (optimización de imágenes con sharp), TypeScript, Vitest (test del resolutor), CSS `columns` para el masonry, JS vanilla para interacción.

## Global Constraints

- **Prioridades, en orden:** estético, rápido, simple de mantener.
- **Sin CMS, sin backend, sin base de datos.** Salida 100% estática.
- **Sin frameworks de UI ni islas.** Solo Astro + CSS + scripts vanilla.
- **`alt` obligatorio** en cada imagen (accesibilidad).
- **Una sola página** (`src/pages/index.astro`).
- **Masonry con CSS `columns`** (sin JS para el layout); el orden de lectura no importa.
- **Imágenes optimizadas** en build (WebP/AVIF responsivos, `loading="lazy"`).
- **Costura de origen de imágenes:** todo cambio de "local → servidor externo" debe quedar contenido en `src/lib/images.ts` + `astro.config.mjs`. Los componentes no deben referenciar rutas de imagen directamente.
- **Añadir una foto** = soltar el archivo en `src/images/` + añadir una entrada en `src/data/photos.ts`.

---

## File Structure

```
package.json                 # deps y scripts (build, dev, test, gen:placeholders)
astro.config.mjs             # config Astro (vacía hoy; image.domains en el futuro)
tsconfig.json                # extiende astro/tsconfigs/strict
vitest.config.ts             # config de test
scripts/gen-placeholders.mjs # genera imágenes de muestra para desarrollo
src/
  data/photos.ts             # DATOS editables: array de { file, caption, alt }
  lib/images.ts              # resolutor (costura de origen de imágenes) + tipos
  lib/images.test.ts         # tests del resolutor
  images/                    # archivos de imagen (muestras de dev → fotos reales)
  components/
    PhotoGrid.astro          # contenedor masonry (CSS columns)
    PhotoCard.astro          # figura + imagen optimizada + pie de foto (hover)
    Lightbox.astro           # overlay pantalla completa + script de interacción
    ThemeToggle.astro        # botón claro/oscuro
  pages/index.astro          # única página; ensambla todo
  styles/global.css          # variables de tema + estilos base
```

**Decisiones de límites:** cada componente `.astro` tiene una responsabilidad y sus estilos scoped junto a su markup. La lógica de datos (resolutor) vive aislada de la UI y es la única parte con tests unitarios, porque es la única con lógica no trivial. Los scripts de interacción (tap, lightbox, tema) leen el DOM por atributos `data-*`, así que la UI y el comportamiento están desacoplados.

---

## Task 1: Scaffold del proyecto y configuración base

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/styles/global.css`
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: nada.
- Produces: proyecto Astro construible; `src/styles/global.css` define las variables de tema (`--bg`, `--fg`, `--muted`, `--overlay`, `--overlay-fg`, `--gap`, `--maxw`, `--font`) en `:root` y `:root.dark`, consumidas por todos los componentes posteriores.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "galeria-fotos",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "gen:placeholders": "node scripts/gen-placeholders.mjs"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "sharp": "^0.33.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Crear `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';

// Hoy: imágenes locales optimizadas por el servicio sharp por defecto.
// Migración futura a servidor externo: añadir aquí
//   image: { domains: ['mi-servidor.com'] }  // o remotePatterns
// y cambiar src/lib/images.ts para devolver URLs remotas.
export default defineConfig({});
```

- [ ] **Step 3: Crear `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Crear `.gitignore`**

```
dist/
node_modules/
.astro/
.DS_Store
*.log
```

- [ ] **Step 6: Crear `src/styles/global.css`**

```css
:root {
  --bg: #fafafa;
  --fg: #1a1a1a;
  --muted: #6b7280;
  --overlay: rgba(0, 0, 0, 0.45);
  --overlay-fg: #ffffff;
  --gap: 1rem;
  --maxw: 1400px;
  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

:root.dark {
  --bg: #0e0e0e;
  --fg: #ededed;
  --muted: #9ca3af;
  --overlay: rgba(0, 0, 0, 0.6);
  --overlay-fg: #ffffff;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s ease, color 0.3s ease;
}

.page {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 4rem) clamp(1rem, 3vw, 3rem);
}

.page__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: clamp(1.5rem, 4vw, 3rem);
}

.page__title {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 300;
  letter-spacing: 0.02em;
  margin: 0;
}

.empty {
  color: var(--muted);
  font-size: 0.95rem;
  padding: 4rem 0;
  text-align: center;
}
```

- [ ] **Step 7: Crear `src/pages/index.astro` (esqueleto mínimo)**

```astro
---
import '../styles/global.css';
---

<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Galería</title>
  </head>
  <body>
    <div class="page">
      <header class="page__header">
        <h1 class="page__title">Galería</h1>
      </header>
      <main>
        <p class="empty">Aún no hay fotos.</p>
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 8: Instalar dependencias**

Run: `npm install`
Expected: instala sin errores; se crea `node_modules/` y `package-lock.json`.

- [ ] **Step 9: Verificar que el build pasa**

Run: `npm run build`
Expected: termina con éxito; genera `dist/index.html` con el título "Galería" y el texto "Aún no hay fotos."

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts .gitignore src/styles/global.css src/pages/index.astro
git commit -m "chore: scaffold del proyecto Astro y estilos base"
```

---

## Task 2: Capa de datos y resolutor de imágenes (TDD)

**Files:**
- Create: `src/data/photos.ts`
- Create: `src/lib/images.ts`
- Create: `src/lib/images.test.ts`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - `interface Photo { file: string; caption: string; alt: string }`
  - `interface ResolvedPhoto { image: ImageMetadata; caption: string; alt: string }`
  - `function resolvePhotos(entries?: Photo[], imageMap?: Record<string, { default: ImageMetadata }>): ResolvedPhoto[]`
    — con argumentos por defecto `photos` y el glob de `src/images/`. Lanza si falta el archivo o si `alt` está vacío. Esta es la **costura** de origen de imágenes.

- [ ] **Step 1: Escribir el test que falla (`src/lib/images.test.ts`)**

```ts
import { describe, it, expect } from 'vitest';
import { resolvePhotos, type Photo } from './images';

// ImageMetadata falso suficiente para los tests.
const fakeImg = (src: string) => ({
  src,
  width: 100,
  height: 100,
  format: 'jpg' as const,
});

const map = {
  '../images/uno.jpg': { default: fakeImg('/uno.jpg') as any },
  '../images/dos.jpg': { default: fakeImg('/dos.jpg') as any },
};

describe('resolvePhotos', () => {
  it('empareja cada entrada con su imagen por nombre de archivo', () => {
    const entries: Photo[] = [
      { file: 'uno.jpg', caption: 'Primero', alt: 'Foto uno' },
      { file: 'dos.jpg', caption: 'Segundo', alt: 'Foto dos' },
    ];
    const result = resolvePhotos(entries, map);
    expect(result).toHaveLength(2);
    expect(result[0].image.src).toBe('/uno.jpg');
    expect(result[0].caption).toBe('Primero');
    expect(result[1].alt).toBe('Foto dos');
  });

  it('lanza si el archivo de imagen no existe', () => {
    const entries: Photo[] = [{ file: 'falta.jpg', caption: 'x', alt: 'y' }];
    expect(() => resolvePhotos(entries, map)).toThrow(/falta\.jpg/);
  });

  it('lanza si falta el texto alternativo', () => {
    const entries: Photo[] = [{ file: 'uno.jpg', caption: 'x', alt: '  ' }];
    expect(() => resolvePhotos(entries, map)).toThrow(/alt/i);
  });

  it('devuelve un array vacío si no hay entradas', () => {
    expect(resolvePhotos([], map)).toEqual([]);
  });
});
```

- [ ] **Step 2: Crear `src/data/photos.ts` (vacío de momento)**

```ts
import type { Photo } from '../lib/images';

// Añade aquí tus fotos: suelta el archivo en src/images/ y añade una entrada.
// El orden no importa (masonry por columnas).
export const photos: Photo[] = [];
```

- [ ] **Step 3: Crear `src/lib/images.ts`**

```ts
import type { ImageMetadata } from 'astro';
import { photos as defaultPhotos } from '../data/photos';

export interface Photo {
  /** Nombre del archivo en src/images/ (hoy) o URL remota (migración futura). */
  file: string;
  /** Pie de foto, 1-2 líneas. */
  caption: string;
  /** Texto alternativo, obligatorio. */
  alt: string;
}

export interface ResolvedPhoto {
  image: ImageMetadata;
  caption: string;
  alt: string;
}

// Costura de origen de imágenes. HOY: archivos locales optimizados por Astro.
// FUTURO (servidor externo): sustituir esta resolución por URLs remotas y
// declarar los dominios en astro.config.mjs. Los componentes no cambian.
const localImages = import.meta.glob<{ default: ImageMetadata }>(
  '../images/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

export function resolvePhotos(
  entries: Photo[] = defaultPhotos,
  imageMap: Record<string, { default: ImageMetadata }> = localImages,
): ResolvedPhoto[] {
  return entries.map((entry) => {
    if (!entry.alt || entry.alt.trim() === '') {
      throw new Error(`La foto "${entry.file}" no tiene texto alternativo (alt).`);
    }
    const key = Object.keys(imageMap).find((k) => k.endsWith(`/${entry.file}`));
    if (!key) {
      throw new Error(
        `No se encontró la imagen "${entry.file}" en src/images/. Revisa el nombre en src/data/photos.ts.`,
      );
    }
    return {
      image: imageMap[key].default,
      caption: entry.caption,
      alt: entry.alt,
    };
  });
}
```

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

Run: `npm test`
Expected: 4 tests PASS en `src/lib/images.test.ts`.

- [ ] **Step 5: Verificar que el build sigue pasando**

Run: `npm run build`
Expected: éxito (galería vacía, `photos` es `[]`).

- [ ] **Step 6: Commit**

```bash
git add src/data/photos.ts src/lib/images.ts src/lib/images.test.ts
git commit -m "feat: capa de datos y resolutor de imágenes con tests"
```

---

## Task 3: Imágenes de muestra para desarrollo

**Files:**
- Create: `scripts/gen-placeholders.mjs`
- Modify: `src/data/photos.ts` (poblar con las 5 entradas de muestra)

**Interfaces:**
- Consumes: tipo `Photo` de Task 2.
- Produces: 5 archivos en `src/images/` (`uno.jpg`…`cinco.jpg`) de proporciones variadas y `photos.ts` con 5 entradas, para que el grid tenga contenido real que renderizar y verificar. El usuario reemplazará estas muestras por sus fotos reales.

- [ ] **Step 1: Crear `scripts/gen-placeholders.mjs`**

```js
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = new URL('../src/images/', import.meta.url);
mkdirSync(dir, { recursive: true });

// [nombre, ancho, alto, color] — proporciones variadas para ver el masonry.
const specs = [
  ['uno.jpg', 800, 1100, '#cbd5e1'],
  ['dos.jpg', 1200, 800, '#fca5a5'],
  ['tres.jpg', 900, 900, '#a7f3d0'],
  ['cuatro.jpg', 800, 1300, '#fcd34d'],
  ['cinco.jpg', 1100, 800, '#c4b5fd'],
];

for (const [name, w, h, color] of specs) {
  const out = fileURLToPath(new URL(name, dir));
  await sharp({ create: { width: w, height: h, channels: 3, background: color } })
    .jpeg({ quality: 80 })
    .toFile(out);
  console.log('escrito', name);
}
```

- [ ] **Step 2: Generar las imágenes de muestra**

Run: `npm run gen:placeholders`
Expected: imprime "escrito uno.jpg" … "escrito cinco.jpg"; aparecen 5 `.jpg` en `src/images/`.

- [ ] **Step 3: Poblar `src/data/photos.ts` con las entradas de muestra**

```ts
import type { Photo } from '../lib/images';

// Añade aquí tus fotos: suelta el archivo en src/images/ y añade una entrada.
// El orden no importa (masonry por columnas).
// (Estas son muestras de desarrollo; reemplázalas por tus fotos reales.)
export const photos: Photo[] = [
  { file: 'uno.jpg', caption: 'El día que dejé de contar las olas.', alt: 'Muestra uno' },
  { file: 'dos.jpg', caption: 'Una calle que no llevaba a ninguna parte, y daba igual.', alt: 'Muestra dos' },
  { file: 'tres.jpg', caption: 'Aquí el tiempo iba más despacio.', alt: 'Muestra tres' },
  { file: 'cuatro.jpg', caption: 'No recuerdo el sitio, pero sí cómo me sentí.', alt: 'Muestra cuatro' },
  { file: 'cinco.jpg', caption: 'Luz de última hora, de las que se quedan.', alt: 'Muestra cinco' },
];
```

- [ ] **Step 4: Verificar que el build optimiza las 5 imágenes**

Run: `npm run build`
Expected: éxito; el resolutor empareja las 5 entradas sin lanzar.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-placeholders.mjs src/images src/data/photos.ts
git commit -m "chore: imágenes de muestra y datos para desarrollo"
```

---

## Task 4: Masonry — PhotoGrid y PhotoCard con pie de foto en hover

**Files:**
- Create: `src/components/PhotoCard.astro`
- Create: `src/components/PhotoGrid.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `resolvePhotos()` y `ResolvedPhoto` de Task 2.
- Produces:
  - `PhotoGrid` renderiza un contenedor `[data-grid]` (masonry CSS columns).
  - Cada `PhotoCard` renderiza un `<figure data-card data-index data-caption data-alt data-full>` con la imagen optimizada y el pie de foto. Los atributos `data-full` (URL de la imagen grande), `data-caption` y `data-alt` los consumirá el Lightbox en Task 5.

- [ ] **Step 1: Crear `src/components/PhotoCard.astro`**

```astro
---
import { Image, getImage } from 'astro:assets';
import type { ResolvedPhoto } from '../lib/images';

interface Props {
  photo: ResolvedPhoto;
  index: number;
}

const { photo, index } = Astro.props;

// Variante grande optimizada para el lightbox (su URL va en data-full).
const full = await getImage({ src: photo.image, width: 2000, format: 'webp' });
---

<figure
  class="card"
  data-card
  data-index={index}
  data-full={full.src}
  data-caption={photo.caption}
  data-alt={photo.alt}
>
  <Image
    src={photo.image}
    alt={photo.alt}
    widths={[320, 480, 640]}
    sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 320px"
    loading="lazy"
    class="card__img"
  />
  <figcaption class="card__caption">{photo.caption}</figcaption>
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

  /* Hover en desktop; .is-active lo activa por tap en táctil (Task 5). */
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

- [ ] **Step 2: Crear `src/components/PhotoGrid.astro`**

```astro
---
import PhotoCard from './PhotoCard.astro';
import type { ResolvedPhoto } from '../lib/images';

interface Props {
  photos: ResolvedPhoto[];
}

const { photos } = Astro.props;
---

{
  photos.length === 0 ? (
    <p class="empty">Aún no hay fotos.</p>
  ) : (
    <div class="grid" data-grid>
      {photos.map((photo, index) => (
        <PhotoCard photo={photo} index={index} />
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

- [ ] **Step 3: Conectar el grid en `src/pages/index.astro`**

```astro
---
import '../styles/global.css';
import PhotoGrid from '../components/PhotoGrid.astro';
import { resolvePhotos } from '../lib/images';

const photos = resolvePhotos();
---

<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Galería</title>
  </head>
  <body>
    <div class="page">
      <header class="page__header">
        <h1 class="page__title">Galería</h1>
      </header>
      <main>
        <PhotoGrid photos={photos} />
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 4: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected: build con éxito. En el navegador (URL que imprime `preview`): 5 fotos en columnas tipo masonry, proporciones respetadas, mucho espacio en blanco. Al pasar el cursor sobre una foto, se oscurece y aparece su pie de foto centrado con transición suave.

- [ ] **Step 5: Commit**

```bash
git add src/components/PhotoCard.astro src/components/PhotoGrid.astro src/pages/index.astro
git commit -m "feat: masonry con pie de foto en hover"
```

---

## Task 5: Lightbox e interacción (clic en desktop, tap en táctil, teclado)

**Files:**
- Create: `src/components/Lightbox.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: los `[data-card]` con `data-full`, `data-caption`, `data-alt`, `data-index` de Task 4, dentro de `[data-grid]`.
- Produces: un overlay `[data-lightbox]` con la imagen grande y su pie. Comportamiento:
  - **Desktop (hover):** clic en una foto abre el lightbox.
  - **Táctil (sin hover):** primer toque revela el pie (`.is-active`); segundo toque sobre la misma foto abre el lightbox; tocar fuera oculta el pie.
  - **Lightbox:** cerrar con ×, Esc o clic en el fondo; navegar con ‹ ›, flechas ← →; se bloquea el scroll del fondo mientras está abierto.

- [ ] **Step 1: Crear `src/components/Lightbox.astro`**

```astro
---
---

<div class="lb" data-lightbox aria-hidden="true">
  <button class="lb__btn lb__close" data-lb-close aria-label="Cerrar">&times;</button>
  <button class="lb__btn lb__prev" data-lb-prev aria-label="Anterior">&lsaquo;</button>
  <figure class="lb__figure">
    <img class="lb__img" data-lb-img alt="" />
    <figcaption class="lb__caption" data-lb-caption></figcaption>
  </figure>
  <button class="lb__btn lb__next" data-lb-next aria-label="Siguiente">&rsaquo;</button>
</div>

<style>
  .lb {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.92);
    padding: clamp(1rem, 4vw, 3rem);
  }

  .lb.open {
    display: flex;
  }

  .lb__figure {
    margin: 0;
    max-width: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .lb__img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 4px;
  }

  .lb__caption {
    color: #f3f4f6;
    font-size: 0.95rem;
    line-height: 1.4;
    text-align: center;
    max-width: 60ch;
    font-weight: 300;
  }

  .lb__btn {
    position: absolute;
    background: none;
    border: none;
    color: #f3f4f6;
    cursor: pointer;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  .lb__btn:hover {
    opacity: 1;
  }

  .lb__close {
    top: 1rem;
    right: 1.25rem;
    font-size: 2.5rem;
  }

  .lb__prev,
  .lb__next {
    top: 50%;
    transform: translateY(-50%);
    font-size: 3rem;
    padding: 0 1rem;
  }

  .lb__prev {
    left: 0.5rem;
  }

  .lb__next {
    right: 0.5rem;
  }
</style>

<script>
  const lb = document.querySelector<HTMLElement>('[data-lightbox]');
  const grid = document.querySelector<HTMLElement>('[data-grid]');
  if (lb && grid) {
    const img = lb.querySelector<HTMLImageElement>('[data-lb-img]')!;
    const cap = lb.querySelector<HTMLElement>('[data-lb-caption]')!;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-card]'));
    const canHover = window.matchMedia('(hover: hover)').matches;
    let index = -1;

    const show = (i: number) => {
      const card = cards[i];
      if (!card) return;
      index = i;
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
      index = -1;
    };

    const step = (delta: number) => {
      if (index < 0) return;
      show((index + delta + cards.length) % cards.length);
    };

    cards.forEach((card, i) => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (canHover) {
          show(i);
          return;
        }
        // Táctil: primer toque revela, segundo abre.
        if (card.classList.contains('is-active')) {
          show(i);
        } else {
          cards.forEach((c) => c.classList.remove('is-active'));
          card.classList.add('is-active');
        }
      });
    });

    // Tocar fuera de una foto oculta el pie revelado (táctil).
    document.addEventListener('click', () => {
      cards.forEach((c) => c.classList.remove('is-active'));
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
    // Clic en el fondo (no en la figura) cierra.
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

- [ ] **Step 2: Añadir el Lightbox a `src/pages/index.astro`**

Modifica el frontmatter para importar el componente:

```astro
---
import '../styles/global.css';
import PhotoGrid from '../components/PhotoGrid.astro';
import Lightbox from '../components/Lightbox.astro';
import { resolvePhotos } from '../lib/images';

const photos = resolvePhotos();
---
```

Y añade `<Lightbox />` justo antes de cerrar `</body>`, después de `</div>` de `.page`:

```astro
    </div>
    <Lightbox />
  </body>
</html>
```

- [ ] **Step 3: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected:
- Desktop: clic en una foto abre el overlay a pantalla completa con la imagen grande y su pie. ‹ › y flechas del teclado navegan entre fotos. ×, Esc o clic en el fondo cierran. El fondo no hace scroll mientras está abierto.
- Táctil (emular en DevTools, modo dispositivo): primer toque muestra el pie; segundo toque abre el lightbox; tocar fuera oculta el pie.

- [ ] **Step 4: Commit**

```bash
git add src/components/Lightbox.astro src/pages/index.astro
git commit -m "feat: lightbox a pantalla completa con navegación y tap en táctil"
```

---

## Task 6: Toggle de tema claro/oscuro (con persistencia y sin parpadeo)

**Files:**
- Create: `src/components/ThemeToggle.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: las variables de tema `:root` / `:root.dark` de `global.css` (Task 1).
- Produces: un botón `[data-theme-toggle]` que alterna la clase `dark` en `<html>` y persiste la elección en `localStorage` (clave `theme`). Un script inline en `<head>` aplica el tema antes del primer render para evitar el parpadeo (FOUC).

- [ ] **Step 1: Crear `src/components/ThemeToggle.astro`**

```astro
---
---

<button class="theme-toggle" data-theme-toggle type="button" aria-label="Cambiar tema">
  <span class="theme-toggle__icon" aria-hidden="true"></span>
</button>

<style>
  .theme-toggle {
    background: none;
    border: 1px solid var(--muted);
    border-radius: 999px;
    width: 2.25rem;
    height: 2.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg);
    opacity: 0.7;
    transition: opacity 0.2s ease, border-color 0.2s ease;
  }

  .theme-toggle:hover {
    opacity: 1;
  }

  .theme-toggle__icon::before {
    content: '\263E'; /* luna (modo claro: ofrece pasar a oscuro) */
    font-size: 1.1rem;
  }

  :global(:root.dark) .theme-toggle__icon::before {
    content: '\2600'; /* sol (modo oscuro: ofrece pasar a claro) */
  }
</style>

<script>
  const btn = document.querySelector('[data-theme-toggle]');
  btn?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
</script>
```

- [ ] **Step 2: Añadir el script anti-parpadeo y el botón en `src/pages/index.astro`**

En el `<head>`, **como primer elemento dentro de `<head>`** (antes del `<title>`), añade el script inline:

```astro
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script is:inline>
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    </script>
    <title>Galería</title>
  </head>
```

Importa el componente en el frontmatter:

```astro
---
import '../styles/global.css';
import PhotoGrid from '../components/PhotoGrid.astro';
import Lightbox from '../components/Lightbox.astro';
import ThemeToggle from '../components/ThemeToggle.astro';
import { resolvePhotos } from '../lib/images';

const photos = resolvePhotos();
---
```

Y colócalo en la cabecera, junto al título:

```astro
      <header class="page__header">
        <h1 class="page__title">Galería</h1>
        <ThemeToggle />
      </header>
```

- [ ] **Step 3: Verificar build y revisión visual**

Run: `npm run build && npm run preview`
Expected:
- El botón alterna entre claro y oscuro; el fondo, el texto y el overlay cambian con transición suave.
- Recargar la página mantiene el tema elegido (persistencia) y **no hay parpadeo** del tema claro antes de aplicar el oscuro.
- En un navegador con `prefers-color-scheme: dark` y sin elección previa, arranca en oscuro.

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeToggle.astro src/pages/index.astro
git commit -m "feat: toggle de tema claro/oscuro con persistencia y sin parpadeo"
```

---

## Verificación final (toda la galería)

- [ ] `npm test` → tests del resolutor en verde.
- [ ] `npm run build` → build sin errores; imágenes optimizadas en `dist/`.
- [ ] Revisión visual en `npm run preview`:
  - Masonry responsivo (redimensionar la ventana cambia el nº de columnas).
  - Hover (desktop) muestra el pie con transición suave.
  - Tap (táctil emulado): primer toque revela, segundo abre lightbox, tocar fuera oculta.
  - Lightbox: abrir, navegar ‹ › y con teclado, cerrar (×/Esc/fondo), sin scroll de fondo.
  - Toggle de tema: cambia, persiste al recargar, sin parpadeo.
- [ ] Sustituir las imágenes de muestra: el usuario suelta sus fotos en `src/images/` y edita `src/data/photos.ts`. Confirmar que un nombre de archivo erróneo hace fallar el build con un mensaje claro.

---

## Notas

- **Añadir una foto:** soltar el archivo en `src/images/` + añadir `{ file, caption, alt }` en `src/data/photos.ts`. Reconstruir.
- **Migración futura a servidor externo:** cambiar solo `src/lib/images.ts` (devolver URLs remotas en `resolvePhotos`) y declarar los dominios en `astro.config.mjs`. Componentes, datos y estilos no cambian.
