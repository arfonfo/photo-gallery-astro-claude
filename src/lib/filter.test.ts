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
