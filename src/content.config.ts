import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Costura de origen de imágenes. HOY: imágenes locales co-localizadas,
// optimizadas por Astro vía el helper image().
// FUTURO (servidor externo): cambiar `image: image()` por
// `image: z.string().url()` y declarar los dominios en astro.config.mjs
// (image.domains / remotePatterns).
const photos = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      caption: z.string(),
      alt: z.string().min(1),
      tags: z.array(z.string()).default([]),
    }),
});

export const collections = { photos };
