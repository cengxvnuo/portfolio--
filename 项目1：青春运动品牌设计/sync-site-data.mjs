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

function collectAssetRefs(value, refs = new Set()) {
  if (!value || typeof value !== "object") return refs;
  for (const [key, child] of Object.entries(value)) {
    if (["image", "cover", "poster", "video", "mainMediaSrc", "mainMediaPoster", "backgroundMediaSrc"].includes(key) && typeof child === "string") {
      if (child && !/^(https?:|data:|blob:)/.test(child)) refs.add(child.replace(/^\.\//, ""));
    } else if (child && typeof child === "object") {
      collectAssetRefs(child, refs);
    }
  }
  return refs;
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) count += copyDir(src, dest);
    else {
      fs.copyFileSync(src, dest);
      count += 1;
    }
  }
  return count;
}

const data = loadSiteData();
const bootBody = `window.__DISK_SITE_DATA__=${JSON.stringify(data)};\n`;
const siteBody = `window.siteData = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(bootPath, bootBody, "utf8");

const refs = [...collectAssetRefs(data)];
const missing = refs.filter((ref) => !fs.existsSync(path.join(root, ref)));

const publicCopies = [
  ["assets/posters", "public/posters"],
  ["assets/objects", "public/objects"],
];
let copied = 0;
for (const [from, to] of publicCopies) {
  copied += copyDir(path.join(root, from), path.join(root, to));
}

const assetCount = fs.existsSync(path.join(root, "assets"))
  ? fs.readdirSync(path.join(root, "assets"), { recursive: true }).filter((name) => /\.(png|jpe?g|webp|mp4|webm)$/i.test(String(name))).length
  : 0;

console.log("siteData.js bytes:", JSON.stringify(data).length);
console.log("siteData.boot.js regenerated");
console.log("asset refs:", refs.length, "missing:", missing.length);
if (missing.length) {
  console.log("Missing files:");
  missing.forEach((item) => console.log(" -", item));
  process.exitCode = 1;
}
console.log("assets media files:", assetCount);
console.log("public fallback copies:", copied);
console.log("Deploy folder ready for GitHub Pages.");
