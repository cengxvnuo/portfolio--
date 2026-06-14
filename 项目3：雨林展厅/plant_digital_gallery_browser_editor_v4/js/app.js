let galleryData = null;
let currentRoomIndex = 0;
let selectedHotspotId = null;
let viewer = null;
let showHotspotLabels = true;
let locateMode = false;
let tourTimer = null;
let tourIndex = 0;
/** 当前导览播放队列：按展厅顺序，每个展厅内按 hotspots 数组顺序，全部播完再进下一展厅 */
let activeTourPlan = null;

const EDIT_PASSWORD = '666888';
const EDIT_SESSION_KEY = 'plant_gallery_edit_unlocked_v4';
const STORAGE_KEY = 'plant_digital_gallery_browser_editor_v4';
const STORAGE_TS_KEY = 'plant_digital_gallery_browser_editor_v4_savedAt';
const DEPLOY_MEDIA_BASE_URL = 'assets/';
const PERSIST_DEBOUNCE_MS = 1200;
const LEGACY_STORAGE_KEYS = [
  'plant_digital_gallery_browser_editor_v3',
  'plant_digital_gallery_browser_editor_v4'
];
const LEGACY_IDB_NAME = 'plant_digital_gallery_panorama_v1';
const LEGACY_IDB_STORE = 'panoramaBlobs';
/** 展厅跳转箭头热点：全景中点击后进入目标展厅 */
const HOTSPOT_TYPE_ROOM_LINK = 'room_link';

const FS_DB_NAME = 'plant_gallery_fs_handles_v1';
const FS_STORE = 'handles';
const FS_PROJECT_KEY = 'projectRoot';

let projectDirHandle = null;
let diskApiReady = false;
let persistTimer = null;
let lastDiskSaveAt = 0;

function joinMediaBaseAndPath(base, relPath) {
  const b = String(base ?? '').trim();
  const p = String(relPath ?? '').trim().replace(/^\.\//, '');
  if (!b) return p;
  const slashB = b.endsWith('/') ? b : `${b}/`;
  return slashB + p;
}

function normalizeDeployMediaPath(value) {
  let path = String(value ?? '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!path) return '';
  if (/^(https?:|data:|blob:|file:)/i.test(path) || path.startsWith('//')) return path;
  path = path.replace(/^\/+/, '');
  const base = DEPLOY_MEDIA_BASE_URL.replace(/\/+$/, '');
  if (path === base) return '';
  if (path.startsWith(`${base}/`)) path = path.slice(base.length + 1);
  return path;
}

function enforceLocalDeployPaths(data) {
  if (!data) return data;
  data.settings ||= {};
  data.settings.mediaBaseUrl = DEPLOY_MEDIA_BASE_URL;
  (data.rooms || []).forEach((room) => {
    room.panoramaUrl = normalizeDeployMediaPath(room.panoramaUrl);
    room.bgmUrl = normalizeDeployMediaPath(room.bgmUrl);
    (room.hotspots || []).forEach((hotspot) => {
      hotspot.imageUrl = normalizeDeployMediaPath(hotspot.imageUrl);
      hotspot.audioUrl = normalizeDeployMediaPath(hotspot.audioUrl);
    });
  });
  return data;
}

const mediaBlobCache = new Map();

function encodePathSegments(relPath) {
  return String(relPath ?? '')
    .replace(/^\.\//, '')
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/** 将 JSON 中的相对路径解析为可请求地址（部署到子目录或 CDN 根路径均可用） */
function resolveMediaUrl(url) {
  const u = String(url ?? '').trim();
  if (!u) return '';
  if (/^(https?:|data:|blob:|file:)/i.test(u)) return u;
  if (u.startsWith('//')) return u;
  if (u.startsWith('/')) return u;
  const base = String(galleryData?.settings?.mediaBaseUrl ?? 'assets/').trim();
  if (/^https?:\/\//i.test(base)) return joinMediaBaseAndPath(base, u);
  const combined = (base ? joinMediaBaseAndPath(base, u) : u).replace(/^\.\//, '');
  try {
    return new URL(combined, location.href).href;
  } catch (err) {
    /* fall through */
  }
  const encoded = encodePathSegments(combined);
  if (!encoded) return u;
  try {
    const prefix = location.protocol === 'file:' ? './' : '';
    return new URL(prefix + encoded, location.href).href;
  } catch (err) {
    return encoded;
  }
}

/** 同一相对路径的多种 URL 形式（file:// 下编码差异可能导致加载失败） */
function resolveMediaUrlVariants(storedPath) {
  const u = String(storedPath ?? '').trim();
  if (!u) return [];
  if (/^(https?:|data:|blob:|file:)/i.test(u)) return [u];
  const base = String(galleryData?.settings?.mediaBaseUrl ?? 'assets/').trim();
  const combined = (base ? joinMediaBaseAndPath(base, u) : u).replace(/^\.\//, '');
  const variants = new Set();
  try { variants.add(new URL(combined, location.href).href); } catch (err) { /* ignore */ }
  try { variants.add(new URL('./' + combined, location.href).href); } catch (err) { /* ignore */ }
  try { variants.add(resolveMediaUrl(u)); } catch (err) { /* ignore */ }
  const encoded = encodePathSegments(combined);
  if (encoded) {
    try {
      const prefix = location.protocol === 'file:' ? './' : '';
      variants.add(new URL(prefix + encoded, location.href).href);
    } catch (err) { /* ignore */ }
  }
  return Array.from(variants);
}

function isPanoramaLoadUrl(url) {
  const u = String(url ?? '');
  if (!u) return false;
  if (isLoadableBlobUrl(u)) return true;
  if (/^https?:/i.test(u)) return true;
  if (/^file:/i.test(u)) return true;
  if (!/^[a-z]+:/i.test(u)) return true;
  return false;
}

function isStaticDeployMediaPath(path) {
  const p = String(path ?? '').trim();
  if (!p) return false;
  if (/^(data:|blob:)/i.test(p)) return false;
  return true;
}

/** file:// 下用相对路径 fetch（比绝对 file URL 更可靠） */
function relativeAssetFetchUrls(storedPath) {
  const base = String(galleryData?.settings?.mediaBaseUrl ?? 'assets/').trim();
  const combined = joinMediaBaseAndPath(base, storedPath).replace(/^\.\//, '');
  return [...new Set([
    './' + combined,
    './' + encodePathSegments(combined)
  ])];
}

async function fetchRelativeAssetBlob(storedPath) {
  for (const rel of relativeAssetFetchUrls(storedPath)) {
    try {
      const res = await fetch(rel);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) return blob;
      }
    } catch (err) {
      console.warn('relative fetch', rel, err);
    }
  }
  return null;
}

/** 序厅全景加载失败时的备用文件（不修改 JSON 中已填路径） */
const ROOM_01_PANORAMA_FALLBACKS = [
  'panoramas/hall_01_botanical_panorama.png',
  'panoramas/2次放大并退后.png',
  'panoramas/7次放大并退后.png'
];

function panoramaPathCandidates(storedPath, room) {
  const paths = mediaPathCandidates(storedPath);
  if (room?.id === 'room_01_plant_gate') {
    ROOM_01_PANORAMA_FALLBACKS.forEach((p) => {
      if (!paths.includes(p)) paths.push(p);
    });
  }
  return paths;
}

async function blobFromResolvedUrl(url) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch (err) {
    console.warn('fetch blob', url, err);
  }
  try {
    return await fetchUrlAsBlob(url);
  } catch (err) {
    console.warn('xhr blob', url, err);
  }
  return null;
}

/** 常见文件名笔误 → assets 中实际文件名 */
const MEDIA_FILENAME_ALIASES = {
  '7次放大并退后.png': '2次放大并退后.png',
  '03-东方本草馆.png': '03-东方草本.png',
  '02-种子档案馆.png': '02-幼苗档案馆.png',
  '05-展馆.png': '05-展柜.png'
};

function mediaPathCandidates(storedPath) {
  const u = String(storedPath ?? '').trim();
  if (!u) return [];
  const out = [u];
  const base = u.split('/').pop() || '';
  const aliased = MEDIA_FILENAME_ALIASES[base];
  if (aliased) {
    const dir = u.includes('/') ? u.slice(0, u.lastIndexOf('/') + 1) : '';
    out.push(dir + aliased);
  }
  if (/^7次/.test(base) && base.includes('放大')) {
    out.push(u.replace(/7次/, '2次'));
  }
  return [...new Set(out.filter(Boolean))];
}

function isLoadableBlobUrl(url) {
  return /^(blob:|data:)/i.test(String(url ?? ''));
}

async function readMediaFileFromProject(mediaRelPath) {
  if (!projectDirHandle) throw new Error('未关联项目文件夹');
  const base = String(galleryData?.settings?.mediaBaseUrl ?? 'assets/').trim();
  const fullRel = joinMediaBaseAndPath(base, mediaRelPath).replace(/^\.\//, '');
  const parts = fullRel.split('/').filter(Boolean);
  let dir = projectDirHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(decodeURIComponent(parts[i]));
  }
  const fh = await dir.getFileHandle(decodeURIComponent(parts[parts.length - 1]));
  return fh.getFile();
}

/** file:// 下用 XHR 读取本地文件为 Blob（比 fetch / canvas 更稳定） */
function fetchUrlAsBlob(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const ok = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
      if (ok && xhr.response instanceof Blob && xhr.response.size > 0) {
        resolve(xhr.response);
        return;
      }
      reject(new Error(`XHR 加载失败 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('XHR 网络错误'));
    xhr.send();
  });
}

function srcToBlobUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('无法创建 canvas'));
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(URL.createObjectURL(blob));
            else reject(new Error('图片转 blob 失败'));
          },
          'image/png'
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('图片加载失败：' + src));
    img.src = src;
  });
}

/** 转为 Pannellum / img 可加载的地址；静态查看优先使用项目内相对资源。 */
async function ensureLoadableMediaUrl(storedPath, room) {
  const original = String(storedPath ?? '').trim();
  if (!original) return '';
  if (mediaBlobCache.has(original)) return mediaBlobCache.get(original);

  if (isStaticDeployMediaPath(original) && location.protocol !== 'file:') {
    const directUrl = resolveMediaUrl(original);
    if (directUrl) return directUrl;
  }

  const idbUrl = await tryLoadPanoramaFromIdb(original);
  if (idbUrl) {
    mediaBlobCache.set(original, idbUrl);
    return idbUrl;
  }

  for (const candidate of panoramaPathCandidates(original, room)) {
    if (projectDirHandle && diskApiReady) {
      try {
        const file = await readMediaFileFromProject(candidate);
        const blobUrl = URL.createObjectURL(file);
        mediaBlobCache.set(original, blobUrl);
        return blobUrl;
      } catch (err) {
        console.warn('从项目文件夹读取媒体失败', candidate, err);
      }
    }

    const relBlob = await fetchRelativeAssetBlob(candidate);
    if (relBlob) {
      const blobUrl = URL.createObjectURL(relBlob);
      mediaBlobCache.set(original, blobUrl);
      return blobUrl;
    }

    for (const url of resolveMediaUrlVariants(candidate)) {
      const blob = await blobFromResolvedUrl(url);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        mediaBlobCache.set(original, blobUrl);
        return blobUrl;
      }

      try {
        const blobUrl = await srcToBlobUrl(url);
        mediaBlobCache.set(original, blobUrl);
        return blobUrl;
      } catch (err) {
        console.warn('canvas 媒体失败', url, err);
      }
    }
  }

  console.warn('ensureLoadableMediaUrl 全部失败', original);
  return '';
}

function collectGalleryMediaPaths(data) {
  const paths = new Set();
  (data?.rooms || []).forEach((room) => {
    if (isRestorableMediaUrl(room.panoramaUrl)) paths.add(room.panoramaUrl);
    if (isRestorableMediaUrl(room.bgmUrl)) paths.add(room.bgmUrl);
    (room.hotspots || []).forEach((hs) => {
      if (isRestorableMediaUrl(hs.imageUrl)) paths.add(hs.imageUrl);
      if (isRestorableMediaUrl(hs.audioUrl)) paths.add(hs.audioUrl);
    });
  });
  return Array.from(paths);
}

function warmMediaCache() {
  if (!galleryData) return;
  collectGalleryMediaPaths(galleryData).forEach((path) => {
    void ensureLoadableMediaUrl(path);
  });
}

function mediaExtFromFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const m = name.match(/\.([a-z0-9]+)$/);
  if (m) return `.${m[1]}`;
  const mime = String(file?.type || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('bmp')) return '.bmp';
  if (mime.includes('tiff')) return '.tiff';
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('wav')) return '.wav';
  return '.bin';
}

function safeMediaFilename(base, file) {
  const ext = mediaExtFromFile(file);
  const cleaned = String(base || 'file')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'file';
  return `${cleaned}${ext}`;
}

function fsIdbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FS_STORE)) db.createObjectStore(FS_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeProjectHandle(handle) {
  const db = await fsIdbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_STORE, 'readwrite');
    tx.objectStore(FS_STORE).put(handle, FS_PROJECT_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getStoredProjectHandle() {
  const db = await fsIdbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_STORE, 'readonly');
    const r = tx.objectStore(FS_STORE).get(FS_PROJECT_KEY);
    r.onsuccess = () => {
      db.close();
      resolve(r.result || null);
    };
    r.onerror = () => reject(r.error);
  });
}

async function ensureDirWritePermission(handle) {
  if (!handle) return false;
  let perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') return true;
  if (perm === 'prompt') {
    perm = await handle.requestPermission({ mode: 'readwrite' });
    return perm === 'granted';
  }
  return false;
}

async function getNestedDirHandle(segments, create = false) {
  let current = projectDirHandle;
  for (const seg of segments) {
    current = await current.getDirectoryHandle(seg, { create });
  }
  return current;
}

async function ensureDirReadPermission(handle) {
  if (!handle) return false;
  let perm = await handle.queryPermission({ mode: 'read' });
  if (perm === 'granted') return true;
  if (perm === 'prompt') {
    perm = await handle.requestPermission({ mode: 'read' });
    return perm === 'granted';
  }
  return false;
}

async function initProjectDiskAccess() {
  if (typeof window.showDirectoryPicker !== 'function') return false;
  try {
    projectDirHandle = await getStoredProjectHandle();
    if (!projectDirHandle) return false;
    diskApiReady = await ensureDirWritePermission(projectDirHandle);
    if (!diskApiReady) {
      diskApiReady = await ensureDirReadPermission(projectDirHandle);
    }
    return diskApiReady;
  } catch (err) {
    console.warn('initProjectDiskAccess', err);
    projectDirHandle = null;
    diskApiReady = false;
    return false;
  }
}

function reloadMediaAfterFolderLink() {
  mediaBlobCache.clear();
  warmMediaCache();
  renderAll();
  updateDiskSaveStatus('已关联项目文件夹，正在重新加载全景图…');
}

/** 首次或重新关联：选择含 index.html 的项目根文件夹 */
async function linkProjectFolder() {
  if (typeof window.showDirectoryPicker !== 'function') {
    throw new Error('当前浏览器不支持本地文件夹写入，请使用 Chrome 或 Edge 最新版。');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  projectDirHandle = handle;
  await storeProjectHandle(handle);
  diskApiReady = await ensureDirWritePermission(handle);
  if (!diskApiReady) throw new Error('未获得文件夹写入权限');
  updateDiskSaveStatus('已关联项目文件夹，可自动保存到 data/ 与 assets/。');
  return true;
}

async function ensureDiskReady(interactive = false) {
  if (diskApiReady && projectDirHandle) return true;
  if (!interactive) return false;
  try {
    await linkProjectFolder();
    return diskApiReady;
  } catch (err) {
    if (err?.name !== 'AbortError') alert('关联文件夹失败：' + (err.message || err));
    return false;
  }
}

async function readGalleryFromProject() {
  const dataDir = await getNestedDirHandle(['data'], false);
  const fileHandle = await dataDir.getFileHandle('gallery.json');
  const file = await fileHandle.getFile();
  return JSON.parse(await file.text());
}

function galleryDataToStorageString(forBrowser = false) {
  const payload = deepClone(galleryData);
  enforceLocalDeployPaths(payload);
  (payload.rooms || []).forEach((room) => {
    if (!forBrowser) {
      delete room.panoramaLocalKey;
      delete room.panoramaLocalName;
    }
    if (room.panoramaUrl && (String(room.panoramaUrl).startsWith('blob:') || String(room.panoramaUrl).startsWith('data:'))) {
      room.panoramaUrl = '';
    }
  });
  (payload.rooms || []).forEach((room) => {
    (room.hotspots || []).forEach((hs) => {
      if (hs.imageUrl && String(hs.imageUrl).startsWith('data:')) hs.imageUrl = '';
      if (hs.audioUrl && String(hs.audioUrl).startsWith('data:')) hs.audioUrl = '';
    });
  });
  return JSON.stringify(payload);
}

async function writeTextFile(dirSegments, filename, text) {
  const dir = await getNestedDirHandle(dirSegments, true);
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

function prepareGalleryForSave() {
  syncHotspotFromEditor({ silent: true });
  if ($('roomIdInput')) applyRoomEditor();
  syncSidebarUiFromDom();
}

async function persistToDisk(silent = true) {
  if (!galleryData) return false;
  if (diskApiReady) return saveToDisk(silent);
  if (projectDirHandle) {
    const writable = await ensureDirWritePermission(projectDirHandle);
    const readable = writable || await ensureDirReadPermission(projectDirHandle);
    if (readable) {
      diskApiReady = true;
      return saveToDisk(silent);
    }
  }
  return false;
}

async function persistGallery(silent = true) {
  if (!galleryData) return;
  prepareGalleryForSave();
  saveBrowserData(silent);
  await persistToDisk(silent);
}

async function saveToDisk(silent = true) {
  if (!galleryData) return false;
  if (!diskApiReady) {
    if (!silent) {
      const ok = await ensureDiskReady(true);
      if (!ok) {
        updateDiskSaveStatus('请先点击「关联项目文件夹」选择本项目目录。');
        return false;
      }
    } else {
      return false;
    }
  }
  try {
    prepareGalleryForSave();
    enforceLocalDeployPaths(galleryData);
    if ($('mediaBaseUrlInput')) $('mediaBaseUrlInput').value = DEPLOY_MEDIA_BASE_URL;
    const payload = JSON.parse(galleryDataToStorageString(false));
    const jsonText = JSON.stringify(payload, null, 2) + '\n';
    const bootText = `window.__DISK_GALLERY__=${JSON.stringify(payload)};\n`;
    await writeTextFile(['data'], 'gallery.json', jsonText);
    await writeTextFile(['data'], 'gallery.boot.js', bootText);
    lastDiskSaveAt = Date.now();
    localStorage.setItem(STORAGE_TS_KEY, String(lastDiskSaveAt));
    updateDiskSaveStatus(silent ? '已自动保存到 data/gallery.json' : '已保存到 data/gallery.json');
    if (!silent) alert('已写入 data/gallery.json 与 data/gallery.boot.js');
    return true;
  } catch (err) {
    console.warn('saveToDisk', err);
    const msg = `保存到本地失败：${err.message || err}`;
    updateDiskSaveStatus(msg);
    if (!silent) alert(msg);
    return false;
  }
}

function scheduleAutoSave() {
  if (!galleryData) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistGallery(true);
  }, PERSIST_DEBOUNCE_MS);
}

function saveBrowserData(silent = true) {
  if (!galleryData) return false;
  try {
    prepareGalleryForSave();
    enforceLocalDeployPaths(galleryData);
    localStorage.setItem(STORAGE_KEY, galleryDataToStorageString(true));
    localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
    if (!silent) {
      updateDiskSaveStatus(diskApiReady ? '已保存到浏览器与 data/gallery.json' : '已保存到浏览器（刷新不丢失）');
    }
    return true;
  } catch (err) {
    console.warn('saveBrowserData', err);
    if (!silent || err?.name === 'QuotaExceededError') {
      updateDiskSaveStatus('浏览器存储失败，请关联项目文件夹后保存到本地。');
    }
    return false;
  }
}

async function uploadMediaToDisk(file, folder, filename) {
  if (!diskApiReady) {
    const ok = await ensureDiskReady(true);
    if (!ok) throw new Error('请先关联项目文件夹');
  }
  const assetsDir = await getNestedDirHandle(['assets', folder], true);
  const fileHandle = await assetsDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return `${folder}/${filename}`;
}

/** 上传全景图 → assets/panoramas/，或暂存 IndexedDB */
async function assignPanoramaFromLocalFile(room, file) {
  if (!room || !file) return;
  if (diskApiReady) {
    try {
      const filename = safeMediaFilename(room.id || 'panorama', file);
      const relPath = await uploadMediaToDisk(file, 'panoramas', filename);
      room.panoramaUrl = relPath;
      delete room.panoramaLocalKey;
      delete room.panoramaLocalName;
      return;
    } catch (err) {
      console.warn('写入磁盘失败，改用浏览器暂存', err);
    }
  }
  const key = generatePanoramaStorageKey(room.id);
  await idbPutPanorama(key, file);
  room.panoramaLocalKey = key;
  room.panoramaLocalName = file.name;
  room.panoramaUrl = `panoramas/${safeMediaFilename(room.id || 'panorama', file)}`;
  mediaBlobCache.set(room.panoramaUrl, URL.createObjectURL(file));
}

/** 上传展品图 → assets/exhibits/ */
async function assignExhibitImageFromLocalFile(hotspot, file) {
  if (!hotspot || !file) return;
  const filename = safeMediaFilename(hotspot.id || 'exhibit', file);
  const relPath = await uploadMediaToDisk(file, 'exhibits', filename);
  hotspot.imageUrl = relPath;
}

let editorPanelOpen = false;
let editUnlocked = false;
let pendingEditorAuthAction = null;
const FALLBACK_DATA = window.DEFAULT_GALLERY_DATA || {
  project: {
    id: 'plant_digital_gallery',
    title: '万象植境｜Botanical Immersive Archive',
    subtitle: '360° 植物数字展厅浏览器编辑版',
    version: '0.3.0'
  },
  settings: { startRoomId: 'room_01_plant_gate', showHotspotLabels: true, mediaBaseUrl: 'assets/' },
  rooms: [
    {
      id: 'room_01_plant_gate',
      name: '植物之门',
      shortName: '序厅',
      theme: '项目序厅 / 世界观入口',
      panoramaUrl: '',
      bgmUrl: '',
      initialView: { yaw: 0, pitch: 0, hfov: 105 },
      hotspots: []
    }
  ],
  tourSequence: []
};

const $ = (id) => document.getElementById(id);
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

function readLegacyBrowserGallery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.rooms) && parsed.rooms.length) return parsed;
    }
  } catch (err) {
    console.warn('storage read', STORAGE_KEY, err);
  }
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.rooms) && parsed.rooms.length) return parsed;
    } catch (err) {
      console.warn('legacy storage read', key, err);
    }
  }
  return null;
}

function isRestorableMediaUrl(url) {
  const u = String(url ?? '').trim();
  if (!u) return false;
  if (u.startsWith('blob:') || u.startsWith('data:')) return false;
  return true;
}

/** 若 JSON 路径为空，尝试从浏览器旧暂存合并相对路径 */
function mergeRecoveredMediaPaths(stored) {
  return mergeGalleryPreferNonEmpty(galleryData, stored);
}

function galleryMediaScore(data) {
  if (!data?.rooms?.length) return -1;
  let score = 0;
  data.rooms.forEach((room) => {
    if (isRestorableMediaUrl(room.panoramaUrl)) score += 10;
    (room.hotspots || []).forEach((hs) => {
      if (isRestorableMediaUrl(hs.imageUrl)) score += 2;
      if (hs.title) score += 0.1;
      if (typeof hs.yaw === 'number') score += 0.05;
    });
  });
  return score;
}

function isEmptyValue(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** 将 source 中非空字段合并进 target（不覆盖已有内容） */
function mergeGalleryPreferNonEmpty(target, source) {
  if (!source?.rooms?.length || !target?.rooms?.length) return 0;
  let n = 0;
  const sourceMap = new Map(source.rooms.map((r) => [r.id, r]));
  target.rooms.forEach((room) => {
    const src = sourceMap.get(room.id);
    if (!src) return;
    if (isEmptyValue(room.panoramaUrl) && isRestorableMediaUrl(src.panoramaUrl)) {
      room.panoramaUrl = src.panoramaUrl;
      n++;
    }
    if (isEmptyValue(room.bgmUrl) && isRestorableMediaUrl(src.bgmUrl)) {
      room.bgmUrl = src.bgmUrl;
      n++;
    }
    ['name', 'shortName', 'theme', 'panoramaAlt', 'initialView'].forEach((field) => {
      if (isEmptyValue(room[field]) && !isEmptyValue(src[field])) {
        room[field] = deepClone(src[field]);
        n++;
      }
    });
    const srcHs = new Map((src.hotspots || []).map((h) => [h.id, h]));
    (room.hotspots || []).forEach((hs) => {
      const sh = srcHs.get(hs.id);
      if (!sh) return;
      ['imageUrl', 'audioUrl', 'title', 'subtitle', 'description', 'guideText', 'type', 'tags', 'infoBlocks', 'yaw', 'pitch', 'targetRoomId'].forEach((field) => {
        if (isEmptyValue(hs[field]) && !isEmptyValue(sh[field])) {
          hs[field] = deepClone(sh[field]);
          n++;
        }
      });
    });
  });
  if (source.settings && target.settings) {
    Object.keys(source.settings).forEach((key) => {
      if (isEmptyValue(target.settings[key]) && !isEmptyValue(source.settings[key])) {
        target.settings[key] = deepClone(source.settings[key]);
        n++;
      }
    });
  }
  return n;
}

async function pickInitialGalleryData(boot) {
  let disk = null;
  if (diskApiReady) {
    try {
      disk = await readGalleryFromProject();
    } catch (err) {
      console.warn('读取 gallery.json 失败', err);
    }
  }
  const browser = readLegacyBrowserGallery();
  const browserTs = Number(localStorage.getItem(STORAGE_TS_KEY) || 0);
  const diskScore = galleryMediaScore(disk);
  const bootScore = galleryMediaScore(boot);

  let best;
  let label;

  if (disk?.rooms?.length && diskScore >= bootScore) {
    best = deepClone(disk);
    label = 'gallery.json';
    mergeGalleryPreferNonEmpty(best, browser);
    mergeGalleryPreferNonEmpty(best, boot);
    mergeGalleryPreferNonEmpty(best, FALLBACK_DATA);
  } else if (boot?.rooms?.length) {
    best = deepClone(boot);
    label = 'gallery.boot.js';
    mergeGalleryPreferNonEmpty(best, browser);
    mergeGalleryPreferNonEmpty(best, disk);
    mergeGalleryPreferNonEmpty(best, FALLBACK_DATA);
  } else if (browser?.rooms?.length) {
    best = deepClone(browser);
    label = '浏览器暂存';
    mergeGalleryPreferNonEmpty(best, FALLBACK_DATA);
  } else {
    best = deepClone(FALLBACK_DATA);
    label = '内置默认';
  }

  if (!disk?.rooms?.length && !boot?.rooms?.length && browserTs > lastDiskSaveAt && browser?.rooms?.length) {
    mergeGalleryPreferNonEmpty(best, browser);
  }

  return { data: best, label };
}

async function legacyIdbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LEGACY_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_IDB_STORE)) {
        db.createObjectStore(LEGACY_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function generatePanoramaStorageKey(roomId) {
  return `pano_${String(roomId || 'room').replace(/\W/g, '_')}_${Date.now()}`;
}

async function idbPutPanorama(key, blob) {
  const db = await legacyIdbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LEGACY_IDB_STORE, 'readwrite');
    tx.objectStore(LEGACY_IDB_STORE).put(blob, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetPanorama(key) {
  const db = await legacyIdbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LEGACY_IDB_STORE, 'readonly');
    const r = tx.objectStore(LEGACY_IDB_STORE).get(key);
    r.onsuccess = () => {
      db.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
  });
}

async function tryLoadPanoramaFromIdb(storedPath) {
  const path = String(storedPath ?? '').trim();
  if (!path || !galleryData?.rooms?.length) return '';
  const room = galleryData.rooms.find((r) => r.panoramaUrl === path && r.panoramaLocalKey);
  if (!room?.panoramaLocalKey) return '';
  try {
    const blob = await idbGetPanorama(room.panoramaLocalKey);
    if (blob instanceof Blob && blob.size > 0) {
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('IndexedDB 全景读取失败', room.panoramaLocalKey, err);
  }
  return '';
}

async function recoverLegacyPanoramasFromIdb() {
  if (!diskApiReady) return 0;
  const legacy = readLegacyBrowserGallery();
  if (!legacy) return 0;
  let saved = 0;
  for (const room of legacy.rooms || []) {
    if (!room.panoramaLocalKey) continue;
    try {
      const db = await legacyIdbOpen();
      const blob = await new Promise((resolve, reject) => {
        const tx = db.transaction(LEGACY_IDB_STORE, 'readonly');
        const r = tx.objectStore(LEGACY_IDB_STORE).get(room.panoramaLocalKey);
        r.onsuccess = () => {
          db.close();
          resolve(r.result);
        };
        r.onerror = () => reject(r.error);
      });
      if (!(blob instanceof Blob)) continue;
      const filename = safeMediaFilename(room.id, { name: room.panoramaLocalName || `${room.id}.jpg`, type: blob.type });
      const rel = await uploadMediaToDisk(blob, 'panoramas', filename);
      const target = galleryData.rooms.find((r) => r.id === room.id);
      if (target && !target.panoramaUrl) {
        target.panoramaUrl = rel;
        saved++;
      }
    } catch (err) {
      console.warn('recover panorama', room.id, err);
    }
  }
  return saved;
}

async function init() {
  await initProjectDiskAccess();
  const boot = window.__DISK_GALLERY__ && Array.isArray(window.__DISK_GALLERY__.rooms) ? window.__DISK_GALLERY__ : null;

  const picked = await pickInitialGalleryData(boot);
  galleryData = enforceLocalDeployPaths(picked.data);
  console.info(`展厅数据来自：${picked.label}（${galleryData.rooms.length} 个展厅）`);

  ensureDataShape();

  const legacy = readLegacyBrowserGallery();
  const merged = mergeGalleryPreferNonEmpty(galleryData, legacy);
  if (merged > 0) {
    console.info(`已从浏览器旧暂存补充 ${merged} 条字段。`);
    updateDiskSaveStatus(`已从浏览器旧暂存补充 ${merged} 条数据；查看无需关联文件夹，编辑写回时再关联。`);
    if (diskApiReady) void persistGallery(true);
  }

  if (diskApiReady && legacy) {
    const panoSaved = await recoverLegacyPanoramasFromIdb();
    if (panoSaved > 0) {
      console.info(`已从 IndexedDB 导出 ${panoSaved} 张全景到 assets/panoramas/`);
      await persistGallery(true);
    }
  }

  const startId = galleryData.settings?.startRoomId;
  const foundIndex = galleryData.rooms.findIndex((room) => room.id === startId);
  currentRoomIndex = foundIndex >= 0 ? foundIndex : 0;
  selectedHotspotId = getCurrentRoom().hotspots?.[0]?.id || null;

  editUnlocked = sessionStorage.getItem(EDIT_SESSION_KEY) === '1';
  editorPanelOpen = false;

  bindEvents();
  warmMediaCache();
  renderAll();
  syncEditorPanelClass();
  applyEditLockUi();
  updateDiskSaveStatus();
  void persistGallery(true);

  const panoCount = galleryData.rooms.filter((r) => isRestorableMediaUrl(r.panoramaUrl)).length;
  if (panoCount > 0 && diskApiReady) {
    updateDiskSaveStatus(`已加载 ${panoCount} 个展厅；修改自动写入 data/gallery.json`);
  }
}

function ensureDataShape() {
  galleryData.project ||= {};
  galleryData.settings ||= {};
  galleryData.rooms ||= [];
  if (!galleryData.rooms.length) galleryData.rooms.push(deepClone(FALLBACK_DATA.rooms[0]));
  galleryData.rooms.forEach((room, index) => {
    room.id ||= `room_${String(index + 1).padStart(2, '0')}`;
    room.name ||= `展厅 ${index + 1}`;
    room.shortName ||= room.name;
    room.theme ||= '';
    room.panoramaUrl ||= '';
    room.bgmUrl ||= '';
    room.initialView ||= { yaw: 0, pitch: 0, hfov: 105 };
    room.hotspots ||= [];
    room.hotspots.forEach((hotspot, hIndex) => {
      hotspot.id ||= `P${String(hIndex + 1).padStart(3, '0')}`;
      hotspot.title ||= `热点 ${hIndex + 1}`;
      hotspot.subtitle ||= '';
      hotspot.type ||= 'exhibit';
      hotspot.yaw = Number(hotspot.yaw ?? 0);
      hotspot.pitch = Number(hotspot.pitch ?? 0);
      hotspot.imageUrl ||= '';
      hotspot.audioUrl ||= '';
      hotspot.description ||= '';
      hotspot.guideText ||= '';
      hotspot.tags ||= [];
      hotspot.infoBlocks ||= [];
      hotspot.targetRoomId ||= '';
    });
  });
  galleryData.tourSequence ||= [];
  galleryData.ui ||= {};
  enforceLocalDeployPaths(galleryData);
  galleryData.ui.brandEyebrow ||= 'Botanical Immersive Archive';
  galleryData.ui.sectionRooms ||= '展区切换';
  galleryData.ui.helpTitle ||= '定位热点';
  galleryData.ui.helpSteps ||= [
    '先选择或新增一个热点。',
    '点击“开启点击定位”。',
    '在全景图任意位置点击，即可把热点放到那里。',
    '也可以直接填写 yaw / pitch 数值微调。'
  ];

  galleryData.rooms.forEach((room) => {
    if (room.panoramaUrl && (String(room.panoramaUrl).startsWith('blob:') || String(room.panoramaUrl).startsWith('data:'))) {
      room.panoramaUrl = '';
    }
    (room.hotspots || []).forEach((hs) => {
      if (hs.imageUrl && String(hs.imageUrl).startsWith('data:')) hs.imageUrl = '';
      if (hs.audioUrl && String(hs.audioUrl).startsWith('data:')) hs.audioUrl = '';
    });
  });
}

function schedulePanoramaResize() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        if (viewer && typeof viewer.resize === 'function') viewer.resize();
      } catch (err) {
        console.warn('pannellum resize', err);
      }
    });
  });
}

function syncEditorPanelClass() {
  const shell = $('appShell');
  if (!shell) return;
  if (!editUnlocked) editorPanelOpen = false;
  const collapsed = !editUnlocked || !editorPanelOpen;
  shell.classList.toggle('editor-panel-collapsed', collapsed);
  schedulePanoramaResize();
}

function updateToggleEditorButton() {
  const btn = $('toggleEditorPanelBtn');
  if (!btn) return;
  if (!editUnlocked) {
    btn.textContent = '解锁并展开编辑';
    return;
  }
  btn.textContent = editorPanelOpen ? '收起编辑面板' : '展开编辑面板';
}

function applyEditLockUi() {
  document.body.classList.toggle('edit-unlocked', editUnlocked);

  ['sidebarBrandEyebrow', 'projectTitle', 'projectSubtitle', 'sidebarSectionRoomsTitle', 'sidebarHelpTitle'].forEach((id) => {
    const el = $(id);
    if (el) el.contentEditable = editUnlocked ? 'true' : 'false';
  });
  document.querySelectorAll('#sidebarHelpSteps li').forEach((li) => {
    li.contentEditable = editUnlocked ? 'true' : 'false';
  });

  const right = $('rightEditorPanel');
  if (right) {
    const enableRight = editUnlocked && editorPanelOpen;
    right.querySelectorAll('input, textarea, button, select').forEach((ctrl) => {
      ctrl.disabled = !enableRight;
    });
  }

  const addRoomBtn = $('addRoomBtn');
  if (addRoomBtn) addRoomBtn.disabled = !editUnlocked;
  const addRoomLinkBtn = $('addRoomLinkHotspotBtn');
  if (addRoomLinkBtn) addRoomLinkBtn.disabled = !editUnlocked;

  const locateBtn = $('locateModeBtn');
  if (locateBtn) locateBtn.disabled = !editUnlocked;

  updateToggleEditorButton();
}

function openEditAuthDialog(onSuccess) {
  pendingEditorAuthAction = typeof onSuccess === 'function' ? onSuccess : null;
  const dlg = $('editAuthDialog');
  const err = $('editAuthError');
  if (err) err.hidden = true;
  const input = $('editAuthInput');
  if (input && dlg) {
    input.value = '';
    dlg.addEventListener('close', refocusEditorToggleBtn, { once: true });
    dlg.showModal();
    requestAnimationFrame(() => input.focus());
  } else if (dlg) dlg.showModal();
}

function refocusEditorToggleBtn() {
  $('toggleEditorPanelBtn')?.focus();
}

function completeEditAuth(success) {
  const err = $('editAuthError');
  if (!success) {
    if (err) err.hidden = false;
    return;
  }
  if (err) err.hidden = true;
  editUnlocked = true;
  sessionStorage.setItem(EDIT_SESSION_KEY, '1');
  if (pendingEditorAuthAction) pendingEditorAuthAction();
  pendingEditorAuthAction = null;
  syncEditorPanelClass();
  applyEditLockUi();
  $('editAuthDialog')?.close();
}

function renderSidebarUi() {
  const ui = galleryData.ui || {};
  const safeSet = (id, value) => {
    const el = $(id);
    if (!el || document.activeElement === el) return;
    el.textContent = value ?? '';
  };
  safeSet('sidebarBrandEyebrow', ui.brandEyebrow);
  safeSet('sidebarSectionRoomsTitle', ui.sectionRooms);
  safeSet('sidebarHelpTitle', ui.helpTitle);

  const ol = $('sidebarHelpSteps');
  if (!ol || ol.contains(document.activeElement)) return;
  ol.innerHTML = '';
  (ui.helpSteps || []).forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    li.contentEditable = editUnlocked ? 'true' : 'false';
    ol.appendChild(li);
  });
}

function syncSidebarUiFromDom() {
  if (!editUnlocked || !galleryData) return;
  galleryData.ui ||= {};
  const t = (id) => ($(id)?.textContent ?? '').trim();
  if ($('sidebarBrandEyebrow')) galleryData.ui.brandEyebrow = t('sidebarBrandEyebrow') || galleryData.ui.brandEyebrow;
  if ($('sidebarSectionRoomsTitle')) galleryData.ui.sectionRooms = t('sidebarSectionRoomsTitle') || galleryData.ui.sectionRooms;
  if ($('sidebarHelpTitle')) galleryData.ui.helpTitle = t('sidebarHelpTitle') || galleryData.ui.helpTitle;
  galleryData.ui.helpSteps = Array.from(document.querySelectorAll('#sidebarHelpSteps li'))
    .map((li) => li.textContent.trim())
    .filter(Boolean);
}

function isRoomLinkHotspot(hotspot) {
  return !!(hotspot && hotspot.type === HOTSPOT_TYPE_ROOM_LINK);
}

function resolveRoomLinkTargetIndex(hotspot) {
  const rooms = galleryData.rooms || [];
  if (!rooms.length) return 0;
  const tid = (hotspot?.targetRoomId || '').trim();
  if (tid) {
    const idx = rooms.findIndex((r) => r.id === tid);
    if (idx >= 0) return idx;
  }
  return (currentRoomIndex + 1) % rooms.length;
}

function navigateRoomFromHotspot(hotspot) {
  if ((galleryData.rooms || []).length <= 1) {
    alert('只有一个展厅，无法跳转。');
    return;
  }
  loadRoom(resolveRoomLinkTargetIndex(hotspot));
}

function formatRoomLinkListSubtitle(hotspot) {
  const tid = (hotspot.targetRoomId || '').trim();
  if (!tid) return '→ 下一展厅（顺序）';
  const room = galleryData.rooms.find((r) => r.id === tid);
  return room ? `→ ${room.name}` : '→ 指定展厅';
}

function buildTargetRoomSelectHtml(selectedId) {
  let html = '<option value="">下一个展厅（按列表顺序循环）</option>';
  (galleryData.rooms || []).forEach((r) => {
    const sel = r.id === selectedId ? ' selected' : '';
    html += `<option value="${escapeAttr(r.id)}"${sel}>${escapeHtml(r.name)} — ${escapeHtml(r.id)}</option>`;
  });
  return html;
}

function toggleRoomLinkEditorFields(isRoomLink) {
  const subRow = $('hsSubtypeRow');
  const trRow = $('hsTargetRoomRow');
  const previewBtn = $('previewHotspotBtn');
  if (subRow) subRow.style.display = isRoomLink ? 'none' : '';
  if (trRow) trRow.style.display = isRoomLink ? 'block' : 'none';
  if (previewBtn) previewBtn.textContent = isRoomLink ? '试跳转展厅' : '预览弹窗';
}

function bindEvents() {
  $('toggleEditorPanelBtn').addEventListener('click', () => {
    if (!editUnlocked) {
      openEditAuthDialog(() => {
        editorPanelOpen = true;
      });
      return;
    }
    editorPanelOpen = !editorPanelOpen;
    syncEditorPanelClass();
    applyEditLockUi();
  });

  $('editAuthForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const val = ($('editAuthInput')?.value ?? '').trim();
    if (val !== EDIT_PASSWORD) {
      completeEditAuth(false);
      return;
    }
    completeEditAuth(true);
  });

  $('editAuthCancel')?.addEventListener('click', () => {
    pendingEditorAuthAction = null;
    $('editAuthDialog')?.close();
  });

  $('editAuthInput')?.addEventListener('input', () => {
    const err = $('editAuthError');
    if (err) err.hidden = true;
  });

  document.querySelector('.left-panel')?.addEventListener(
    'blur',
    (event) => {
      if (!editUnlocked) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      galleryData.ui ||= {};
      if (target.id === 'sidebarBrandEyebrow') galleryData.ui.brandEyebrow = target.textContent.trim();
      if (target.id === 'sidebarSectionRoomsTitle') galleryData.ui.sectionRooms = target.textContent.trim();
      if (target.id === 'sidebarHelpTitle') galleryData.ui.helpTitle = target.textContent.trim();
      if (target.id === 'projectTitle') {
        galleryData.project.title = target.textContent.trim() || galleryData.project.title;
        $('projectTitleInput').value = galleryData.project.title;
      }
      if (target.id === 'projectSubtitle') {
        galleryData.project.subtitle = target.textContent.trim() || galleryData.project.subtitle;
        $('projectSubtitleInput').value = galleryData.project.subtitle;
      }
      if (target.matches('#sidebarHelpSteps li')) {
        galleryData.ui.helpSteps = Array.from(document.querySelectorAll('#sidebarHelpSteps li')).map((li) => li.textContent.trim());
      }
      updateDiskSaveStatus('侧栏或项目标题已修改。');
      scheduleAutoSave();
    },
    true
  );

  $('projectTitleInput').addEventListener('input', () => {
    galleryData.project.title = $('projectTitleInput').value.trim();
    renderProjectHeader();
    updateDiskSaveStatus('项目标题已修改。');
    scheduleAutoSave();
  });
  $('projectSubtitleInput').addEventListener('input', () => {
    galleryData.project.subtitle = $('projectSubtitleInput').value.trim();
    renderProjectHeader();
    updateDiskSaveStatus('项目副标题已修改。');
    scheduleAutoSave();
  });
  $('mediaBaseUrlInput')?.addEventListener('input', () => {
    if (!galleryData) return;
    enforceLocalDeployPaths(galleryData);
    $('mediaBaseUrlInput').value = DEPLOY_MEDIA_BASE_URL;
    renderPanorama(getCurrentRoom(), { preserveView: true });
    scheduleAutoSave();
  });

  $('applyRoomBtn').addEventListener('click', () => {
    applyRoomEditor();
    loadRoom(currentRoomIndex, { keepView: true });
    void persistGallery(false);
  });

  $('addRoomBtn').addEventListener('click', addRoom);
  $('addRoomLinkHotspotBtn')?.addEventListener('click', addRoomLinkHotspot);
  $('duplicateRoomBtn').addEventListener('click', () => {
    duplicateRoom();
  });
  $('deleteRoomBtn').addEventListener('click', deleteRoom);

  $('panoramaUploadInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const room = getCurrentRoom();
      await assignPanoramaFromLocalFile(room, file);
      loadRoom(currentRoomIndex, { keepSelection: true });
      await persistGallery(false);
      updateDiskSaveStatus(room.panoramaLocalKey
        ? `全景已暂存浏览器（${room.panoramaUrl}）；关联文件夹可写入 assets/`
        : `全景已写入 assets/${room.panoramaUrl}`);
    } catch (err) {
      alert('上传全景失败：' + (err.message || err));
    }
    event.target.value = '';
  });

  $('addHotspotBtn').addEventListener('click', addHotspot);

  $('exportJsonBtn').addEventListener('click', exportJson);

  $('importJsonInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported.rooms)) throw new Error('JSON 中缺少 rooms 数组。');
      galleryData = enforceLocalDeployPaths(imported);
      ensureDataShape();
      currentRoomIndex = 0;
      selectedHotspotId = getCurrentRoom().hotspots?.[0]?.id || null;
      renderAll();
      await persistGallery(false);
      alert('JSON 已导入并写入磁盘。');
    } catch (err) {
      alert('导入失败：' + err.message);
    }
    event.target.value = '';
  });

  $('linkProjectBtn')?.addEventListener('click', async () => {
    try {
      await linkProjectFolder();
      try {
        const disk = await readGalleryFromProject();
        mergeGalleryPreferNonEmpty(galleryData, disk);
        await persistGallery(false);
      } catch (err) {
        console.warn('关联后读取 gallery.json 失败，保留当前内存数据。', err);
        await persistGallery(false);
      }
      reloadMediaAfterFolderLink();
      updateDiskSaveStatus('已关联项目文件夹，当前编辑已合并保存。');
    } catch (err) {
      if (err?.name !== 'AbortError') alert('关联失败：' + (err.message || err));
    }
  });

  $('saveDiskBtn')?.addEventListener('click', () => {
    void persistGallery(false);
  });

  $('reloadDiskBtn')?.addEventListener('click', async () => {
    if (!diskApiReady && !(await ensureDiskReady(true))) return;
    if (!confirm('放弃未保存修改，从 data/gallery.json 重新加载？')) return;
    try {
      galleryData = await readGalleryFromProject();
      ensureDataShape();
      mergeGalleryPreferNonEmpty(galleryData, readLegacyBrowserGallery());
      currentRoomIndex = 0;
      selectedHotspotId = getCurrentRoom().hotspots?.[0]?.id || null;
      saveBrowserData(true);
      await persistToDisk(true);
      renderAll();
      updateDiskSaveStatus('已从本地重新加载。');
    } catch (err) {
      alert('重新加载失败：' + err.message);
    }
  });

  $('toggleLabelsBtn').addEventListener('click', () => {
    showHotspotLabels = !showHotspotLabels;
    document.body.classList.toggle('hide-hotspot-labels', !showHotspotLabels);
    $('toggleLabelsBtn').textContent = `热点标签：${showHotspotLabels ? '开' : '关'}`;
  });

  $('locateModeBtn').addEventListener('click', () => {
    locateMode = !locateMode;
    document.body.classList.toggle('locate-mode', locateMode);
    $('locateModeBtn').textContent = `点击定位：${locateMode ? '开' : '关'}`;
  });

  $('panorama').addEventListener('click', (event) => {
    if (!locateMode) return;
    if (event.target.closest('.custom-hotspot')) return;
    if (!viewer) return alert('请先加载全景图。');
    const hotspot = getSelectedHotspot();
    if (!hotspot) return alert('请先选择或新增一个热点。');
    const coords = getCoordsFromMouseEvent(event);
    hotspot.pitch = roundCoord(coords.pitch);
    hotspot.yaw = roundCoord(coords.yaw);
    renderPanorama(getCurrentRoom(), { preserveView: true });
    renderHotspots();
    renderHotspotEditor();
    updateSelectionReadout();
    scheduleAutoSave();
  });

  $('prevRoomArrow').addEventListener('click', () => switchRoomByOffset(-1));
  $('nextRoomArrow').addEventListener('click', () => switchRoomByOffset(1));

  $('startTourBtn').addEventListener('click', () => {
    if (tourTimer) stopTour();
    else startTour();
  });

  $('closeDialogBtn').addEventListener('click', () => $('exhibitDialog').close());

  $('rightEditorPanel')?.addEventListener('input', () => {
    if (editUnlocked) scheduleAutoSave();
  });
  $('rightEditorPanel')?.addEventListener('change', () => {
    if (editUnlocked) scheduleAutoSave();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void persistGallery(true);
  });
  window.addEventListener('pagehide', () => {
    void persistGallery(true);
  });
}

function renderAll() {
  renderProjectHeader();
  renderProjectEditor();
  renderSidebarUi();
  renderRooms();
  loadRoom(currentRoomIndex, { keepSelection: true });
}

function renderProjectHeader() {
  const titleEl = $('projectTitle');
  const subEl = $('projectSubtitle');
  const title = galleryData.project?.title || '万象植境';
  const subtitle = galleryData.project?.subtitle || '植物数字展厅编辑器';
  if (titleEl && document.activeElement !== titleEl) titleEl.textContent = title;
  if (subEl && document.activeElement !== subEl) subEl.textContent = subtitle;
}

function renderProjectEditor() {
  $('projectTitleInput').value = galleryData.project?.title || '';
  $('projectSubtitleInput').value = galleryData.project?.subtitle || '';
  const mb = $('mediaBaseUrlInput');
  if (mb) {
    mb.value = DEPLOY_MEDIA_BASE_URL;
    mb.readOnly = true;
    mb.setAttribute('aria-readonly', 'true');
  }
}

function renderRooms() {
  const list = $('roomList');
  list.innerHTML = '';
  galleryData.rooms.forEach((room, index) => {
    const btn = document.createElement('button');
    btn.className = 'room-btn' + (index === currentRoomIndex ? ' active' : '');
    btn.innerHTML = `<strong>${escapeHtml(room.name)}</strong><span class="short">${escapeHtml(room.shortName || room.theme || room.id)}</span>`;
    btn.addEventListener('click', () => loadRoom(index));
    list.appendChild(btn);
  });
}

function loadRoom(index, options = {}) {
  syncHotspotFromEditor({ silent: true });
  currentRoomIndex = clamp(index, 0, galleryData.rooms.length - 1);
  const room = getCurrentRoom();
  if (!options.keepSelection || !(room.hotspots || []).some((h) => h.id === selectedHotspotId)) {
    selectedHotspotId = room.hotspots?.[0]?.id || null;
  }
  $('currentRoomTitle').textContent = room.name;
  renderRooms();
  renderRoomEditor();
  renderHotspots();
  renderHotspotEditor();
  renderPanorama(room, { preserveView: options.keepView });
  updateSelectionReadout();
}

function renderRoomEditor() {
  const room = getCurrentRoom();
  $('roomIdInput').value = room.id || '';
  $('roomNameInput').value = room.name || '';
  $('roomShortNameInput').value = room.shortName || '';
  $('roomThemeInput').value = room.theme || '';
  $('roomBgmInput').value = room.bgmUrl || '';
  $('panoramaUrlInput').value = room.panoramaUrl && !room.panoramaUrl.startsWith('data:') && !room.panoramaUrl.startsWith('blob:')
    ? room.panoramaUrl
    : '';
  updatePanoramaResolvedHint();
}

function updatePanoramaResolvedHint() {
  const el = $('panoramaResolvedHint');
  if (!el) return;
  const room = getCurrentRoom();
  const raw = String(room.panoramaUrl ?? '').trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) {
    el.hidden = true;
    return;
  }
  const resolved = resolveMediaUrl(raw);
  el.textContent = resolved ? `实际请求：${resolved}` : '';
  el.hidden = !resolved;
}

function applyRoomEditor() {
  const room = getCurrentRoom();
  const oldId = room.id;
  const newId = slugOrFallback($('roomIdInput').value, oldId || `room_${currentRoomIndex + 1}`);
  room.id = uniqueRoomId(newId, oldId);
  room.name = $('roomNameInput').value.trim() || room.name || '未命名展厅';
  room.shortName = $('roomShortNameInput').value.trim() || room.shortName || room.name;
  room.theme = $('roomThemeInput').value.trim();
  room.bgmUrl = normalizeDeployMediaPath($('roomBgmInput').value);
  const url = $('panoramaUrlInput').value.trim();
  if (url) room.panoramaUrl = normalizeDeployMediaPath(url);
  enforceLocalDeployPaths(galleryData);
  if ($('mediaBaseUrlInput')) $('mediaBaseUrlInput').value = DEPLOY_MEDIA_BASE_URL;

  galleryData.tourSequence = (galleryData.tourSequence || []).map((step) => step.roomId === oldId ? { ...step, roomId: room.id } : step);
  if (galleryData.settings?.startRoomId === oldId) galleryData.settings.startRoomId = room.id;
}

function renderPanorama(room, options = {}) {
  void renderPanoramaAsync(room, options);
}

async function renderPanoramaAsync(room, options = {}) {
  const viewState = getViewState();
  if (viewer) {
    try { viewer.destroy(); } catch (err) { console.warn(err); }
    viewer = null;
  }
  const panoramaNode = $('panorama');
  panoramaNode.innerHTML = '';

  if (!room.panoramaUrl) {
    panoramaNode.appendChild(createEmptyState(room));
    return;
  }

  const loadingEl = document.createElement('div');
  loadingEl.className = 'empty-state panorama-loading';
  loadingEl.innerHTML = '<div class="empty-card"><p class="eyebrow">Loading</p><h2>全景图加载中…</h2></div>';
  panoramaNode.appendChild(loadingEl);

  const hotSpots = (room.hotspots || []).map((hotspot) => ({
    pitch: Number(hotspot.pitch || 0),
    yaw: Number(hotspot.yaw || 0),
    cssClass:
      'custom-hotspot' +
      (isRoomLinkHotspot(hotspot) ? ' custom-hotspot-arrow' : '') +
      (hotspot.id === selectedHotspotId ? ' selected' : ''),
    createTooltipFunc: createHotspotElement,
    createTooltipArgs: hotspot,
    clickHandlerFunc: () => {
      selectedHotspotId = hotspot.id;
      renderHotspots();
      renderHotspotEditor();
      updateSelectionReadout();
      void openExhibit(hotspot);
    }
  }));

  let panoLoadUrl;
  try {
    panoLoadUrl = await ensureLoadableMediaUrl(room.panoramaUrl, room);
  } catch (err) {
    console.error(err);
    panoramaNode.innerHTML = '';
    panoramaNode.appendChild(createEmptyState(room, '全景图加载失败。请确认 assets/panoramas/ 中文件存在。'));
    return;
  }

  if (!panoLoadUrl || !isPanoramaLoadUrl(panoLoadUrl)) {
    panoramaNode.innerHTML = '';
    const hint = `找不到全景图「${room.panoramaUrl}」。请检查项目内 assets/panoramas/ 文件名，或重新上传。`;
    panoramaNode.appendChild(createEmptyState(room, hint));
    return;
  }

  panoramaNode.innerHTML = '';

  try {
    const initial = options.preserveView && viewState ? viewState : room.initialView;
    viewer = pannellum.viewer('panorama', {
      type: 'equirectangular',
      panorama: panoLoadUrl,
      autoLoad: true,
      showControls: true,
      yaw: initial?.yaw ?? 0,
      pitch: initial?.pitch ?? 0,
      hfov: initial?.hfov ?? 105,
      sceneFadeDuration: galleryData.settings?.defaultSceneFadeDuration || 800,
      hotSpots
    });
  } catch (err) {
    console.error(err);
    if (panoLoadUrl) {
      renderFlatPanoramaFallback(room, panoLoadUrl);
    } else {
      panoramaNode.appendChild(createEmptyState(room, '全景图加载失败。请确认 assets/panoramas/ 中文件存在。'));
    }
  }
}

function createEmptyState(room, message) {
  const state = document.createElement('div');
  state.className = 'empty-state';
  state.innerHTML = `
    <div class="empty-card">
      <p class="eyebrow">${escapeHtml(room.id)}</p>
      <h2>${escapeHtml(message || room.panoramaAlt || '请填入或上传当前展区的 360° 全景图')}</h2>
      <p>推荐上传 2:1 等距柱状投影图。上传后即可在这里拖拽查看。</p>
    </div>
  `;
  return state;
}

function renderFlatPanoramaFallback(room, imageUrl) {
  const panoramaNode = $('panorama');
  panoramaNode.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flat-panorama-fallback';
  wrap.innerHTML = `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(room.panoramaAlt || room.name || 'panorama')}" />`;
  (room.hotspots || []).forEach((hotspot) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-hotspot flat-hotspot' + (isRoomLinkHotspot(hotspot) ? ' custom-hotspot-arrow' : '');
    btn.dataset.label = hotspot.title || hotspot.id;
    btn.title = hotspot.title || hotspot.id;
    const x = clamp((Number(hotspot.yaw || 0) + 180) / 360 * 100, 2, 98);
    const y = clamp((90 - Number(hotspot.pitch || 0)) / 180 * 100, 6, 94);
    btn.style.left = `${x}%`;
    btn.style.top = `${y}%`;
    btn.addEventListener('click', () => {
      selectedHotspotId = hotspot.id;
      renderHotspots();
      renderHotspotEditor();
      updateSelectionReadout();
      void openExhibit(hotspot);
    });
    wrap.appendChild(btn);
  });
  panoramaNode.appendChild(wrap);
}

function createHotspotElement(div, hotspot) {
  div.classList.add('custom-hotspot');
  if (isRoomLinkHotspot(hotspot)) div.classList.add('custom-hotspot-arrow');
  if (hotspot.id === selectedHotspotId) div.classList.add('selected');
  div.dataset.label = hotspot.title || hotspot.id;
  div.title = `${hotspot.title || hotspot.id}\nyaw: ${hotspot.yaw}, pitch: ${hotspot.pitch}`;
}

function renderHotspots() {
  const room = getCurrentRoom();
  const list = $('hotspotList');
  list.innerHTML = '';
  (room.hotspots || []).forEach((hotspot) => {
    const btn = document.createElement('button');
    btn.className = 'hotspot-btn' + (hotspot.id === selectedHotspotId ? ' active' : '');
    const subLine = isRoomLinkHotspot(hotspot)
      ? `${escapeHtml(formatRoomLinkListSubtitle(hotspot))}｜yaw ${hotspot.yaw} / pitch ${hotspot.pitch}`
      : `${escapeHtml(hotspot.subtitle || hotspot.id)}｜yaw ${hotspot.yaw} / pitch ${hotspot.pitch}`;
    btn.innerHTML = `<strong>${escapeHtml(hotspot.title || hotspot.id)}</strong><span class="sub">${subLine}</span>`;
    btn.addEventListener('click', () => {
      syncHotspotFromEditor({ silent: true });
      selectedHotspotId = hotspot.id;
      if (viewer) viewer.lookAt(Number(hotspot.pitch || 0), Number(hotspot.yaw || 0), 80, 900);
      renderHotspots();
      renderHotspotEditor();
      renderPanorama(getCurrentRoom(), { preserveView: true });
      updateSelectionReadout();
    });
    list.appendChild(btn);
  });
}

function renderHotspotEditor() {
  const container = $('hotspotEditor');
  const hotspot = getSelectedHotspot();
  if (!hotspot) {
    container.className = 'hotspot-editor empty-editor';
    container.innerHTML = '<p class="hint">当前展厅还没有热点。点击「+ 热点」新增展品，或「+ 展厅箭头」添加跳转下一展厅的箭头热点。</p>';
    applyEditLockUi();
    return;
  }

  const isRl = isRoomLinkHotspot(hotspot);
  const exhibitTypeVal =
    isRl ? 'exhibit' : (hotspot.type && hotspot.type !== HOTSPOT_TYPE_ROOM_LINK ? hotspot.type : 'exhibit');
  container.className = 'hotspot-editor';
  container.innerHTML = `
    <div class="editor-card">
      <div class="form-grid">
        <label class="field-label">热点 ID<input id="hsIdInput" class="text-input" value="${escapeAttr(hotspot.id)}" /></label>
        <label class="field-label full-span">热点用途
          <select id="hsTypeSelect" class="text-input">
            <option value="exhibit"${isRl ? '' : ' selected'}>展品 / 信息页</option>
            <option value="${HOTSPOT_TYPE_ROOM_LINK}"${isRl ? ' selected' : ''}>展厅跳转（箭头）</option>
          </select>
        </label>
        <label class="field-label full-span" id="hsSubtypeRow" style="display:${isRl ? 'none' : 'block'}">展示分类<input id="hsSubtypeInput" class="text-input" value="${escapeAttr(exhibitTypeVal)}" placeholder="如 exhibit、concept_installation" /></label>
        <label class="field-label full-span" id="hsTargetRoomRow" style="display:${isRl ? 'block' : 'none'}">跳转目标<select id="hsTargetRoomSelect" class="text-input">${buildTargetRoomSelectHtml(hotspot.targetRoomId)}</select></label>
        <label class="field-label">标题<input id="hsTitleInput" class="text-input" value="${escapeAttr(hotspot.title || '')}" /></label>
        <label class="field-label">副标题<input id="hsSubtitleInput" class="text-input" value="${escapeAttr(hotspot.subtitle || '')}" /></label>
        <div class="number-pair full-span">
          <label class="field-label">Yaw 左右角度<input id="hsYawInput" class="number-input" type="number" step="0.1" value="${Number(hotspot.yaw || 0)}" /></label>
          <label class="field-label">Pitch 上下角度<input id="hsPitchInput" class="number-input" type="number" step="0.1" value="${Number(hotspot.pitch || 0)}" /></label>
        </div>
        <label class="field-label full-span">展品图 URL<textarea id="hsImageInput" class="url-input" placeholder="粘贴展品图 URL">${escapeHtml(hotspot.imageUrl && !hotspot.imageUrl.startsWith('data:') ? hotspot.imageUrl : '')}</textarea></label>
        <label class="field-label full-span">语音 URL<input id="hsAudioInput" class="text-input" value="${escapeAttr(hotspot.audioUrl || '')}" placeholder="可选，后续用于语音讲解" /></label>
        <label class="field-label full-span">简介<textarea id="hsDescriptionInput" class="url-input">${escapeHtml(hotspot.description || '')}</textarea></label>
        <label class="field-label full-span">讲解词<textarea id="hsGuideInput" class="url-input">${escapeHtml(hotspot.guideText || '')}</textarea></label>
      </div>

      <div class="button-row">
        <button id="saveHotspotBtn" class="primary-btn">保存热点 / 信息页</button>
        <button id="useCurrentViewBtn" class="ghost-green-btn">使用当前视角定位</button>
        <label class="file-btn">
          上传展品图
          <input id="exhibitUploadInput" type="file" accept="image/*" hidden />
        </label>
        <button id="previewHotspotBtn" type="button" class="ghost-green-btn">${isRl ? '试跳转展厅' : '预览弹窗'}</button>
        <button id="deleteHotspotBtn" class="danger-btn">删除热点</button>
      </div>

      <div class="divider"></div>
      <div class="section-title row-title"><span>标签</span><button id="addTagBtn" class="mini-btn">+ 标签</button></div>
      <div id="tagEditorList"></div>

      <div class="divider"></div>
      <div class="section-title row-title"><span>自定义信息块</span><button id="addInfoBlockBtn" class="mini-btn">+ 信息</button></div>
      <div id="infoBlockEditorList"></div>
    </div>
  `;

  renderTagRows(hotspot.tags || []);
  renderInfoBlockRows(hotspot.infoBlocks || []);
  bindHotspotEditorEvents();
  applyEditLockUi();
}

function bindHotspotEditorEvents() {
  $('saveHotspotBtn')?.addEventListener('click', () => {
    syncHotspotFromEditor();
    renderHotspots();
    renderPanorama(getCurrentRoom(), { preserveView: true });
    updateSelectionReadout();
    void persistGallery(true);
  });

  $('useCurrentViewBtn')?.addEventListener('click', () => {
    if (!viewer) return alert('请先加载全景图。');
    $('hsYawInput').value = roundCoord(viewer.getYaw());
    $('hsPitchInput').value = roundCoord(viewer.getPitch());
    syncHotspotFromEditor();
    renderPanorama(getCurrentRoom(), { preserveView: true });
    renderHotspots();
    updateSelectionReadout();
    scheduleAutoSave();
  });

  $('previewHotspotBtn')?.addEventListener('click', () => {
    syncHotspotFromEditor({ silent: true });
    void openExhibit(getSelectedHotspot());
  });

  $('deleteHotspotBtn')?.addEventListener('click', deleteHotspot);

  $('exhibitUploadInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    const hotspot = getSelectedHotspot();
    if (!file || !hotspot) return;
    try {
      await assignExhibitImageFromLocalFile(hotspot, file);
      renderPanorama(getCurrentRoom(), { preserveView: true });
      renderHotspotEditor();
      await persistGallery(true);
      updateDiskSaveStatus(`展品图已写入 assets/${hotspot.imageUrl}`);
    } catch (err) {
      alert('上传展品图失败：' + (err.message || err));
    }
    event.target.value = '';
  });

  $('addTagBtn')?.addEventListener('click', () => {
    const hotspot = getSelectedHotspot();
    if (!hotspot) return;
    syncHotspotFromEditor({ silent: true });
    hotspot.tags.push('新标签');
    renderHotspotEditor();
  });

  $('addInfoBlockBtn')?.addEventListener('click', () => {
    const hotspot = getSelectedHotspot();
    if (!hotspot) return;
    syncHotspotFromEditor({ silent: true });
    hotspot.infoBlocks.push({ label: '信息标题', value: '这里填写信息内容。' });
    renderHotspotEditor();
  });

  $('hsTypeSelect')?.addEventListener('change', () => {
    toggleRoomLinkEditorFields($('hsTypeSelect').value === HOTSPOT_TYPE_ROOM_LINK);
  });
}

function renderTagRows(tags) {
  const list = $('tagEditorList');
  list.innerHTML = '';
  tags.forEach((tag, index) => {
    const row = document.createElement('div');
    row.className = 'tag-editor-row';
    row.innerHTML = `
      <input class="text-input tag-input" data-index="${index}" value="${escapeAttr(tag)}" />
      <button class="small-delete delete-tag-btn" data-index="${index}">删除</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('.delete-tag-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hotspot = getSelectedHotspot();
      if (!hotspot) return;
      syncHotspotFromEditor({ silent: true });
      hotspot.tags.splice(Number(btn.dataset.index), 1);
      renderHotspotEditor();
    });
  });
}

function renderInfoBlockRows(blocks) {
  const list = $('infoBlockEditorList');
  list.innerHTML = '';
  blocks.forEach((block, index) => {
    const row = document.createElement('div');
    row.className = 'info-row';
    row.innerHTML = `
      <label class="field-label">标题<input class="text-input info-label-input" data-index="${index}" value="${escapeAttr(block.label || '')}" /></label>
      <label class="field-label">内容<input class="text-input info-value-input" data-index="${index}" value="${escapeAttr(block.value || '')}" /></label>
      <button class="small-delete delete-info-btn" data-index="${index}">删除</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('.delete-info-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hotspot = getSelectedHotspot();
      if (!hotspot) return;
      syncHotspotFromEditor({ silent: true });
      hotspot.infoBlocks.splice(Number(btn.dataset.index), 1);
      renderHotspotEditor();
    });
  });
}

function syncHotspotFromEditor(options = {}) {
  const hotspot = getSelectedHotspot();
  if (!hotspot || !$('hsIdInput')) return false;
  const oldId = hotspot.id;
  const room = getCurrentRoom();
  hotspot.id = uniqueHotspotId(slugOrFallback($('hsIdInput').value, oldId), oldId);
  const modeLink = $('hsTypeSelect')?.value === HOTSPOT_TYPE_ROOM_LINK;
  if (modeLink) {
    hotspot.type = HOTSPOT_TYPE_ROOM_LINK;
    hotspot.targetRoomId = ($('hsTargetRoomSelect')?.value || '').trim();
  } else {
    hotspot.type = $('hsSubtypeInput')?.value.trim() || 'exhibit';
    hotspot.targetRoomId = '';
  }
  hotspot.title = $('hsTitleInput').value.trim() || '未命名热点';
  hotspot.subtitle = $('hsSubtitleInput').value.trim();
  hotspot.yaw = roundCoord(Number($('hsYawInput').value || 0));
  hotspot.pitch = roundCoord(Number($('hsPitchInput').value || 0));
  hotspot.audioUrl = normalizeDeployMediaPath($('hsAudioInput').value);
  hotspot.description = $('hsDescriptionInput').value.trim();
  hotspot.guideText = $('hsGuideInput').value.trim();
  const imageInputValue = $('hsImageInput').value.trim();
  if (imageInputValue) hotspot.imageUrl = normalizeDeployMediaPath(imageInputValue);

  hotspot.tags = Array.from(document.querySelectorAll('.tag-input')).map((input) => input.value.trim()).filter(Boolean);
  const labels = Array.from(document.querySelectorAll('.info-label-input'));
  const values = Array.from(document.querySelectorAll('.info-value-input'));
  hotspot.infoBlocks = labels.map((labelInput, index) => ({
    label: labelInput.value.trim(),
    value: values[index]?.value.trim() || ''
  })).filter((item) => item.label || item.value);

  if (oldId !== hotspot.id) {
    selectedHotspotId = hotspot.id;
    galleryData.tourSequence = (galleryData.tourSequence || []).map((step) => {
      return step.roomId === room.id && step.hotspotId === oldId ? { ...step, hotspotId: hotspot.id } : step;
    });
  }

  if (!options.silent) alert('热点与信息页已保存。');
  return true;
}

function addRoomLinkHotspot() {
  syncHotspotFromEditor({ silent: true });
  const room = getCurrentRoom();
  const baseIndex = (room.hotspots || []).length + 1;
  const viewState = getViewState() || { yaw: 0, pitch: 0 };
  const hotspot = {
    id: uniqueHotspotId(`nav_${String(baseIndex).padStart(2, '0')}_next_room`),
    title: '下一展厅',
    subtitle: '点击进入',
    type: HOTSPOT_TYPE_ROOM_LINK,
    targetRoomId: '',
    yaw: roundCoord(viewState.yaw || 0),
    pitch: roundCoord(viewState.pitch || 0),
    imageUrl: '',
    audioUrl: '',
    tags: [],
    description: '',
    guideText: '',
    infoBlocks: []
  };
  room.hotspots.push(hotspot);
  selectedHotspotId = hotspot.id;
  renderHotspots();
  renderHotspotEditor();
  renderPanorama(room, { preserveView: true });
  updateSelectionReadout();
  scheduleAutoSave();
}

function addHotspot() {
  syncHotspotFromEditor({ silent: true });
  const room = getCurrentRoom();
  const baseIndex = (room.hotspots || []).length + 1;
  const viewState = getViewState() || { yaw: 0, pitch: 0 };
  const hotspot = {
    id: uniqueHotspotId(`P${String(baseIndex).padStart(3, '0')}_new_hotspot`),
    title: `新热点 ${baseIndex}`,
    subtitle: 'New Exhibit',
    type: 'exhibit',
    yaw: roundCoord(viewState.yaw || 0),
    pitch: roundCoord(viewState.pitch || 0),
    imageUrl: '',
    audioUrl: '',
    tags: ['新展品'],
    description: '这里填写展品简介。',
    guideText: '这里填写语音讲解词。',
    infoBlocks: [
      { label: '展品定位', value: '这里填写该热点对应的信息。' }
    ]
  };
  room.hotspots.push(hotspot);
  selectedHotspotId = hotspot.id;
  addTourStepForHotspot(room.id, hotspot.id);
  renderHotspots();
  renderHotspotEditor();
  renderPanorama(room, { preserveView: true });
  updateSelectionReadout();
  scheduleAutoSave();
}

function deleteHotspot() {
  const room = getCurrentRoom();
  const hotspot = getSelectedHotspot();
  if (!hotspot) return;
  if (!confirm(`确定删除热点「${hotspot.title || hotspot.id}」吗？`)) return;
  room.hotspots = room.hotspots.filter((h) => h.id !== hotspot.id);
  galleryData.tourSequence = (galleryData.tourSequence || []).filter((step) => !(step.roomId === room.id && step.hotspotId === hotspot.id));
  selectedHotspotId = room.hotspots?.[0]?.id || null;
  renderHotspots();
  renderHotspotEditor();
  renderPanorama(room, { preserveView: true });
  updateSelectionReadout();
  scheduleAutoSave();
}

function addRoom() {
  syncHotspotFromEditor({ silent: true });
  applyRoomEditor();
  const index = galleryData.rooms.length + 1;
  const room = {
    id: uniqueRoomId(`room_${String(index).padStart(2, '0')}_new_gallery`),
    name: `新展厅 ${index}`,
    shortName: `展厅 ${index}`,
    theme: '新的植物数字展厅主题',
    panoramaUrl: '',
    panoramaAlt: '请填入或上传当前展区的 360° 全景图',
    bgmUrl: '',
    initialView: { yaw: 0, pitch: 0, hfov: 105 },
    hotspots: []
  };
  galleryData.rooms.push(room);
  loadRoom(galleryData.rooms.length - 1);
  scheduleAutoSave();
}

async function duplicateRoom() {
  syncHotspotFromEditor({ silent: true });
  applyRoomEditor();
  const source = deepClone(getCurrentRoom());
  source.id = uniqueRoomId(`${source.id}_copy`);
  source.name = `${source.name} 副本`;
  source.shortName = `${source.shortName || source.name}副本`;
  source.hotspots = (source.hotspots || []).map((hotspot) => ({ ...hotspot, id: uniqueHotspotId(`${hotspot.id}_copy`, null, source.hotspots) }));
  delete source.panoramaLocalKey;
  delete source.panoramaLocalName;
  galleryData.rooms.splice(currentRoomIndex + 1, 0, source);
  loadRoom(currentRoomIndex + 1);
  scheduleAutoSave();
}

function deleteRoom() {
  if (galleryData.rooms.length <= 1) return alert('至少需要保留一个展厅。');
  const room = getCurrentRoom();
  if (!confirm(`确定删除展厅「${room.name}」及其全部热点吗？`)) return;
  delete room.panoramaLocalKey;
  delete room.panoramaLocalName;
  galleryData.tourSequence = (galleryData.tourSequence || []).filter((step) => step.roomId !== room.id);
  galleryData.rooms.splice(currentRoomIndex, 1);
  currentRoomIndex = clamp(currentRoomIndex, 0, galleryData.rooms.length - 1);
  selectedHotspotId = getCurrentRoom().hotspots?.[0]?.id || null;
  renderAll();
  scheduleAutoSave();
}

function switchRoomByOffset(offset) {
  syncHotspotFromEditor({ silent: true });
  applyRoomEditor();
  const nextIndex = (currentRoomIndex + offset + galleryData.rooms.length) % galleryData.rooms.length;
  loadRoom(nextIndex);
  scheduleAutoSave();
}

async function openExhibit(hotspot) {
  if (!hotspot) return;
  if (isRoomLinkHotspot(hotspot)) {
    navigateRoomFromHotspot(hotspot);
    return;
  }
  selectedHotspotId = hotspot.id;
  $('dialogType').textContent = hotspot.type || 'exhibit';
  $('dialogTitle').textContent = hotspot.title || hotspot.id;
  $('dialogSubtitle').textContent = hotspot.subtitle || '';
  $('dialogDescription').textContent = hotspot.description || hotspot.guideText || '暂无说明。';

  const blocks = $('dialogInfoBlocks');
  blocks.innerHTML = '';
  (hotspot.infoBlocks || []).forEach((block) => {
    const item = document.createElement('div');
    item.className = 'info-block';
    item.innerHTML = `<strong>${escapeHtml(block.label || '信息')}</strong><span>${escapeHtml(block.value || '')}</span>`;
    blocks.appendChild(item);
  });

  const tags = $('dialogTags');
  tags.innerHTML = '';
  (hotspot.tags || []).forEach((tag) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    tags.appendChild(span);
  });

  const img = $('dialogImage');
  const placeholder = $('dialogImagePlaceholder');
  if (hotspot.imageUrl) {
    img.style.display = 'block';
    placeholder.style.display = 'none';
    img.removeAttribute('src');
    try {
      img.src = await ensureLoadableMediaUrl(hotspot.imageUrl);
    } catch (err) {
      console.warn('展品图加载失败', err);
      img.style.display = 'none';
      placeholder.style.display = 'block';
      placeholder.textContent = '展品图加载失败';
    }
    img.onerror = () => {
      img.style.display = 'none';
      placeholder.style.display = 'block';
      placeholder.textContent = '展品图加载失败';
    };
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    placeholder.style.display = 'block';
    placeholder.textContent = '暂无展品图';
  }

  renderHotspots();
  renderHotspotEditor();
  updateSelectionReadout();
  const dialog = $('exhibitDialog');
  if (!dialog.open) dialog.showModal();
}

function updateDiskSaveStatus(message) {
  const node = $('diskSaveStatus');
  if (!node) return;
  if (message) {
    node.textContent = message;
    return;
  }
  if (diskApiReady) {
    node.textContent = lastDiskSaveAt
      ? `已关联项目文件夹；修改自动写入 data/gallery.json（上次保存 ${new Date(lastDiskSaveAt).toLocaleTimeString()}）`
      : '已关联项目文件夹；修改自动写入 data/gallery.json，图片写入 assets/ 子文件夹。';
  } else if (typeof window.showDirectoryPicker === 'function') {
    node.textContent = '查看内容无需关联文件夹；只有编辑后要写回 data/ 与 assets/ 时，才需要点击「关联项目文件夹」。';
  } else {
    node.textContent = '当前浏览器可查看展厅；如需编辑并写回本地文件，请使用支持文件夹写入的 Chrome 或 Edge。';
  }
}

function exportJson() {
  syncHotspotFromEditor({ silent: true });
  applyRoomEditor();
  syncSidebarUiFromDom();
  const json = JSON.stringify(JSON.parse(galleryDataToStorageString(false)), null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gallery.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildAutoTourPlan() {
  const seq = galleryData.tourSequence || [];
  const defaultDur = Number(galleryData.settings?.tourStepDuration ?? 7);
  const durationFor = (roomId, hotspotId) => {
    const hit = seq.find((s) => s.roomId === roomId && s.hotspotId === hotspotId);
    return Number(hit?.duration ?? defaultDur);
  };
  const steps = [];
  (galleryData.rooms || []).forEach((room) => {
    (room.hotspots || []).forEach((hotspot) => {
      if (isRoomLinkHotspot(hotspot)) return;
      steps.push({
        roomId: room.id,
        hotspotId: hotspot.id,
        duration: durationFor(room.id, hotspot.id)
      });
    });
  });
  return steps;
}

function startTour() {
  activeTourPlan = buildAutoTourPlan();
  if (!activeTourPlan.length) {
    return alert('当前没有可导览的热点。请先在各展厅中添加热点；单个展厅的热点会按列表顺序全部播放后再进入下一展厅。');
  }
  tourIndex = 0;
  $('startTourBtn').textContent = '停止导览';
  runTourStep();
}

function stopTour() {
  clearTimeout(tourTimer);
  tourTimer = null;
  activeTourPlan = null;
  $('startTourBtn').textContent = '自动导览测试';
}

function runTourStep() {
  const seq = activeTourPlan;
  if (!seq || tourIndex >= seq.length) return stopTour();

  const step = seq[tourIndex];
  const roomIndex = galleryData.rooms.findIndex((room) => room.id === step.roomId);
  if (roomIndex < 0) {
    tourIndex += 1;
    return runTourStep();
  }

  if (roomIndex !== currentRoomIndex) loadRoom(roomIndex);

  const room = getCurrentRoom();
  const hotspot = (room.hotspots || []).find((h) => h.id === step.hotspotId);
  if (!hotspot) {
    tourIndex += 1;
    return runTourStep();
  }

  const duration = Number(step.duration || 7) * 1000;

  window.setTimeout(() => {
    selectedHotspotId = hotspot.id;
    if (viewer) viewer.lookAt(Number(hotspot.pitch || 0), Number(hotspot.yaw || 0), 75, 1200);
    void openExhibit(hotspot);
    tourTimer = window.setTimeout(() => {
      try { $('exhibitDialog').close(); } catch (err) {}
      tourIndex += 1;
      runTourStep();
    }, duration);
  }, 700);
}

function addTourStepForHotspot(roomId, hotspotId) {
  const room = galleryData.rooms.find((r) => r.id === roomId);
  const hs = room?.hotspots?.find((h) => h.id === hotspotId);
  if (hs && isRoomLinkHotspot(hs)) return;
  galleryData.tourSequence ||= [];
  const exists = galleryData.tourSequence.some((step) => step.roomId === roomId && step.hotspotId === hotspotId);
  if (!exists) galleryData.tourSequence.push({ roomId, hotspotId, duration: 7 });
}

function getCurrentRoom() { return galleryData.rooms[currentRoomIndex]; }
function getSelectedHotspot() { return (getCurrentRoom().hotspots || []).find((h) => h.id === selectedHotspotId) || null; }

function getViewState() {
  if (!viewer) return null;
  try {
    return { yaw: viewer.getYaw(), pitch: viewer.getPitch(), hfov: viewer.getHfov() };
  } catch (err) {
    return null;
  }
}

function getCoordsFromMouseEvent(event) {
  if (viewer && typeof viewer.mouseEventToCoords === 'function') {
    const coords = viewer.mouseEventToCoords(event);
    if (Array.isArray(coords) && coords.length >= 2) {
      return { pitch: coords[0], yaw: coords[1] };
    }
  }
  return { pitch: viewer?.getPitch?.() || 0, yaw: viewer?.getYaw?.() || 0 };
}

function updateSelectionReadout() {
  const hotspot = getSelectedHotspot();
  if (!hotspot) {
    $('selectedHotspotLabel').textContent = '未选择热点';
    $('coordsReadout').textContent = 'yaw 0 / pitch 0';
    return;
  }
  $('selectedHotspotLabel').textContent = `当前热点：${hotspot.title || hotspot.id}`;
  $('coordsReadout').textContent = `yaw ${hotspot.yaw} / pitch ${hotspot.pitch}`;
}

function uniqueRoomId(base, currentId = null) {
  let id = slugOrFallback(base, 'room_new');
  const used = new Set(galleryData.rooms.map((room) => room.id).filter((roomId) => roomId !== currentId));
  let index = 2;
  let candidate = id;
  while (used.has(candidate)) candidate = `${id}_${index++}`;
  return candidate;
}

function uniqueHotspotId(base, currentId = null, sourceHotspots = null) {
  let id = slugOrFallback(base, 'hotspot_new');
  const hotspots = sourceHotspots || getCurrentRoom().hotspots || [];
  const used = new Set(hotspots.map((hotspot) => hotspot.id).filter((hotspotId) => hotspotId !== currentId));
  let index = 2;
  let candidate = id;
  while (used.has(candidate)) candidate = `${id}_${index++}`;
  return candidate;
}

function slugOrFallback(value, fallback) {
  const cleaned = String(value || '').trim().replace(/\s+/g, '_').replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '').replace(/_+/g, '_');
  return cleaned || fallback;
}

function roundCoord(value) { return Math.round(Number(value || 0) * 10) / 10; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }


init();
