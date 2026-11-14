// Copies the game's web files into www/ for the iPhone app.
// `node scripts/prepare-web.mjs --app` also adds Capacitor's bridge (capacitor.js) so native
// features like vibration work inside the app. The website itself never needs this.
import { readdir, mkdir, copyFile, rm, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const root = process.cwd();
const dest = join(root, 'www');
const forApp = process.argv.includes('--app');
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
const extensions = new Set(['.html', '.svg', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.mp3', '.wav', '.ogg', '.json']);
const skip = new Set(['package.json', 'package-lock.json', 'capacitor.config.json']);
let count = 0;
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!extensions.has(extname(entry.name).toLowerCase())) continue;
  if (skip.has(entry.name)) continue;
  await copyFile(join(root, entry.name), join(dest, entry.name));
  count++;
}
if (!count) throw new Error('No web assets found');
if (forApp) {
  await copyFile(join(root, 'node_modules/@capacitor/core/dist/capacitor.js'), join(dest, 'capacitor.js'));
  const page = join(dest, 'index.html');
  const html = await readFile(page, 'utf8');
  await writeFile(page, html.replace('<head>', '<head><script src="capacitor.js"></script>'));
  console.log('Added capacitor.js for the iPhone app');
}
console.log('Bundled', count, 'web files in www/');
