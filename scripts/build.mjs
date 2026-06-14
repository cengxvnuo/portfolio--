import fs from 'node:fs/promises';
import path from 'node:path';
import { generateDataBundle } from './generate-data-bundle.mjs';

const root = process.cwd();
const dist = path.join(root, 'dist');
const entries = [
  '.nojekyll',
  'index.html',
  'src',
  'data',
  'assets',
  'public',
  'projects',
  '\u9879\u76ee1\uff1a\u9752\u6625\u8fd0\u52a8\u54c1\u724c\u8bbe\u8ba1',
  '\u9879\u76ee2\uff1a\u6668\u95f4\u516c\u9986',
  '\u9879\u76ee3\uff1a\u96e8\u6797\u5c55\u5385'
];
const ignoredNames = new Set(['node_modules', '.git', 'dist']);
const ignoredPathParts = [
  'assets/images/00_零散案例播放/建筑设计',
  'assets/images/00_零散案例播放/拼贴设计',
  'assets/images/00_零散案例播放/全景图',
  '项目2：晨间公馆/assets/video/1_stab_prob4.mov'
];

await generateDataBundle();
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });

async function copyFiltered(source, target) {
  const relative = path.relative(root, source).replaceAll(path.sep, '/');
  if (ignoredPathParts.some((part) => relative === part || relative.startsWith(`${part}/`))) return;
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    const name = path.basename(source);
    if (ignoredNames.has(name)) return;
    await fs.mkdir(target, { recursive: true });
    const children = await fs.readdir(source);
    await Promise.all(children.map((child) => copyFiltered(path.join(source, child), path.join(target, child))));
    return;
  }
  if (source.endsWith('.crswap')) return;
  await fs.copyFile(source, target);
}

for (const entry of entries) {
  const source = path.join(root, entry);
  try {
    await copyFiltered(source, path.join(dist, entry));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const faviconSource = path.join(root, 'public', 'favicon.svg');
const faviconTarget = path.join(dist, 'favicon.svg');
try {
  await fs.copyFile(faviconSource, faviconTarget);
} catch {}

console.log('Build complete: dist');
