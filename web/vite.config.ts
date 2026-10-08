import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';

function flagIconsPlugin(): Plugin {
  return {
    name: 'vite-plugin-flag-icons',
    buildStart() {
      const srcDir = path.resolve(__dirname, 'node_modules/flag-icons/flags/4x3');
      if (!fs.existsSync(srcDir)) return;

      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        if (file.endsWith('.svg')) {
          const filePath = path.join(srcDir, file);
          const source = fs.readFileSync(filePath);
          this.emitFile({
            type: 'asset',
            fileName: `assets/img/flags/4x3/${file}`,
            source,
          });
        }
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        if (req.url.startsWith('/assets/img/flags/4x3/')) {
          const flagFile = req.url.replace(/^.*\/4x3\//, '').split('?')[0];
          const flagPath = path.resolve(__dirname, 'node_modules/flag-icons/flags/4x3', flagFile);
          if (fs.existsSync(flagPath) && fs.statSync(flagPath).isFile()) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=604800');
            return fs.createReadStream(flagPath).pipe(res);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), flagIconsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
  };
});
