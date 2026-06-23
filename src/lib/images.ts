import type { ImageMetadata } from 'astro';
import { photos as defaultPhotos } from '../data/photos';

export interface Photo {
  /** Nombre del archivo en src/images/ (hoy) o URL remota (migración futura). */
  file: string;
  /** Pie de foto, 1-2 líneas. */
  caption: string;
  /** Texto alternativo, obligatorio. */
  alt: string;
}

export interface ResolvedPhoto {
  image: ImageMetadata;
  caption: string;
  alt: string;
}

// Costura de origen de imágenes. HOY: archivos locales optimizados por Astro.
// FUTURO (servidor externo): sustituir esta resolución por URLs remotas y
// declarar los dominios en astro.config.mjs. Los componentes no cambian.
const localImages = import.meta.glob<{ default: ImageMetadata }>(
  '../images/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

export function resolvePhotos(
  entries: Photo[] = defaultPhotos,
  imageMap: Record<string, { default: ImageMetadata }> = localImages,
): ResolvedPhoto[] {
  return entries.map((entry) => {
    if (!entry.alt || entry.alt.trim() === '') {
      throw new Error(`La foto "${entry.file}" no tiene texto alternativo (alt).`);
    }
    const key = Object.keys(imageMap).find((k) => k.endsWith(`/${entry.file}`));
    if (!key) {
      throw new Error(
        `No se encontró la imagen "${entry.file}" en src/images/. Revisa el nombre en src/data/photos.ts.`,
      );
    }
    return {
      image: imageMap[key].default,
      caption: entry.caption,
      alt: entry.alt,
    };
  });
}
