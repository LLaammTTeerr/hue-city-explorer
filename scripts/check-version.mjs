// The version in package.json must have its own section in CHANGELOG.md, so the release made on merge has notes.
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const found = changelog.split('\n').some((l) => l === `## ${version}` || l.startsWith(`## ${version} `));
if (!found) {
  console.error(`check:version: CHANGELOG.md has no "## ${version}" section for package.json's version`);
  process.exit(1);
}
console.log(`check:version: ${version} has a changelog section`);
