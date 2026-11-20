// vite.config.js
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/game/',
    plugins: [ react() ],
    server: {
        host: '0.0.0.0',
        port: 5155,
        strictPort: true
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '~': resolve(__dirname, 'node_modules')
        }
    },
    esbuild: {
        drop: [ 'console', 'debugger' ],
        legalComments: 'none'
    },
    build: {
        sourcemap: false,
        minify: 'esbuild',
        assetsInlineLimit: 102400,
        rollupOptions: {
            output: {
                entryFileNames: 'static/[hash].js',
                chunkFileNames: 'static/[hash].js',
                assetFileNames: 'static/[hash].[ext]',
                manualChunks: id =>
                {
                    if(id.includes('node_modules'))
                    {
                        if(id.includes('@nitrots/nitro-renderer')) return 'r';

                        return 'v';
                    }
                }
            }
        }
    }
})
