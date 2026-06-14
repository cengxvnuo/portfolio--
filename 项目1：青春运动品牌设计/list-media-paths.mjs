/**
 * 列出 siteData.js 中所有配图/视频路径，方便直接改本地文件。
 * 用法：npm run list-media
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const siteDataPath = path.join(root, "siteData.js");
const outPath = path.join(root, "media-paths.txt");

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(siteDataPath, "utf8"), ctx);
const data = ctx.window.siteData;

const MEDIA_KEYS = new Set(["image", "cover", "poster", "video", "mainMediaSrc", "mainMediaPoster", "backgroundMediaSrc"]);
const lines = [];
const missing = [];

function exists(ref) {
  if (!ref || /^(https?:|data:|blob:)/.test(ref)) return true;
  return fs.existsSync(path.join(root, ref.replace(/^\.\//, "")));
}

function walk(value, label) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${label}[${i}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (MEDIA_KEYS.has(key) && typeof child === "string" && child) {
      const ok = exists(child);
      if (!ok) missing.push(child);
      lines.push(`${label}.${key}\n  ${child}${ok ? "" : "  ← 文件不存在"}`);
    } else if (child && typeof child === "object") {
      walk(child, label ? `${label}.${key}` : key);
    }
  }
}

walk(data, "siteData");

const header = [
  "# Campus Gravity Break — 媒体路径清单",
  `# 生成时间: ${new Date().toISOString()}`,
  `# 修改配图: 1) 把文件放进 assets/  2) 改 siteData.js 对应路径  3) npm run save-local`,
  "",
].join("\n");

const body = lines.join("\n\n");
const footer = missing.length
  ? `\n\n# 缺失文件 (${missing.length})\n${missing.map((m) => `- ${m}`).join("\n")}\n`
  : "\n\n# 全部路径有效\n";

fs.writeFileSync(outPath, header + body + footer, "utf8");
console.log("已写入:", outPath);
console.log("媒体引用:", lines.length, "缺失:", missing.length);
if (missing.length) {
  missing.forEach((m) => console.log(" -", m));
  process.exitCode = 1;
}
