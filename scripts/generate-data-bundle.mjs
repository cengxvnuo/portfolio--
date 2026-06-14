import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DATA_FILES = ['site', 'projects', 'workbench', 'categories', 'works'];

export async function generateDataBundle() {
  const root = process.cwd();
  const data = {};

  for (const name of DATA_FILES) {
    const filePath = path.join(root, 'data', `${name}.json`);
    data[name] = JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  const output = `window.__PORTFOLIO_DATA__ = ${JSON.stringify(data, null, 2)};\n`;
  await fs.writeFile(path.join(root, 'data', 'bundle.js'), output, 'utf8');
  return data;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateDataBundle();
  console.log('Generated data/bundle.js');
}
