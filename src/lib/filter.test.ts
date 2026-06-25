import { describe, it, expect } from 'vitest';
import { uniqueTags, photoMatches, matchesCategory, subtagsForCategory } from './filter';

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
