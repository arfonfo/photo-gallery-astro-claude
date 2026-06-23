// @ts-check
import { defineConfig } from 'astro/config';

// Hoy: imágenes locales optimizadas por el servicio sharp por defecto.
// Migración futura a servidor externo: añadir aquí
//   image: { domains: ['mi-servidor.com'] }  // o remotePatterns
// y cambiar src/lib/images.ts para devolver URLs remotas.
export default defineConfig({});
