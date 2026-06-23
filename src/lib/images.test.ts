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
