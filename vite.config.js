import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// The release shown in the About dialog: package.json's version plus the commit it was built from.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let commit = (process.env.GITHUB_SHA || '').slice(0, 7);
if (!commit) try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { commit = ''; }
const dataCacheName = `hue-data-${version}-${commit || 'local'}`;

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'hue-cache-name',
      transformIndexHtml: (html) => html.replace('__HUE_CACHE_NAME__', dataCacheName),
    },
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
