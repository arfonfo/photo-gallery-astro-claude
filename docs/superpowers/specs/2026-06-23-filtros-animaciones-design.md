# Filtros por etiquetas + animaciones de entrada — Diseño

**Fecha:** 2026-06-23
**Estado:** Aprobado (pendiente de revisión final del usuario)
**Parte de:** Galería de fotos personal (Astro) — ver `2026-06-23-galeria-fotos-design.md`

## Objetivo

Añadir a la galería existente dos mejoras visuales:

1. **Barra de filtros por etiquetas:** cada foto admite una o varias etiquetas; al
   hacer clic en ellas se filtran las fotos visibles. Multi-selección OR, con las
   etiquetas activas resaltadas y un botón "Todas" para resetear.
2. **Animaciones de entrada:** las fotos hacen un fade-in escalonado al entrar en
   el viewport, usando la Intersection Observer API (sin librerías).

Como parte del trabajo se migran los metadatos de las fotos a **Astro Content
Collections** (Content Layer de Astro 5) con frontmatter YAML.

**Prioridades, en orden (heredadas):** estético, rápido, simple de mantener.

## Requisitos

### Funcionales
- **Metadatos en Content Collections:** cada foto se describe en un archivo YAML
  con `image`, `caption`, `alt` y `tags`.
- **Barra de filtros** encima de la galería:
  - Las etiquetas mostradas se **derivan** de la unión de todos los `tags` de la
    colección, ordenadas alfabéticamente. No hay lista codificada a mano.
  - Botón **"Todas"** que resetea (sin etiquetas activas → se muestran todas).
  - **Multi-selección OR:** se pueden activar varias etiquetas; se muestran las
    fotos que tengan **al menos una** de las activas.
  - Las etiquetas activas están **resaltadas** (clase activa + `aria-pressed`).
- **Animaciones de entrada (fade-in):**
  - Cada foto arranca invisible y desplazada hacia abajo; al entrar en el
    viewport se anima a visible y en su sitio, con transición suave.
  - **Escalonado:** las fotos que entran juntas se animan con un retardo
    incremental, no todas a la vez.
  - **Re-animan al filtrar:** al cambiar el filtro, las fotos que pasan a ser
    visibles repiten el fade-in escalonado.
  - Respeta `prefers-reduced-motion`: si está activo, las fotos aparecen al
    instante sin animación.
- **Lightbox respeta el filtro:** la navegación ‹ › y las flechas solo recorren
  las fotos actualmente visibles (las del filtro activo).

### No funcionales
- Sin librerías externas para la animación (Intersection Observer nativo).
- Mantener las prioridades del proyecto: estético, rápido, simple de mantener.
- Mantenimiento simple: añadir una foto = soltar imagen + crear su YAML al lado.

### Fuera de alcance (YAGNI)
- Multi-selección AND, búsqueda de texto, ordenación, paginación.
- Conteo de fotos por etiqueta en los botones.
- Animaciones de salida al ocultar (las ocultas simplemente desaparecen).
- URL/deep-linking del estado del filtro.

## Arquitectura

Se mantiene el sitio estático (SSG) de una sola página. El cambio principal es la
capa de datos (de archivo TS a Content Collection) y la incorporación de tres
comportamientos de cliente coordinados por clases CSS y un evento de DOM.

### Capa de datos — Content Collections

- **`src/content.config.ts`** (NUEVO): define la colección `photos` con el loader
  `glob()` y un schema Zod:
  ```ts
  import { defineCollection, z } from 'astro:content';
  import { glob } from 'astro/loaders';

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
- **`src/content/photos/*.yaml`** (NUEVO): un archivo por foto, con su imagen
  hermana co-localizada en la misma carpeta:
  ```yaml
  image: ./uno.jpg
  caption: El día que dejé de contar las olas.
  alt: Muestra uno
  tags: [paisaje, mar]
  ```
- **Se eliminan:** `src/data/photos.ts`, `src/lib/images.ts`,
  `src/lib/images.test.ts`. La página usa `getCollection('photos')`.
- **Costura futura a servidor externo:** pasa a estar en el schema. Para servir
  imágenes remotas: usar `image: z.string().url()` en lugar de `image()` y
  declarar `image.domains`/`remotePatterns` en `astro.config.mjs`. Documentado en
  un comentario de `content.config.ts`.

### Lógica de filtrado (testeable, aislada del DOM)

- **`src/lib/filter.ts`** (NUEVO): funciones puras, sin dependencias del DOM:
  - `uniqueTags(photosTags: string[][]): string[]` — unión ordenada de todas las
    etiquetas.
  - `photoMatches(photoTags: string[], activeTags: string[]): boolean` — `true`
    si `activeTags` está vacío ( "Todas") o si comparten al menos una etiqueta
    (OR).
- Esto separa la lógica de negocio (testeable) del script de cliente que solo la
  cablea al DOM.

### Componentes

- **`FilterBar.astro`** (NUEVO):
  - Recibe la lista de etiquetas únicas (calculada con `uniqueTags`).
  - Renderiza un botón "Todas" + un botón por etiqueta, cada uno con
    `data-tag="<etiqueta>"` y `aria-pressed="false"`.
  - Incluye el script de filtro (ver "Comportamiento de cliente").
- **`PhotoCard.astro`** (MOD): añade `data-tags="paisaje mar"` (etiquetas
  separadas por espacio) al `<figure>` y el estado inicial del fade-in (clase
  base que define `opacity:0; translateY(...)`).
- **`PhotoGrid.astro`** (MOD): recibe las entradas de la colección; aloja el
  script del IntersectionObserver para el fade-in.
- **`Lightbox.astro`** (MOD): recalcula la lista de tarjetas visibles
  (`[data-card]:not(.is-hidden)`) al abrir y al navegar.
- **`index.astro`** (MOD): `getCollection('photos')`, calcula etiquetas con
  `uniqueTags`, renderiza `<FilterBar>` sobre `<PhotoGrid>`.

### Comportamiento de cliente (coordinación)

Tres responsabilidades, desacopladas vía clases CSS + un evento de DOM:

1. **Filtro** (script en `FilterBar.astro`): mantiene el conjunto de etiquetas
   activas. Al hacer clic en una etiqueta la alterna; "Todas" limpia el conjunto.
   Aplica `.is-hidden` (`display:none`) a las tarjetas que no cumplen
   `photoMatches`, actualiza el resaltado/`aria-pressed`, y emite un evento
   `gallery:filtered` en `document`.
2. **Fade-in** (script en `PhotoGrid.astro`): un `IntersectionObserver` observa
   las tarjetas; cuando entran en viewport les añade `.in`. Las entradas que
   cruzan juntas en un mismo callback se escalonan por su orden en el lote
   (retardo incremental, p. ej. 70 ms). Al recibir `gallery:filtered`, quita
   `.in` de las tarjetas visibles y las vuelve a observar para re-animar. Si
   `prefers-reduced-motion` está activo, no anima (las tarjetas quedan visibles).
3. **Lightbox** (script en `Lightbox.astro`): al abrir y al navegar, calcula la
   lista de visibles, de modo que ‹ › y las flechas respetan el filtro.

### Estilos (`global.css`, MOD)

- `.is-hidden { display: none; }`
- Estado inicial del fade-in en la tarjeta: `opacity: 0;
  transform: translateY(12px); transition: opacity .5s ease, transform .5s ease;`
- `.card.in { opacity: 1; transform: none; }`
- `@media (prefers-reduced-motion: reduce)`: las tarjetas se muestran visibles sin
  transición.
- Estilos de la barra de filtros (botones, estado activo resaltado).

## Flujo de datos

1. **Build:** `getCollection('photos')` lee los YAML; el schema valida y `image()`
   resuelve+optimiza cada imagen. `uniqueTags` calcula las etiquetas de la barra.
2. **Runtime:** HTML estático. El script de filtro alterna visibilidad y emite
   eventos; el de fade-in anima vía IntersectionObserver; el lightbox lee el
   estado de visibilidad. Sin peticiones de datos en cliente.

## Casos límite y errores

- Foto sin `tags`: no aparece bajo ninguna etiqueta concreta; sí con "Todas".
- Filtro sin resultados: se muestra un mensaje sobrio ("Ninguna foto con esas
  etiquetas").
- Imagen referenciada inexistente o `alt` vacío: el build falla (validación del
  schema Zod).
- Sin etiquetas en toda la colección: la barra no se renderiza (no aporta nada
  con un único botón "Todas").

## Verificación

- **Tests unitarios** (`src/lib/filter.test.ts`) de `uniqueTags` (unión ordenada,
  sin duplicados) y `photoMatches` (OR, caso "Todas" con lista vacía, sin
  coincidencias).
- **`astro build`** pasa sin errores; imágenes optimizadas desde la colección.
- **Revisión visual:** barra de filtros (multi-OR, varias activas resaltadas,
  "Todas" resetea), fade-in escalonado al hacer scroll, re-animación al cambiar el
  filtro, lightbox que solo recorre las fotos del filtro, y modo
  `prefers-reduced-motion` sin animación.

## Migración de datos (muestras actuales)

Las 5 fotos de muestra (`uno.jpg`…`cinco.jpg`) se trasladan de `src/images/` a
`src/content/photos/` y se les crea su YAML con etiquetas de ejemplo variadas
(p. ej. `paisaje`, `mar`, `calle`, `retrato`) para poder ver el filtro
funcionando. El usuario las reemplazará por sus fotos reales.
