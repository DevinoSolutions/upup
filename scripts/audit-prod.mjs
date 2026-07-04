#!/usr/bin/env node
// Prod-scoped dependency audit for the PUBLISHED surface only (F-182).
// Fails (exit 1) on any HIGH/CRITICAL advisory whose dependency path is rooted
// at a publishable @upup/* package's production tree. Dev-only advisories
// (docusaurus/next/storybook/mastra + private packages) are ignored by design —
// they never ship to npm consumers.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Derive "what ships": same predicate as build:package / release.
const pkgDir = join(ROOT, 'packages');
const publishable = readdirSync(pkgDir).filter((d) => {
  try {
    const pj = JSON.parse(readFileSync(join(pkgDir, d, 'package.json'), 'utf8'));
    return pj.private !== true && typeof pj.name === 'string' && pj.name.startsWith('@upup/');
  } catch { return false; }
});
const roots = new Set(publishable.map((d) => `packages__${d}`)); // audit path roots

const res = spawnSync('pnpm', ['audit', '--prod', '--json'], {
  cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
});
let report;
try { report = JSON.parse(res.stdout); }
catch {
  console.error('audit-prod: could not parse `pnpm audit --prod --json` output');
  console.error((res.stdout || res.stderr || '').slice(0, 800));
  process.exit(2);
}

const advisories = Object.values(report.advisories ?? {});
const BLOCK = new Set(['high', 'critical']);
let allow = new Set();
try {
  allow = new Set((JSON.parse(readFileSync(join(ROOT, 'scripts/audit-allowlist.json'), 'utf8')).accept ?? []).map(String));
} catch { /* no allowlist → accept nothing */ }

const blocking = [], noted = [];
for (const a of advisories) {
  const paths = (a.findings ?? []).flatMap((f) => f.paths ?? []);
  if (!paths.some((p) => roots.has(String(p).split('>')[0]))) continue; // not a shipped tree
  const sev = String(a.severity);
  if (BLOCK.has(sev) && !allow.has(String(a.id))) {
    blocking.push({ id: a.id, sev, name: a.module_name, patched: a.patched_versions });
  } else {
    noted.push({ id: a.id, sev, name: a.module_name });
  }
}

for (const n of noted) console.log(`note (non-blocking ${n.sev}): ${n.name} [${n.id}]`);
if (blocking.length) {
  console.error(`\n✗ ${blocking.length} blocking advisory(ies) in publishable production trees:`);
  for (const b of blocking) console.error(`  ${b.sev.toUpperCase()} ${b.name} → upgrade to ${b.patched} [${b.id}]`);
  process.exit(1);
}
console.log(`✓ no high/critical advisories in the production trees of ${publishable.length} publishable packages`);
