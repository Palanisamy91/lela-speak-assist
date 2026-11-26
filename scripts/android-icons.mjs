// Puts the Lela launcher icon into the Android project:
//   node scripts/android-icons.mjs
// Copies resources/android/res/* over android/app/src/main/res/* (legacy, round and adaptive icons + background colour).
// Run it after "npx cap add android" and before "npx cap sync android". Safe to run again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'resources', 'android', 'res');
const to = path.join(root, 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(from)) { console.error(`Cannot find ${from}`); process.exit(2); }
if (!fs.existsSync(path.join(root, 'android', 'app', 'src', 'main'))) {
  console.error('Cannot find the android folder. Run "npx cap add android" first, then run this again.');
  process.exit(2);
}

let count = 0;
const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else { fs.copyFileSync(s, d); count++; }
  }
};
copyDir(from, to);
console.log(`Lela launcher icon installed: ${count} files copied to ${path.relative(root, to)}`);
