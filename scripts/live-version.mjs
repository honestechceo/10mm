// Stamps www/live-version.json for live (over-the-air) updates.
//   n  = commit time of this build: a newer live bundle has a bigger n
//   fp = fingerprint of the app's native parts (plugins, native Swift code, Capacitor config).
//        A phone only takes a live update whose fp matches its own App Store build, so web code
//        never lands on a binary it wasn't built for. Changing native code = new App Store version.
// Usage: node scripts/live-version.mjs            (after prepare-web.mjs --app)
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p))); else out.push(p);
  }
  return out;
}
const h = createHash('sha256');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
h.update(JSON.stringify(pkg.dependencies || {}));
h.update(await readFile('capacitor.config.json'));
for (const f of (await files('ci')).sort()) { h.update(f); h.update(await readFile(f)); }
// the App Store version is part of it too: a bundle made for 1.5 never lands on a 1.4 phone
const ver = ((await readFile('.github/workflows/ios.yml', 'utf8')).match(/APP_VERSION:\s*"([^"]+)"/) || [])[1] || '';
if (ver !== '1.4') h.update('app ' + ver);
const fp = h.digest('hex').slice(0, 16);
let n = Math.floor(Date.now() / 1000);
try { n = +execSync('git log -1 --format=%ct').toString().trim() || n; } catch (e) {}
const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch (e) { return ''; } })();
await writeFile(join('www', 'live-version.json'), JSON.stringify({ n, fp, sha }));
console.log(JSON.stringify({ n, fp, sha }));
