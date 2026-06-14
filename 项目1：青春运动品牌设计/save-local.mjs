/**
 * 将 siteData.js 的全部内容写入本地磁盘（siteData.boot.js），不依赖浏览器。
 * 用法：npm run save-local
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const siteDataPath = path.join(root, "siteData.js");
const bootPath = path.join(root, "siteData.boot.js");

function loadSiteData() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(siteDataPath, "utf8"), ctx);
  return ctx.window.siteData;
}

const data = loadSiteData();
data.meta = data.meta || {};
const savedAt = new Date().toISOString();
data.meta.savedAt = savedAt;
data.meta.storage = "disk-only";

const stamp = savedAt.replace(/[:.]/g, "-").slice(0, 19);
const backupDir = path.join(path.dirname(root), "网页备份", `自动备份_${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const f of ["siteData.js", "siteData.boot.js"]) {
  if (fs.existsSync(path.join(root, f))) {
    fs.copyFileSync(path.join(root, f), path.join(backupDir, f));
  }
}

const bootBody = `window.__DISK_SITE_DATA__=${JSON.stringify(data)};\n`;
const siteBody = `window.siteData = ${JSON.stringify(data, null, 2)};\n`;

fs.writeFileSync(bootPath, bootBody, "utf8");
fs.writeFileSync(siteDataPath, siteBody, "utf8");

console.log("savedAt:", savedAt);
console.log("siteData.js  ->", fs.statSync(siteDataPath).size, "bytes");
console.log("siteData.boot.js ->", fs.statSync(bootPath).size, "bytes");
console.log("自动备份 ->", backupDir);
console.log("数据源：本地磁盘，不写入浏览器。");
