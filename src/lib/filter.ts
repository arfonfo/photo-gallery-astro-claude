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
