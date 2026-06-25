# Menú lateral de categorías + barra de subetiquetas — Diseño

**Fecha:** 2026-06-25
**Estado:** Aprobado (pendiente de revisión final del usuario)
**Parte de:** Galería de fotos personal (Astro) — ver specs anteriores
(`2026-06-23-galeria-fotos-design.md`, `2026-06-23-filtros-animaciones-design.md`)

## Objetivo

Añadir un menú lateral de navegación por **categorías fijas** que, combinado con
la barra de filtros existente, crea una **jerarquía de filtrado de dos niveles**:

1. **Menú lateral (categorías):** lista fija escrita a mano, selección única.
   Oculto por defecto, se despliega con hover (desktop) o tap (móvil) sobre un
   icono hamburguesa fijo.
2. **Barra superior (subetiquetas):** multi-selección OR, con opciones
   **dinámicas** que dependen de la categoría activa.

El filtro final combina ambos niveles: **categoría (AND) Y subetiquetas (OR)**.

**Prioridades, en orden (heredadas):** estético, rápido, simple de mantener.

## Requisitos

### Modelo de datos
- Cada foto añade en su YAML **dos campos**:
  ```yaml
  category: [mar, naturaleza]   # categorías fijas; una foto puede tener varias
  tags: [costa, atardecer]      # subetiquetas libres
  ```
- **Categorías fijas** (en minúscula en datos, capitalizadas al mostrar):
  Todas, Mar, Montaña, Casa, Ciudad, Naturaleza. "Todas" es el valor de reset
  (sin categoría concreta).
- **Subetiquetas**: libres por foto.
- Distribución de muestra (5 fotos):
  - `uno`: category `[mar, naturaleza]`, tags `[costa, atardecer]`
  - `dos`: category `[ciudad]`, tags `[calle, noche]`
  - `tres`: category `[montaña, naturaleza]`, tags `[bosque, niebla]`
  - `cuatro`: category `[casa]`, tags `[interior, ventana]`
  - `cinco`: category `[mar, ciudad]`, tags `[costa, puerto]`

### Comportamiento de filtrado
- Una foto es visible si **ambas** condiciones se cumplen:
  - **Categoría:** la categoría activa es "Todas" (`""`) **o** la foto la incluye.
  - **Subetiquetas:** no hay ninguna activa **o** la foto comparte al menos una
    (OR).
- Estado: `activeCategory` (string, `""` = Todas) + `activeSubtags` (conjunto,
  multi-OR).
- Al **cambiar de categoría**: se **resetean** las subetiquetas activas y la
  barra se **repuebla** con las subetiquetas disponibles en esa categoría.
- Con "Todas" activa, la barra muestra la **unión de todas** las subetiquetas de
  la colección.

### Menú lateral (comportamiento)
- Icono hamburguesa (☰) **fijo** en la esquina superior izquierda. El contenido
  del header se desplaza para no solaparse con el título "Galería".
- Panel pegado al borde izquierdo, **oculto por defecto**
  (`transform: translateX(-100%)`).
- **Desktop:** hover sobre el icono **o** el panel lo muestra; se oculta cuando
  el ratón sale de **ambos** (icono + panel envueltos en un contenedor con
  `:hover`, CSS puro).
- **Móvil/táctil:** tap en el icono **alterna** abierto/cerrado; tap fuera o en
  una categoría lo cierra.
- El icono ☰ se transforma en **✕** cuando el menú está abierto.
- **Selección única**; la categoría activa aparece **resaltada**.

### Visual
- El menú aparece/desaparece con **transición suave** (slide desde la izquierda,
  `transform` + `transition`).
- Respeta el **tema claro/oscuro** usando las variables CSS del proyecto
  (`--bg`, `--fg`, `--muted`, etc.).
- Respeta **`prefers-reduced-motion: reduce`**: sin transición (aparece/
  desaparece directo).

### Implementación
- **JavaScript vanilla**, sin librerías externas.
- Menú y barra **sincronizados** a través de un único módulo de estado
  compartido. En este modelo de dos niveles, "sincronización" significa que el
  menú (categoría) **dirige** la barra: al cambiar de categoría se resetean y
  repueblan las subetiquetas. No es un espejo 1:1 del mismo estado, porque cada
  control gobierna un nivel distinto.
- La barra de subetiquetas mantiene su semántica **multi-OR** (no cambia); lo que
  cambia es que sus botones se generan **dinámicamente** según la categoría.

### Fuera de alcance (YAGNI)
- Conteo de fotos por categoría/subetiqueta.
- Búsqueda de texto, ordenación, deep-linking del estado en la URL.
- Animaciones de salida del menú más allá del slide.
- Sub-subcategorías (más de dos niveles).

## Arquitectura

Se mantiene el sitio estático (SSG) de una sola página. Se añade un control
(menú lateral) y se introduce un módulo de estado compartido que coordina menú y
barra. La lógica pura de filtrado se amplía en `src/lib/filter.ts` (testeable).

### Capa de datos
- **`src/content.config.ts`** (MOD): el schema añade
  `category: z.array(z.string()).default([])` junto al `tags` existente.
- **`src/content/photos/*.yaml`** (MOD): cada foto añade `category` y actualiza
  `tags` a las subetiquetas de muestra.

### Lógica pura (`src/lib/filter.ts`, ampliado)
- `matchesCategory(photoCategories: string[], activeCategory: string): boolean`
  — `true` si `activeCategory === ""` (Todas) o si
  `photoCategories.includes(activeCategory)`.
- `subtagsForCategory(photos: { categories: string[]; tags: string[] }[], activeCategory: string): string[]`
  — unión **ordenada** y sin duplicados de las subetiquetas de las fotos cuya
  categoría coincide (o de todas si "Todas").
- Se **reutiliza** `photoMatches(photoTags, activeTags)` (OR) para las
  subetiquetas. `uniqueTags` se mantiene.
- La visibilidad de una foto es
  `matchesCategory(cats, activeCategory) && photoMatches(subtags, [...activeSubtags])`.

### Estado compartido (`src/scripts/gallery-filter.ts`, NUEVO)
Única fuente de verdad del cliente. Mantiene `activeCategory` y `activeSubtags`.
Expone:
- `setCategory(category: string)`: fija la categoría, **resetea** las
  subetiquetas activas, **repuebla** la barra con las subetiquetas de esa
  categoría, aplica visibilidad y notifica.
- `toggleSubtag(tag: string)`: alterna una subetiqueta (multi-OR), aplica
  visibilidad y notifica.
- Aplicación de visibilidad: añade/quita `.is-hidden` en las tarjetas y emite el
  evento `document` `gallery:filtered` (para que el fade-in re-anime, contrato ya
  existente).
- Actualiza el resaltado de la categoría activa (menú) y de las subetiquetas
  activas (barra).
- Lee los datos por foto desde los atributos del DOM: cada tarjeta expone
  `data-categories` y `data-tags` (ambos separados por espacio).

### Componentes
- **`SideMenu.astro`** (NUEVO): recibe la lista fija de categorías. Renderiza el
  contenedor con el icono ☰/✕ y el panel deslizante con un botón por categoría
  (`data-category`), incluido "Todas" (`data-category=""`). Su script gestiona el
  estado abierto/cerrado (hover desktop vía CSS; tap móvil vía clase `is-open`) y
  registra los clics de categoría en el módulo compartido.
- **`FilterBar.astro`** (MOD): contenedor de la barra de subetiquetas. Renderiza
  en servidor el estado inicial (categoría "Todas" → todas las subetiquetas) para
  funcionar sin JS/SEO; el cliente reconstruye los botones cuando cambia la
  categoría. Mantiene multi-OR.
- **`PhotoCard.astro`** (MOD): añade `data-categories={categories.join(' ')}`
  junto al `data-tags` existente.
- **`index.astro`** (MOD): renderiza `<SideMenu>` con las categorías fijas; ajusta
  el header para dejar hueco al icono; calcula las subetiquetas iniciales (unión
  de todas) para la barra.

### Estilos (`global.css`, MOD)
- Icono hamburguesa fijo y su transformación a ✕ (animación de líneas o swap de
  glifo).
- Panel lateral: posición fija a la izquierda, `translateX(-100%)` oculto,
  `translateX(0)` visible, con `transition: transform`.
- Estado abierto vía `:hover` del contenedor (desktop) y clase `.is-open`
  (móvil/JS).
- Resaltado de categoría activa, reutilizando el patrón visual de `.filter`.
- `@media (prefers-reduced-motion: reduce)`: sin transición del panel.

## Flujo de datos

1. **Build:** `getCollection('photos')` lee `category` + `tags`; el schema valida.
   `index.astro` calcula las subetiquetas iniciales (unión de todas) y pasa la
   lista fija de categorías al menú.
2. **Runtime:** el módulo compartido mantiene el estado. Menú → `setCategory`
   (resetea subtags, repuebla barra); barra → `toggleSubtag`. Cada cambio aplica
   `.is-hidden` y emite `gallery:filtered`. Sin peticiones de datos en cliente.

## Casos límite y errores

- Foto sin `category`: no aparece bajo ninguna categoría concreta; sí con "Todas".
- Foto sin `tags`: aparece mientras no haya subetiquetas activas; al activar
  alguna, queda fuera (no comparte ninguna).
- Categoría sin subetiquetas entre sus fotos: la barra queda vacía (no se
  renderizan botones de subetiqueta) bajo esa categoría.
- Filtro combinado sin resultados: se muestra el mensaje sobrio existente
  (`[data-empty-filter]`).
- Sin JavaScript: la galería se ve completa (fallback no-JS existente); el menú y
  el filtrado son una mejora progresiva que no se activa.

## Verificación

- **Tests unitarios** (`src/lib/filter.test.ts`, ampliado): `matchesCategory`
  ("Todas" → true; incluye; no incluye) y `subtagsForCategory` (unión ordenada
  por categoría; "Todas" → todas; sin duplicados). Se conservan los tests
  existentes.
- **`astro build`** pasa sin errores; el schema valida `category` + `tags`.
- **Revisión visual** (`npm run preview`):
  - Menú: oculto por defecto; hover (desktop) e icono+panel; tap (móvil emulado);
    ☰ → ✕; slide suave; `prefers-reduced-motion` sin transición; tema claro/oscuro.
  - Barra: se repuebla al cambiar de categoría; "Todas" muestra todas las
    subetiquetas; multi-OR funciona.
  - Filtro combinado: categoría AND subetiquetas (OR) produce el conjunto correcto.
  - Sincronización: elegir categoría resetea la barra; el estado se mantiene
    coherente; el fade-in re-anima.
