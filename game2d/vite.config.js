import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// The Phaser overworld opens the EXISTING game's DOM screens (Phase 3) by
// embedding the real root-level index.html in an iframe. We don't copy/fork it
// — this plugin serves the parent game (and its few assets) at /legacy/ in dev,
// and copies them into dist/legacy/ on build, so /legacy/index.html is the one
// true game in both. (Single source of truth; no drift.)
const PARENT = path.resolve(__dirname, '..');
const LEGACY_FILES = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'town.png', 'title.png'];
const MIME = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.js': 'text/javascript', '.ico': 'image/x-icon' };

function legacyGamePlugin() {
  return {
    name: 'gradus-legacy-game',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/legacy/')) return next();
        let rel = decodeURIComponent(req.url.slice('/legacy/'.length).split('?')[0]) || 'index.html';
        if (rel === '' ) rel = 'index.html';
        const file = path.join(PARENT, rel);
        if (!file.startsWith(PARENT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
        res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const dst = path.join(__dirname, 'dist', 'legacy');
      fs.mkdirSync(dst, { recursive: true });
      for (const f of LEGACY_FILES) {
        const src = path.join(PARENT, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dst, f));
      }
    },
  };
}

export default defineConfig({
  base: './',
  server: { host: true, fs: { allow: ['..'] } },
  build: { target: 'es2020', assetsInlineLimit: 0 },
  plugins: [legacyGamePlugin()],
});
