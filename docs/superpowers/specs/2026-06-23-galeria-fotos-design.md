# Galería de fotos personal (Astro) — Diseño

**Fecha:** 2026-06-23
**Estado:** Aprobado (pendiente de revisión final del usuario)

## Objetivo

Una SPA estática en Astro que muestre una galería de fotos personal en una sola
página, con estética minimalista. Cada foto muestra un pie de foto (1-2 líneas)
con los pensamientos del autor al pasar el cursor. Las fotos se añaden
manualmente, sin CMS.

**Prioridades, en orden:** estético, rápido, simple de mantener.

## Requisitos

### Funcionales
- **Layout masonry** tipo Pinterest: las fotos mantienen su proporción original y
  se encajan en columnas. El orden exacto de lectura no importa (empaquetado por
  columnas).
- **Pie de foto en hover (desktop):** al pasar el cursor, la imagen se oscurece
  ligeramente y aparece el pie de foto (1-2 líneas) centrado encima, con
  transición suave.
- **Pie de foto en táctil (móvil):** primer toque revela el pie; segundo toque
  abre el lightbox; tocar fuera lo oculta.
- **Lightbox:** clic/toque en una foto la abre a pantalla completa con su pie de
  foto. Se cierra con ×, Esc o clic fuera. Navegación anterior/siguiente con
  botones ‹ › y flechas del teclado.
- **Modo claro/oscuro:** botón de toggle. Por defecto respeta
  `prefers-color-scheme`; la elección del usuario persiste en `localStorage`.
- **Gestión manual de fotos:** se añaden editando un archivo de datos + soltando
  el archivo de imagen. Sin CMS.

### No funcionales
- Carga rápida: imágenes optimizadas (WebP/AVIF responsivos, lazy-load).
- Mantenimiento simple: añadir una foto = soltar archivo + una línea de datos.
- Accesibilidad básica: `alt` obligatorio en cada imagen.
- Compatible con una **migración futura** a imágenes alojadas en un servidor
  externo, cambiando un único punto del código.

### Fuera de alcance (YAGNI)
- CMS o panel de administración.
- Content Collections / un archivo por foto.
- Categorías, filtros, búsqueda, paginación.
- Backend o base de datos.

## Arquitectura

Sitio **estático (SSG)** con Astro. Una sola página (`index.astro`). Sin
frameworks de UI ni islas: Astro + CSS + scripts vanilla mínimos. Salida 100%
estática, desplegable en cualquier hosting estático.

### Capa de datos (costura para el futuro servidor externo)

- **`src/data/photos.ts`** — array de objetos; lo único que se edita al añadir
  fotos:
  ```ts
  export interface Photo {
    file: string;    // nombre del archivo en src/images/ (hoy) o URL (futuro)
    caption: string; // pie de foto, 1-2 líneas
    alt: string;     // texto alternativo, obligatorio
  }
  ```
- **`src/lib/images.ts`** — resolutor que convierte cada entrada en algo
  renderizable por el componente `<Image>` de Astro.
  - **Hoy:** resuelve archivos locales de `src/images/` mediante
    `import.meta.glob('../images/*.{jpg,jpeg,png,webp}', { eager: true })`,
    emparejando por nombre de archivo. Astro optimiza en build.
  - **Futuro (migración):** se cambia **solo este archivo** para devolver URLs
    remotas, y se añaden los dominios permitidos en `astro.config.mjs`
    (`image.domains` / `image.remotePatterns`). Los componentes no cambian.
  - Si una entrada apunta a un archivo inexistente, el resolutor lanza un error
    → el build falla de forma temprana (deseable, atrapa erratas).

### Componentes

- **`PhotoGrid.astro`** — contenedor masonry con **CSS `columns`** (sin JS para el
  layout). Número de columnas responsivo según el ancho del viewport. Recorre las
  fotos y renderiza una `PhotoCard` por cada una.
- **`PhotoCard.astro`** — una `<figure>` con:
  - `<Image>` optimizada (variante tamaño-grid, responsiva, `loading="lazy"`).
  - Overlay con el pie de foto centrado.
  - Atributos de datos (índice, src grande, caption) para que el lightbox sepa
    qué mostrar.
  - Comportamiento hover (desktop, CSS puro) y tap (móvil, vía script global).
- **`Lightbox.astro`** — una única instancia en la página. Overlay a pantalla
  completa con la imagen en grande (variante optimizada mayor), pie de foto,
  botón cerrar, navegación ‹ ›. Bloquea el scroll del fondo mientras está abierto.
- **`ThemeToggle.astro`** — botón claro/oscuro.

### Interacción (scripts vanilla mínimos)

- **Hover (desktop):** CSS puro. La foto se oscurece y el pie aparece con
  transición suave de opacidad.
- **Tap (móvil):** un script global gestiona el estado. Primer toque añade clase
  "activa" (revela pie); segundo toque sobre la misma foto abre el lightbox;
  toque fuera quita la clase.
- **Lightbox:** delegación de eventos en el grid; clic en una foto abre el
  overlay con la imagen grande. Cierre con ×, Esc o clic en el fondo. Navegación
  anterior/siguiente con botones y flechas del teclado.
- **Modo oscuro:** un script inline en `<head>` aplica la clase de tema desde
  `localStorage`/`prefers-color-scheme` antes del primer render (evita FOUC). El
  toggle alterna la clase en `<html>` y persiste en `localStorage`.

### Estética

- Variables CSS para el tema: `:root` (claro) y `.dark` (oscuro).
- Claro: fondo blanco / gris muy claro, texto casi negro.
- Oscuro: fondo negro suave, texto claro.
- Tipografía ligera de sistema, márgenes generosos, mucho espacio en blanco.
- Transiciones suaves y sobrias (hover del pie, apertura del lightbox, cambio de
  tema).

## Flujo de datos

1. **Build:** `photos.ts` + `import.meta.glob` → `images.ts` resuelve cada entrada
   a `ImageMetadata`. El componente `<Image>` genera variantes optimizadas
   (tamaño grid y tamaño lightbox).
2. **Runtime:** HTML estático con imágenes optimizadas. Los scripts vanilla
   manejan tap, lightbox y toggle de tema. No hay peticiones de datos en cliente.

## Estructura de archivos (propuesta)

```
src/
  data/photos.ts          # datos editables por el usuario
  images/                 # archivos de imagen originales
  lib/images.ts           # resolutor (costura de origen de imágenes)
  components/
    PhotoGrid.astro
    PhotoCard.astro
    Lightbox.astro
    ThemeToggle.astro
  pages/index.astro
  styles/global.css       # variables de tema y estilos base
astro.config.mjs
```

## Casos límite y errores

- Entrada de datos con archivo inexistente → build falla (resolutor lanza error).
- `alt` ausente → considerado error de datos (tipado obligatorio + validación).
- Galería vacía → la página muestra un mensaje sobrio.
- Imágenes muy grandes → mitigado por la optimización de Astro y `lazy`.

## Verificación

- **Principal:** `astro build` pasa sin errores + revisión visual manual: grid
  responsivo, hover (desktop), tap (móvil/emulado), lightbox (abrir, navegar,
  cerrar), toggle de tema con persistencia.
- **Test ligero:** prueba unitaria del resolutor `images.ts` que verifique que
  cada entrada de `photos.ts` resuelve a una imagen y tiene `alt` no vacío, para
  detectar errores de datos sin depender solo del build.

## Migración futura (servidor externo) — nota

Único punto de cambio: `src/lib/images.ts` (devolver URLs remotas) +
`astro.config.mjs` (`image.domains`/`remotePatterns`). El resto del código
—componentes, datos, estilos— permanece igual. La interfaz `Photo` ya admite que
`file` sea un nombre local o una URL.
