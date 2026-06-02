import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import svg from 'vite-svg-loader';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/ThryvAppointment/' : '/',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [vue(), svg()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
