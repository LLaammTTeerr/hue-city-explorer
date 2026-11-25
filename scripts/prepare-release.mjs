// Prepare the next semantic version bump and CHANGELOG.md section from commits since the last tag.
// Used by .github/workflows/release-pr.yml to maintain a rolling release PR on every merge to main.
//
// Usage:
//   node scripts/prepare-release.mjs [--dry-run] [--bump auto|patch|minor|major] [--notes-out <path>]

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tagExists(tag) {
  try {
    git(['rev-parse', '-q', '--verify', `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function writeOutputs(entries) {
  const outPath = process.env.GITHUB_OUTPUT;
  if (!outPath) return;
  const lines = Object.entries(entries).map(([k, v]) => `${k}=${v}`);
  appendFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
}

function parseArgs(argv) {
  let dryRun = false;
  let bump = 'auto';
  let notesOut = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--bump') {
      bump = argv[++i] || 'auto';
    } else if (arg === '--notes-out') {
      notesOut = argv[++i] || null;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!['auto', 'patch', 'minor', 'major'].includes(bump)) {
    throw new Error(`Invalid --bump value "${bump}" (expected auto, patch, minor, or major)`);
  }
  return { dryRun, bump, notesOut };
}

function getCommitsSince(tag) {
  const raw = git(['log', '--no-merges', '--format=%H%x1f%s%x1f%b%x1e', `${tag}..HEAD`]);
  if (!raw) return [];
  return raw
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject = '', body = ''] = entry.split('\x1f');
      return { hash: hash.trim(), subject: subject.trim(), body: body.trim() };
    })
    .filter((c) => c.subject && !/^chore\(release\):/i.test(c.subject));
}

function classifyBump(commits) {
  let level = 'patch';
  for (const { subject, body } of commits) {
    if (
      /^[a-z]+(\([^)]+\))?!:/i.test(subject) ||
      /^breaking(\([^)]+\))?:/i.test(subject) ||
      /^BREAKING[ -]CHANGE:/m.test(body)
    ) {
      return 'major';
    }
    if (/^feat(\([^)]+\))?:/i.test(subject) || /^(add|new)\b/i.test(subject)) {
      level = 'minor';
    }
  }
  return level;
}

function bumpVersion(version, level) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Unsupported semver "${version}" in package.json`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : str;
}

function formatCommitBullet(subject) {
  const conv = /^([a-z]+)(?:\(([^)]+)\))?!?:\s*(.+)$/i.exec(subject);
  if (conv) {
    const [, , scope, rest] = conv;
    const text = capitalize(rest.trim());
    return scope ? `**${scope}**: ${text}` : text;
  }
  return capitalize(subject);
}

function bucketFor(subject) {
  if (/^feat(\([^)]+\))?!?:/i.test(subject) || /^(add|new)\b/i.test(subject)) return 'Added';
  if (/^fix(\([^)]+\))?!?:/i.test(subject) || /^(fix|resolve|repair|prevent)\b/i.test(subject)) return 'Fixed';
  return 'Changed';
}

function buildSection(version, date, commits) {
  const buckets = { Added: [], Changed: [], Fixed: [] };
  for (const { subject } of commits) {
    buckets[bucketFor(subject)].push(formatCommitBullet(subject));
  }

  const lines = [`## ${version} (${date})`];
  for (const heading of ['Added', 'Changed', 'Fixed']) {
    const items = buckets[heading];
    if (!items.length) continue;
    lines.push('', `### ${heading}`);
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  }
  return lines.join('\n');
}

function updateJsonVersion(filePath, oldVersion, newVersion, maxReplacements) {
  const original = readFileSync(filePath, 'utf8');
  const needle = `"version": "${oldVersion}"`;
  let remaining = maxReplacements;
  let updated = '';
  let idx = 0;

  while (remaining > 0) {
    const found = original.indexOf(needle, idx);
    if (found === -1) break;
    updated += original.slice(idx, found) + `"version": "${newVersion}"`;
    idx = found + needle.length;
    remaining--;
  }
  updated += original.slice(idx);

  if (updated === original) {
    throw new Error(`Could not find ${needle} in ${filePath}`);
  }
  writeFileSync(filePath, updated, 'utf8');
}

function prependChangelog(filePath, section) {
  const changelog = readFileSync(filePath, 'utf8');
  const headingMatch = /^## /m.exec(changelog);
  let updated;
  if (headingMatch) {
    const pos = headingMatch.index;
    updated = `${changelog.slice(0, pos)}${section}\n\n${changelog.slice(pos)}`;
  } else {
    updated = `${changelog.trimEnd()}\n\n${section}\n`;
  }
  writeFileSync(filePath, updated, 'utf8');
}

function main() {
  const { dryRun, bump: requestedBump, notesOut } = parseArgs(process.argv.slice(2));
  const pkgPath = resolve(ROOT, 'package.json');
  const lockPath = resolve(ROOT, 'package-lock.json');
  const changelogPath = resolve(ROOT, 'CHANGELOG.md');

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const prevVersion = pkg.version;
  const prevTag = `v${prevVersion}`;

  if (!tagExists(prevTag)) {
    console.log(`prepare-release: ${prevTag} is not tagged yet; skipping`);
    writeOutputs({ skipped: 'true' });
    return;
  }

  const commits = getCommitsSince(prevTag);
  if (commits.length === 0) {
    console.log(`prepare-release: no unreleased commits since ${prevTag}; skipping`);
    writeOutputs({ skipped: 'true' });
    return;
  }

  const bump = requestedBump === 'auto' ? classifyBump(commits) : requestedBump;
  const nextVersion = bumpVersion(prevVersion, bump);
  const date = new Date().toISOString().slice(0, 10);
  const section = buildSection(nextVersion, date, commits);

  console.log(`prepare-release: ${prevVersion} -> ${nextVersion} (${bump}, ${commits.length} commit(s) since ${prevTag})`);

  if (dryRun) {
    console.log('\n' + section);
    return;
  }

  updateJsonVersion(pkgPath, prevVersion, nextVersion, 1);
  updateJsonVersion(lockPath, prevVersion, nextVersion, 2);
  prependChangelog(changelogPath, section);

  if (notesOut) {
    writeFileSync(notesOut, `${section}\n`, 'utf8');
  }

  writeOutputs({
    skipped: 'false',
    prev_version: prevVersion,
    version: nextVersion,
    bump,
    commits: String(commits.length),
  });
}

main();
