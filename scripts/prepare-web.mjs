import { readdir, mkdir, copyFile, rm } from 'node:fs/promises';
import { join, extname } from 'node:path';
const root = process.cwd();
const dest = join(root, 'www');
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
const extensions = new Set(['.html', '.svg', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.mp3', '.wav', '.ogg', '.json']);
let count = 0;
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!extensions.has(extname(entry.name).toLowerCase())) continue;
  if (entry.name === 'package.json' || entry.name === 'package-lock.json' || entry.name === 'capacitor.config.json') continue;
  await copyFile(join(root, entry.name), join(dest, entry.name));
  count++;
}
if (!count) throw new Error('No web assets found');
console.log('Bundled', count, 'web files in www/');
