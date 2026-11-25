// Before/after captures of named views (scripts/views.json) on two revisions, under the same conditions.
//
//   node scripts/compare.mjs <view> [<view> …] [--base origin/main] [--out scratch/compare]
//
// Builds the base revision in a detached git worktree (scratch/compare/base-<sha>, sharing this checkout's
// node_modules) and the working tree here, shoots every view on both with this checkout's scripts/shot.mjs, and
// writes <out>/index.html with the frames side by side, plus <out>/<view>/{base,head}/*.png to attach to a PR.
// The base worktree is kept for the next run; drop it with `git worktree remove <out>/base-<sha>`.
// The base must understand ?still (any revision since named views landed); an older one renders in real time and its
// frames will not line up.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const views = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const known = Object.keys(JSON.parse(readFileSync(new URL('./views.json', import.meta.url)))).filter((k) => k !== '_');
if (!views.length || views.some((v) => !known.includes(v))) {
  console.error(`usage: node scripts/compare.mjs <view> [<view> …] [--base ref] [--out dir]\nviews: ${known.join(', ')}`);
  process.exit(2);
}
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const run = (cmd, a, cwd) => { const r = spawnSync(cmd, a, { cwd, stdio: ['ignore', 'ignore', 'inherit'] }); if (r.status) throw new Error(`${cmd} ${a.join(' ')} failed in ${cwd}`); };

const ref = opt('base', 'origin/main');
const sha = git('rev-parse', '--short', ref + '^{commit}');
const head = git('rev-parse', '--short', 'HEAD') + (git('status', '--porcelain') ? '+dirty' : '');
const out = path.resolve(opt('out', path.join('scratch', 'compare')));
const tree = path.join(out, 'base-' + sha);
mkdirSync(out, { recursive: true });

try {
  if (!existsSync(tree)) {
    git('worktree', 'add', '--detach', tree, sha);
    symlinkSync(path.resolve('node_modules'), path.join(tree, 'node_modules'));
  }
  if (!readFileSync(path.join(tree, 'src/main.ts'), 'utf8').includes("has('still')"))
    console.warn(`warning: ${ref} (${sha}) predates ?still; its frames run in real time and will not line up`);
  console.log(`building base ${ref} (${sha}) and head ${head}`);
  run('npx', ['vite', 'build', '--outDir', path.join(tree, 'dist'), '--emptyOutDir', '--logLevel', 'error'], tree);
  run('npx', ['vite', 'build', '--outDir', path.join(out, 'head-dist'), '--emptyOutDir', '--logLevel', 'error'], process.cwd());

  const rows = [];
  for (const v of views) {
    for (const [side, dir] of [['base', path.join(tree, 'dist')], ['head', path.join(out, 'head-dist')]])
      run('node', [path.resolve('scripts/shot.mjs'), '--view', v, '--build', dir, '--out', path.join(out, v, side)], process.cwd());
    const { files, note } = JSON.parse(readFileSync(path.join(out, v, 'head', 'view.json'), 'utf8'));
    rows.push(`<h2>${v}</h2><p>${note || ''}</p>` + files.map((f) =>
      `<div class="pair"><figure><img src="${v}/base/${f}"><figcaption>base ${sha} · ${f}</figcaption></figure>` +
      `<figure><img src="${v}/head/${f}"><figcaption>head ${head} · ${f}</figcaption></figure></div>`).join(''));
    console.log(`${v}: ${files.length} frame(s) on each side`);
  }
  writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Before/after ${sha}…${head}</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#ddd}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
figure{margin:0}img{width:100%;display:block}figcaption{opacity:.7;padding:2px 0}</style>
<h1>base ${ref} (${sha}) · head ${head}</h1>${rows.join('')}`);
  console.log(`→ ${path.join(out, 'index.html')}`);
} catch (e) {
  console.error('compare failed:', e.message);
  process.exit(1);
}
