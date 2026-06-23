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
