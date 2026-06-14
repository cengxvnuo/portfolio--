/**
 * 将浏览器导出的 siteData.js 写入项目本地（覆盖磁盘，不写浏览器）。
 * 用法：npm run apply-export -- "下载文件夹/siteData.js"
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const srcArg = process.argv[2];

if (!srcArg) {
  console.error("请指定导出的 siteData.js 路径，例如：");
  console.error('  npm run apply-export -- "C:/Users/你/Downloads/siteData.js"');
  process.exit(1);
}

const srcPath = path.resolve(srcArg);
if (!fs.existsSync(srcPath)) {
  console.error("文件不存在:", srcPath);
  process.exit(1);
}

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(srcPath, "utf8"), ctx);
const data = ctx.window.siteData;
if (!data || typeof data !== "object") {
  console.error("不是有效的 siteData.js");
  process.exit(1);
}

data.meta = data.meta || {};
data.meta.savedAt = new Date().toISOString();
data.meta.storage = "disk-only";

const stamp = data.meta.savedAt.replace(/[:.]/g, "-").slice(0, 19);
const backupDir = path.join(path.dirname(root), "网页备份", `导出覆盖_${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });

for (const f of ["siteData.js", "siteData.boot.js"]) {
  const cur = path.join(root, f);
  if (fs.existsSync(cur)) fs.copyFileSync(cur, path.join(backupDir, f));
}

const siteBody = `window.siteData = ${JSON.stringify(data, null, 2)};\n`;
const bootBody = `window.__DISK_SITE_DATA__=${JSON.stringify(data)};\n`;
fs.writeFileSync(path.join(root, "siteData.js"), siteBody, "utf8");
fs.writeFileSync(path.join(root, "siteData.boot.js"), bootBody, "utf8");

console.log("已从导出文件写入本地:");
console.log("  来源:", srcPath);
console.log("  备份:", backupDir);
console.log("  savedAt:", data.meta.savedAt);
console.log("请运行 npm run sync 校验资源路径。");
