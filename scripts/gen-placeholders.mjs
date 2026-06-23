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
