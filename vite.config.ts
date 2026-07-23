import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [
    react(),
    electron([
      {
        entry: path.resolve(__dirname, 'src/main/main.ts'),
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
            rollupOptions: {
              // 'store-review' is a native addon (.node) resolved at runtime
              // from node_modules — never bundle it into main.js.
              external: ['electron', 'store-review'],
              output: { entryFileNames: '[name].js' },
            },
          },
          resolve: {
            alias: {
              '@shared': path.resolve(__dirname, 'src/shared'),
            },
          },
        },
      },
      {
        entry: path.resolve(__dirname, 'src/main/preload.ts'),
        onstart(args) { args.reload() },
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
            rollupOptions: {
              external: ['electron'],
              output: { entryFileNames: '[name].js' },
            },
          },
        },
      },
      {
        entry: path.resolve(__dirname, 'src/main/messengerPreload.ts'),
        onstart(args) { args.reload() },
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
            rollupOptions: {
              external: ['electron'],
              output: { entryFileNames: '[name].js' },
            },
          },
        },
      },
    ]),
  ],
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
})