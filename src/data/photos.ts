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
