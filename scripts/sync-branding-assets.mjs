import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'aigf');
const targetDir = path.join(rootDir, 'public');

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, {
  force: true,
  recursive: true,
});
