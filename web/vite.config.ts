import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';

function flagIconsPlugin(): Plugin {
  return {
    name: 'vite-plugin-flag-icons',
    buildStart() {
      const srcDir = path.resolve(import.meta.dirname, 'node_modules/flag-icons/flags/4x3');
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
          const flagPath = path.resolve(import.meta.dirname, 'node_modules/flag-icons/flags/4x3', flagFile);
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

function htmlVersionPlugin(): Plugin {
  return {
    name: 'vite-plugin-html-version',
    transformIndexHtml(html) {
      let version = process.env.VITE_APP_VERSION || process.env.VERSION;
      if (!version) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf-8'));
          version = pkg.version;
        } catch {
          version = '2.2.0';
        }
      }
      const cleanVer = (version || '2.2.0').replace(/^v/, '');
      return html
        .replace(/%APP_VERSION%/g, cleanVer)
        .replace(/%VITE_APP_VERSION%/g, cleanVer);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), flagIconsPlugin(), htmlVersionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
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
          },
        },
      },
    },
  };
});
