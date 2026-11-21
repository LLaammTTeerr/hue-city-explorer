import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// The release shown in the About dialog: package.json's version plus the commit it was built from.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let commit = (process.env.GITHUB_SHA || '').slice(0, 7);
if (!commit) try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { commit = ''; }

export default defineConfig({
  base: './',
  server: { port: 5183, host: '127.0.0.1' },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
  },
});
