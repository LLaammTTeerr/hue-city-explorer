import { defineConfig } from 'vite';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

// The release shown in the About dialog: package.json's version plus the commit it was built from.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let commit = (process.env.GITHUB_SHA || '').slice(0, 7);
if (!commit) try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { commit = ''; }
const dataCacheName = `hue-data-${version}-${commit || 'local'}`;

const stripWoffFallbacks = (css) => css
  .replace(/,\s*url\(\s*['"]?[^)'"]+\.woff['"]?\s*\)\s*format\(\s*['"]woff['"]\s*\)/g, '')
  .replace(/url\(\s*['"]?[^)'"]+\.woff['"]?\s*\)\s*format\(\s*['"]woff['"]\s*\)\s*,\s*/g, '');

// Strip legacy .woff font assets (every WebGL2 + DecompressionStream browser supports .woff2)
// and prune unused JSON data files from dist/ while keeping public/data/ intact for Node CI checks.
function pruneDistAssets() {
  let outDir = resolve('dist');
  let usesHueJson = false;
  return {
    name: 'prune-dist-assets',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      usesHueJson = false;
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' && /['"`]hue\.json['"`]/.test(item.code)) {
          usesHueJson = true;
        }
        if (fileName.endsWith('.woff')) {
          delete bundle[fileName];
          continue;
        }
        if (fileName.endsWith('.css') && item.type === 'asset') {
          const source = typeof item.source === 'string' ? item.source : Buffer.from(item.source).toString('utf8');
          item.source = stripWoffFallbacks(source);
        }
      }
    },
    closeBundle() {
      const tilesDir = resolve(outDir, 'data/tiles');
      if (existsSync(tilesDir)) {
        for (const entry of readdirSync(tilesDir)) {
          if (entry.endsWith('.json')) rmSync(resolve(tilesDir, entry), { force: true });
        }
      }
      if (!usesHueJson) {
        rmSync(resolve(outDir, 'data/hue.json'), { force: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'hue-cache-name',
      transformIndexHtml: (html) => html.replace('__HUE_CACHE_NAME__', dataCacheName),
    },
    pruneDistAssets(),
  ],
  server: { port: 5183, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three/ },
            {
              name: 'places',
              test: /src[\\/]landmarks[\\/]places[\\/](?!(thieutri|dongkhanh|hoquyen|gate-cua-an-hoa|quantuong|gate-cua-huu|aeon|gate-cua-chanh-tay|gate-cua-hau|khaidinh|benxenam|xatac|benxebac|gate-cua-ke-trai|thuytien)\.ts$)/,
            },
          ],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
    __DATA_CACHE_NAME__: JSON.stringify(dataCacheName),
  },
});
