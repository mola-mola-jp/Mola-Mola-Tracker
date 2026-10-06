// Copies only the files the app needs into ./www (the folder Capacitor bundles
// into the iOS app), leaving out the raw artwork in "Mola Icons", node_modules, etc.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const item of ['index.html', 'style.css', 'script.js', 'manifest.json', 'privacy.html', 'icons', 'fonts']) {
  cpSync(join(root, item), join(out, item), { recursive: true });
}
console.log('Built www/');
