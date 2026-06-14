(function () {
  const draftKey = "campusGravityBreakDraft";

  function detectEditMode() {
    const query = new URLSearchParams(location.search).get("edit");
    if (query === "1" || query === "true") return true;
    const hash = location.hash.replace(/^#/, "").trim();
    if (!hash) return false;
    if (hash === "edit" || hash === "edit=1" || hash === "edit=true") return true;
    if (hash.startsWith("edit=")) {
      const value = hash.slice(5);
      return value === "1" || value === "true";
    }
    return false;
  }

  function purgeBrowserDraft() {
    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem("campusGravityBreakLang");
      localStorage.removeItem("campusGravityBreakEditorPosition");
    } catch (err) {
      console.warn("无法清理浏览器草稿。", err);
    }
  }

  function getDiskSource() {
    return window.__DISK_SITE_DATA__ || window.siteData;
  }

  purgeBrowserDraft();

  const isEditMode = detectEditMode();
  const diskSource = getDiskSource();
  const pageAssetVersion = Date.now();
  let data = normalizeData(deepClone(diskSource));
  let lang = "zh";
  let videosMuted = false;
  /** 由 IntersectionObserver 维护：视频是否处于「当前版块」可视范围 */
  const scrollVideoInView = new WeakMap();
  /** 进入视口才算在播；与面积比比较用 */
  const SECTION_VIDEO_VISIBLE_RATIO = 0.3;
  let promptValues = { ...data.promptGenerator.defaults };
  let useDefaultPrompt = true;
  const undoStack = [];
  let routerState = {
    scene: data.expressionRouter.sceneTypes[0],
    sport: data.expressionRouter.sports[0],
    mood: data.expressionRouter.moods[0],
  };
  const defaultPromptRouterState = {
    sport: "basketball",
    style: "coolHero",
    action: "lowDribble",
    scene: "outdoorCourt",
    referenceMode: "noReference",
    expression: "auto",
    platform: "gptImage",
    impact: "high",
    consistencyLock: true,
  };
  let promptRouterState = { ...defaultPromptRouterState };

  function safeParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hasMojibake(value) {
    return typeof value === "string" && /[锟�鏍洯閲嶅姩娴锋姤绯浜搧妗堜緥瑙嗚鎻愮ず闅愯棌]/.test(value);
  }

  function repairMojibakeDraft(draft, clean) {
    if (!draft || !clean) return draft || clean;
    const walk = (target, source) => {
      if (!target || !source || typeof target !== "object" || typeof source !== "object") return;
      Object.keys(target).forEach((key) => {
        if (hasMojibake(target[key]) && typeof source[key] === "string") {
          target[key] = source[key];
          return;
        }
        if (target[key] && source[key] && typeof target[key] === "object") walk(target[key], source[key]);
      });
    };
    const fixed = deepClone(draft);
    walk(fixed, clean);
    return fixed;
  }

  function downloadTextFile(filename, body) {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([body], { type: "application/javascript;charset=utf-8" }));
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(anchor.href);
  }

  function exportDiskDataFiles(snapshot = data) {
    const payload = normalizeData(deepClone(snapshot));
    payload.meta = payload.meta || {};
    payload.meta.savedAt = new Date().toISOString();
    downloadTextFile("siteData.boot.js", `window.__DISK_SITE_DATA__=${JSON.stringify(payload)};\n`);
    downloadTextFile("siteData.js", `window.siteData = ${JSON.stringify(payload, null, 2)};\n`);
  }

  function reloadDiskData() {
    data = normalizeData(deepClone(getDiskSource()));
    promptValues = { ...data.promptGenerator.defaults };
    routerState = {
      scene: data.expressionRouter.sceneTypes[0],
      sport: data.expressionRouter.sports[0],
      mood: data.expressionRouter.moods[0],
    };
  }

  function pushUndoState() {
    undoStack.push(JSON.stringify(data));
    if (undoStack.length > 30) undoStack.shift();
  }

  function undoLastChange() {
    const previous = undoStack.pop();
    if (!previous) {
      notifySave("没有可以撤回的上一步。");
      return;
    }
    data = normalizeData(safeParse(previous, data));
    data.meta.savedAt = new Date().toISOString();
    renderAll();
    notifySave("已撤回一步。永久保存请点「导出到本地文件」。");
  }

  function ensureLang(value, zhFallback, enFallback) {
    if (value && typeof value === "object" && ("zh" in value || "en" in value)) {
      return { zh: value.zh || value.en || zhFallback || "", en: value.en || value.zh || enFallback || zhFallback || "" };
    }
    return { zh: value || zhFallback || "", en: value || enFallback || zhFallback || "" };
  }

  function normalizeData(input) {
    const d = deepClone(input || {});
    d.meta = d.meta || {};
    d.meta.defaultLang = d.meta.defaultLang || "zh";
    d.meta.supportedLangs = d.meta.supportedLangs || ["zh", "en"];
    d.meta.sectionOrder = d.meta.sectionOrder || ["hero", "brandStory", "campaignMedia", "products", "cases", "expressionRouter", "promptGenerator", "grammarCards", "workflow", "cta"];
    d.meta.sections = d.meta.sections || {};
    d.meta.sectionOrder.forEach((key) => {
      d.meta.sections[key] = d.meta.sections[key] || { visible: true };
      if (typeof d.meta.sections[key].visible !== "boolean") d.meta.sections[key].visible = true;
    });
    d.appearance = d.appearance || {};
    d.appearance.palette = d.appearance.palette || {
      black: "#08080A",
      panel: "#111217",
      orange: "#F26A21",
      blue: "#2F6BFF",
      yellow: "#FFD447",
      cream: "#F4F0E8",
      gray: "#8A8F98",
    };
    d.appearance.textColors = d.appearance.textColors || {
      heroTitle: "#F4F0E8",
      heroSubtitle: "#F4F0E8",
      sectionTitle: "#F4F0E8",
      body: "#B8BBC1",
      label: "#FFD447",
      cardTitle: "#F4F0E8",
      cardText: "#B8BBC1",
    };
    d.appearance.fontSizes = d.appearance.fontSizes || {
      nav: 0.75,
      heroTitle: 11.5,
      sectionTitle: 7.5,
      heroSubtitle: 1.55,
      sectionSubtitle: 1.25,
      body: 1,
      cardTitle: 2,
      label: 0.75,
      button: 0.75,
      productSubtitle: 0.95,
      galleryOverlay: 3.6,
      statNumber: 3.75,
      statText: 0.8,
      blockquote: 0.82,
      editor: 0.75,
    };

    d.hero = d.hero || {};
    d.hero.kicker = ensureLang(d.hero.kicker || d.hero.eyebrow, "AI 校园运动海报系统", "AI Campus Sports Poster System");
    d.hero.eyebrow = ensureLang(d.hero.eyebrow || d.hero.kicker, "AI 校园运动海报系统", "AI Campus Sports Poster System");
    d.hero.title = ensureLang(d.hero.title, "Campus Gravity Break", "Campus Gravity Break");
    d.hero.subtitle = ensureLang(d.hero.subtitle, "校园重力突破 / AI 青春篮球运动海报系统", "Campus gravity break / AI youth basketball poster system");
    d.hero.description = ensureLang(d.hero.description || d.hero.copy, "为大学生运动社群打造的青春校园运动品牌。", "A youth campus sportswear brand for university communities.");
    d.hero.copy = ensureLang(d.hero.copy || d.hero.description, d.hero.description.zh, d.hero.description.en);
    d.hero.indexLine = ensureLang(d.hero.indexLine, "01 / 主视觉战役", "01 / Campaign Hero");
    const defaultHeroPoster = "./assets/posters/JTXL03品牌世界观主视觉2 (4).png";
    d.hero.mainMediaType = d.hero.mainMediaType || d.hero.poster?.mediaType || (d.hero.poster?.video ? "video" : "image");
    d.hero.mainMediaSrc = d.hero.mainMediaSrc || d.hero.poster?.image || defaultHeroPoster;
    d.hero.mainMediaPoster = d.hero.mainMediaPoster || d.hero.poster?.poster || d.hero.mainMediaSrc;
    if (!["image", "video"].includes(d.hero.mainMediaType)) d.hero.mainMediaType = "image";
    if (d.hero.mainMediaType === "image" && (!d.hero.mainMediaSrc || /\/objects\//i.test(d.hero.mainMediaSrc) || /\.(mp4|webm|mov)$/i.test(d.hero.mainMediaSrc))) {
      d.hero.mainMediaType = "image";
      d.hero.mainMediaSrc = defaultHeroPoster;
      d.hero.mainMediaPoster = defaultHeroPoster;
    }
    if (d.hero.mainMediaType === "image" && !/(\/posters\/|\/cases\/|\/products\/|^https?:|^data:|^blob:)/i.test(d.hero.mainMediaSrc)) {
      d.hero.mainMediaSrc = defaultHeroPoster;
      d.hero.mainMediaPoster = defaultHeroPoster;
    }
    d.hero.mainMediaRatio = d.hero.mainMediaRatio || d.hero.poster?.ratio || "4:5";
    d.hero.mainMediaObjectFit = d.hero.mainMediaObjectFit || d.hero.poster?.objectFit || "cover";
    d.hero.mainMediaObjectPosition = d.hero.mainMediaObjectPosition || d.hero.poster?.objectPosition || "center";
    d.hero.backgroundMediaType = d.hero.backgroundMediaType || "gradient";
    d.hero.backgroundMediaSrc = d.hero.backgroundMediaSrc || "";
    d.hero.backgroundVideoPoster = d.hero.backgroundVideoPoster || "";
    d.hero.backgroundOverlayOpacity = d.hero.backgroundOverlayOpacity ?? 0.72;
    d.hero.ctaButtons = d.hero.ctaButtons || [
      { label: ensureLang(d.hero.primaryCta, "浏览产品线", "Explore Products"), href: "#products", style: "primary" },
      { label: ensureLang(d.hero.secondaryCta, "生成提示词", "Generate Prompt"), href: "#prompt", style: "secondary" },
    ];
    d.hero.objects = (d.hero.objects || []).map((item, index) => ({
      title: ensureLang(item.title || item.label, `物件 ${index + 1}`, `Object ${index + 1}`),
      visible: item.visible !== false,
      scale: item.scale ?? 1,
      rotation: item.rotation ?? 0,
      opacity: item.opacity ?? 1,
      zIndex: item.zIndex ?? (item.layer === "front" ? 6 : item.layer === "back" ? 2 : 4),
      animationSpeed: item.animationSpeed ?? 5,
      parallaxStrength: item.parallaxStrength ?? item.depth ?? 10,
      ...item,
    }));

    d.brandStory = d.brandStory || {};
    d.brandStory.paragraphs = d.brandStory.paragraphs || [ensureLang(d.brandStory.copy, "", "")];
    d.brandStory.tags = d.brandStory.tags || ["campus", "sport", "AI"];
    d.brandStory.mediaType = d.brandStory.mediaType || "image";
    d.brandStory.image = d.brandStory.image || "./assets/cases/ST03人物形象+产品,新海报 (2).png";
    d.brandStory.video = d.brandStory.video || "";
    d.brandStory.poster = d.brandStory.poster || d.brandStory.image;
    d.brandStory.mediaRatio = d.brandStory.mediaRatio || "16:9";
    d.brandStory.objectFit = d.brandStory.objectFit || "cover";
    d.brandStory.objectPosition = d.brandStory.objectPosition || "center";

    d.campaignMedia = d.campaignMedia || {};
    d.campaignMedia.mediaType = d.campaignMedia.mediaType || (d.campaignMedia.video ? "video" : "image");
    d.campaignMedia.image = d.campaignMedia.image || "./assets/cases/ST02视频故事板（第二版）3.png";
    d.campaignMedia.video = d.campaignMedia.video || "";
    d.campaignMedia.poster = d.campaignMedia.poster || d.campaignMedia.image;
    d.campaignMedia.mediaRatio = d.campaignMedia.mediaRatio || "16:9";
    d.campaignMedia.objectFit = d.campaignMedia.objectFit || "cover";
    d.campaignMedia.objectPosition = d.campaignMedia.objectPosition || "center";
    if (!d.campaignMedia.promoVideo && d.expressionRouter?.promoVideo) {
      d.campaignMedia.promoVideo = d.expressionRouter.promoVideo;
    }
    const defaultPromo =
      window.siteData?.campaignMedia?.promoVideo || window.siteData?.expressionRouter?.promoVideo || {};
    d.campaignMedia.promoVideo = d.campaignMedia.promoVideo || {};
    const pv = d.campaignMedia.promoVideo;
    pv.id = pv.id || defaultPromo.id || "roller-skating-promo";
    pv.title = ensureLang(pv.title || defaultPromo.title, "轮滑运动宣传", "Roller Skating Promo");
    pv.mediaType = pv.mediaType || (pv.video ? "video" : defaultPromo.mediaType || "video");
    pv.video = pv.video ?? defaultPromo.video ?? "./assets/videos/VI06轮滑运动宣传视频.mp4";
    pv.poster = pv.poster || pv.image || defaultPromo.poster || "./assets/cases/ST03人物形象+产品,新海报 (2).png";
    pv.image = pv.image || pv.poster;
    pv.mediaRatio = pv.mediaRatio || defaultPromo.mediaRatio || "16:9";
    pv.objectFit = pv.objectFit || "cover";
    pv.objectPosition = pv.objectPosition || "center";
    pv.visible = pv.visible !== false;

    d.products = (d.products || []).map((item, index) => ({
      order: item.order ?? index,
      mediaType: item.mediaType || (item.video ? "video" : "image"),
      mediaRatio: item.mediaRatio || "4:5",
      objectFit: item.objectFit || "cover",
      objectPosition: item.objectPosition || "center",
      colorways: item.colorways || [],
      tags: item.tags || [],
      scene: item.scene || item.category || ensureLang("", "", ""),
      relatedCampaign: item.relatedCampaign || "",
      visible: item.visible !== false,
      ...item,
    }));

    d.cases = (d.cases || []).map((item, index) => ({
      order: item.order ?? index,
      category: item.category || ensureLang("Campaign", "Campaign"),
      cover: item.cover || item.image || item.poster || "",
      mediaType: item.mediaType || (item.video ? "video" : "image"),
      mediaRatio: item.mediaRatio || "4:5",
      objectFit: item.objectFit || "cover",
      objectPosition: item.objectPosition || "center",
      description: item.description || item.excerpt || ensureLang("", ""),
      expressionMode: item.expressionMode || item.expression || ensureLang("", ""),
      actionMoment: item.actionMoment || item.action || ensureLang("", ""),
      floatingObjectSystem: item.floatingObjectSystem || item.objects || ensureLang("", ""),
      promptExcerpt: item.promptExcerpt || item.excerpt || ensureLang("", ""),
      fullPrompt: item.fullPrompt || "",
      tags: item.tags || [],
      visible: item.visible !== false,
      ...item,
    }));

    d.grammarCards = (d.grammarCards || []).map((item, index) => ({
      label: item.label || item.tag || ensureLang("", ""),
      description: item.description || item.copy || ensureLang("", ""),
      mediaRatio: item.mediaRatio || "16:9",
      objectFit: item.objectFit || "cover",
      objectPosition: item.objectPosition || "center",
      visible: item.visible !== false,
      order: item.order ?? index,
      ...item,
    }));

    d.promptGenerator = d.promptGenerator || {};
    d.promptGenerator.defaults = d.promptGenerator.defaults || {};
    d.promptGenerator.outputTemplate = d.promptGenerator.outputTemplate || "Create a hyper-realistic vertical campus sports brand advertisement photograph inside a {scene}, filled with explosive youth {sport} energy. A {character} {actionMoment}. Her expression is {expressionMode}. Around her are suspended sport-related objects: {floatingObjectSet}. Use {lighting}, realistic skin and fabric texture, {posterStyle}. No real brand logos. Do not copy any exact reference composition, typography layout, pose, or final visual result.";

    d.workflow = d.workflow || {};
    d.workflow.visible = d.workflow.visible !== false;
    d.workflow.cards = d.workflow.cards || d.workflow.steps || [];
    d.workflow.steps = d.workflow.steps || d.workflow.cards;

    d.cta = d.cta || {};
    d.cta.buttons = d.cta.buttons || [{ label: ensureLang(d.cta.button, "鍥炲埌棣栭〉", "Back To Top"), href: "#top", style: "primary" }];
    d.cta.contactLinks = d.cta.contactLinks || [];
    return d;
  }

  function t(value) {
    if (value && typeof value === "object" && ("zh" in value || "en" in value)) return value[lang] || value.zh || value.en || "";
    return value || "";
  }

  function versionAsset(src) {
    if (!src || /^(https?:|data:|blob:)/.test(src)) return src || "";
    const joiner = src.includes("?") ? "&" : "?";
    return `${src}${joiner}v=${pageAssetVersion}`;
  }

  function assetCandidates(src, fallback = "") {
    const clean = (value) => String(value || "").trim();
    const candidates = [];
    const add = (value) => {
      const path = clean(value);
      if (path && !candidates.includes(path)) candidates.push(path);
    };
    add(src);
    add(fallback);
    [...candidates].forEach((path) => {
      if (path.startsWith("./assets/")) add(path.replace("./assets/", "./public/"));
      if (path.startsWith("assets/")) add(path.replace("assets/", "public/"));
      if (path.startsWith("./public/")) add(path.replace("./public/", "./assets/"));
      if (path.startsWith("public/")) add(path.replace("public/", "assets/"));
    });
    return candidates;
  }

  window.cgbImageFallback = function (img) {
    const fallbacks = safeParse(img.dataset.fallbacks || "[]", []);
    const next = fallbacks.shift();
    img.dataset.fallbacks = JSON.stringify(fallbacks);
    if (next) {
      img.src = versionAsset(next);
      return;
    }
    const float = img.closest(".float");
    if (float) float.classList.add("no-image");
    img.remove();
  };

  function notifySave(message = "预览已更新。永久保存请导出 siteData.js。") {
    const status = document.getElementById("editorStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.add("show");
    window.clearTimeout(notifySave.timer);
    notifySave.timer = window.setTimeout(() => status.classList.remove("show"), 2200);
  }

  function mediaHTML(item, className, alt, options = {}) {
    if (item.mediaType === "video" && item.video) {
      const videoSources = assetCandidates(item.video);
      const posterSources = assetCandidates(item.poster || item.image || item.cover || "");
      const loopAttr = options.loop ? " loop" : "";
      return `<video class="${className}" data-audio-video src="${versionAsset(videoSources[0])}" poster="${versionAsset(posterSources[0])}" preload="auto" playsinline controls${loopAttr} style="object-fit:${item.objectFit || "cover"};object-position:${item.objectPosition || "center"}"></video>`;
    }
    const fallback = item.poster || item.cover || "";
    const sources = assetCandidates(item.image || item.cover || fallback, fallback);
    return `<img class="${className}" src="${versionAsset(sources[0])}" data-fallbacks="${escapeAttr(JSON.stringify(sources.slice(1)))}" alt="${alt || ""}" style="object-fit:${item.objectFit || "cover"};object-position:${item.objectPosition || "center"}" onerror="window.cgbImageFallback(this)" />`;
  }

  function renderHeader() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const path = node.dataset.i18n.split(".");
      let value = data;
      path.forEach((key) => (value = value && value[key]));
      node.textContent = t(value);
    });
    document.querySelectorAll("[data-bind]").forEach((node) => {
      const path = node.dataset.bind.split(".");
      let value = data;
      path.forEach((key) => (value = value && value[key]));
      node.textContent = t(value);
    });
    const langToggle = document.getElementById("langToggle");
    if (langToggle) langToggle.hidden = true;
    styleHeroTitle();
  }

  function styleHeroTitle() {
    const title = document.querySelector("h1[data-bind='hero.title']");
    if (!title) return;
    const words = t(data.hero.title).trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) return;
    const middle = Math.floor(words.length / 2);
    title.innerHTML = words.map((word, index) => `<span class="${index === middle ? "title-accent" : ""}">${escapeHTML(word)}</span>`).join(" ");
  }

  function sectionHead(item) {
    return `<div><p class="section-kicker">${t(item.kicker)}</p><h2>${t(item.title)}</h2><p class="section-subtitle">${t(item.subtitle)}</p></div>`;
  }

  function applyAppearance() {
    const colors = data.appearance?.textColors || {};
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => root.style.setProperty(`--text-${key}`, value));
    Object.entries(data.appearance?.fontSizes || {}).forEach(([key, value]) => root.style.setProperty(`--size-${key}`, `${value}rem`));
  }

  function renderHero() {
    renderHeader();
    const heroMedia = {
      mediaType: data.hero.mainMediaType,
      image: data.hero.mainMediaType === "image" ? data.hero.mainMediaSrc : data.hero.mainMediaPoster,
      video: data.hero.mainMediaType === "video" ? data.hero.mainMediaSrc : "",
      poster: data.hero.mainMediaPoster,
      objectFit: data.hero.mainMediaObjectFit,
      objectPosition: data.hero.mainMediaObjectPosition,
    };
    const stage = document.getElementById("posterStage");
    document.querySelector(".poster-stage").style.setProperty("--poster-ratio", ratioValue(data.hero.mainMediaRatio));
    document.querySelector(".poster-stage").dataset.ratio = data.hero.mainMediaRatio || "4:5";
    document.querySelector(".hero").style.setProperty("--bg-opacity", data.hero.backgroundOverlayOpacity ?? 0.72);
    renderHeroBackground();
    stage.innerHTML = `
      <div class="poster" id="poster">${mediaHTML(heroMedia, "poster-img", t(data.hero.poster?.alt), { loop: true })}</div>
      ${data.hero.objects
        .filter((item) => item.visible !== false)
        .map(
          (item) => `
          <div class="float ${item.type}" data-depth="${item.parallaxStrength ?? item.depth}" data-layer="${item.layer}" style="left:${item.x};top:${item.y};--float-scale:${item.scale};--base-rotate:${item.rotation}deg;opacity:${item.opacity};z-index:${item.zIndex};animation-duration:${item.animationSpeed || 5}s">
            <img src="${versionAsset(assetCandidates(item.image)[0])}" data-fallbacks="${escapeAttr(JSON.stringify(assetCandidates(item.image).slice(1)))}" alt="${t(item.title || item.label)}" onerror="window.cgbImageFallback(this)" />
            <b>${t(item.title || item.label)}</b>
          </div>`,
        )
        .join("")}
    `;
  }

  function ratioValue(ratio) {
    const map = { "1:1": "1 / 1", "4:5": "4 / 5", "3:4": "3 / 4", "16:9": "16 / 9", "9:16": "9 / 16", "2:3": "2 / 3", "3:2": "3 / 2", "2:1": "2 / 1" };
    return map[ratio] || ratio || "4 / 5";
  }

  function renderHeroBackground() {
    const hero = document.querySelector(".hero");
    hero.querySelectorAll(".hero-bg-media").forEach((node) => node.remove());
    if (data.hero.backgroundMediaType === "image" && data.hero.backgroundMediaSrc) {
      hero.insertAdjacentHTML("afterbegin", `<img class="hero-bg-media" src="${versionAsset(data.hero.backgroundMediaSrc)}" alt="" />`);
    }
    if (data.hero.backgroundMediaType === "video" && data.hero.backgroundMediaSrc) {
      hero.insertAdjacentHTML("afterbegin", `<video class="hero-bg-media" data-audio-video src="${versionAsset(data.hero.backgroundMediaSrc)}" poster="${versionAsset(data.hero.backgroundVideoPoster || "")}" preload="auto" playsinline></video>`);
    }
  }

  function renderBrandStory() {
    const story = data.brandStory;
    document.getElementById("story").innerHTML = `
      ${sectionHead(story)}
      <div class="panel">
        <p class="copy" data-edit-path="brandStory.copy.${lang}" data-edit-type="textarea">${t(story.copy)}</p>
        ${(story.paragraphs || []).map((p, i) => `<p class="copy" data-edit-path="brandStory.paragraphs.${i}.${lang}" data-edit-type="textarea">${t(p)}</p>`).join("")}
        <div class="media-frame compact" style="aspect-ratio:${ratioValue(story.mediaRatio)}">${mediaHTML(story, "campaign-media", t(story.title))}</div>
        <div class="stats">
          ${story.stats.map((stat) => `<div class="stat"><strong>${stat.value}</strong><span>${t(stat.label)}</span></div>`).join("")}
        </div>
      </div>
    `;
  }

  function renderCampaignMedia() {
    const media = data.campaignMedia;
    const promo = media.promoVideo;
    const promoBlock =
      promo && promo.visible !== false
        ? `<div class="media-frame campaign-promo-media" style="aspect-ratio:${ratioValue(promo.mediaRatio || "16:9")}">${mediaHTML(promo, "campaign-media", t(promo.title))}</div>`
        : "";
    document.getElementById("campaign").innerHTML = `
      ${sectionHead(media)}
      <div class="media-frame" style="aspect-ratio:${ratioValue(media.mediaRatio || "16:9")}">${mediaHTML(media, "campaign-media", t(media.title))}</div>
      ${promoBlock}
    `;
  }

  function renderProducts() {
    document.getElementById("products").innerHTML = `
      <p class="section-kicker">Product Line</p>
      <h2>Product Line</h2>
      <p class="section-subtitle">${lang === "zh" ? "产品线：把校园运动服装作为海报系统里的角色造型锚点。" : "Product line: sportswear as character styling anchors inside the poster system."}</p>
      <div class="product-grid">
        ${data.products
          .filter((item) => item.visible !== false)
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(
            (item) => `
            <article class="product-card">
              <div class="product-media" style="aspect-ratio:${ratioValue(item.mediaRatio)}">${mediaHTML(item, "product-img", t(item.name))}</div>
              <div class="product-body">
                <h3 data-edit-path="products.${data.products.indexOf(item)}.name.${lang}" data-edit-type="text">${t(item.name)}</h3>
                <p class="product-cn-title" data-edit-path="products.${data.products.indexOf(item)}.cnName.${lang}" data-edit-type="text">${t(item.cnName)}</p>
                <p><span>${lang === "zh" ? "类别" : "Category"}</span>${t(item.category)}</p>
                <p data-edit-path="products.${data.products.indexOf(item)}.copy.${lang}" data-edit-type="textarea">${t(item.copy)}</p>
              </div>
            </article>`,
          )
          .join("")}
      </div>
    `;
  }

  function renderCases() {
    document.getElementById("cases").innerHTML = `
      <p class="section-kicker">Case Library</p>
      <h2>Poster Gallery</h2>
      <p class="section-subtitle">${lang === "zh" ? "案例库：四种校园运动广告视觉方向，图片层拥有 5 秒循环运动，文字保持静止。" : "Case library: four campaign directions with 5s motion on image layers while text remains still."}</p>
      <div class="gallery">
        ${data.cases
          .filter((item) => item.visible !== false)
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(
            (item, index) => `
            <article class="gallery-card">
              <div class="gallery-poster" style="aspect-ratio:${ratioValue(item.mediaRatio)}">
                ${mediaHTML(item, "gallery-img", t(item.title))}
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${t(item.title).split(" ")[0]}</strong>
              </div>
              <div class="gallery-meta">
                <h3 data-edit-path="cases.${data.cases.indexOf(item)}.title.${lang}" data-edit-type="text">${t(item.title)}</h3>
                <p class="gallery-cn-title" data-edit-path="cases.${data.cases.indexOf(item)}.cnTitle.${lang}" data-edit-type="text">${t(item.cnTitle)}</p>
                <p><span>${lang === "zh" ? "推荐表情" : "Expression"}</span>${t(item.expressionMode || item.expression)}</p>
                <p><span>${lang === "zh" ? "物件系统" : "Objects"}</span>${t(item.floatingObjectSystem || item.objects)}</p>
                <p><span>${lang === "zh" ? "动作瞬间" : "Moment"}</span>${t(item.actionMoment || item.action)}</p>
                <blockquote data-edit-path="cases.${data.cases.indexOf(item)}.promptExcerpt.${lang}" data-edit-type="textarea">${t(item.promptExcerpt || item.excerpt)}</blockquote>
              </div>
            </article>`,
          )
          .join("")}
      </div>
    `;
  }

  function routeExpression() {
    const { scene, sport, mood } = routerState;
    if (scene.includes("庆祝") || scene.includes("Celebration")) {
      return [lang === "zh" ? "胜利庆祝" : "Victory Celebration", lang === "zh" ? "画面围绕获胜、欢呼或击掌展开，表情可以更开放，强调团队释放和胜利情绪。" : "Winning, cheering, and high-five scenes call for open celebration energy."];
    }
    if (scene.includes("技术") || scene.includes("Technical") || sport === "田径" || sport === "足球" || sport === "Track" || sport === "Soccer") {
      return [lang === "zh" ? "专注沉着" : "Focused & Composed", lang === "zh" ? "技术动作需要精准和控制感，人物表情应保持锁定、冷静和高度集中。" : "Technical actions read best with controlled, locked-in focus."];
    }
    if (scene.includes("团队") || scene.includes("Team") || mood.includes("青春") || mood.includes("复古") || mood.includes("Youthful") || mood.includes("Retro")) {
      return [lang === "zh" ? "青春活力" : "Youthful & Energetic", lang === "zh" ? "社团和校园场景适合更明亮的情绪节奏，突出课后运动、同伴感和年轻能量。" : "Club scenes benefit from brighter after-class social energy."];
    }
    return [lang === "zh" ? "冷感自信" : "Cool & Aloof", lang === "zh" ? "单人英雄式构图、低机位压迫感和街头运动气质，更适合克制、冷静、带距离感的自信表情。" : "Solo heroic framing and street-sport styling favor calm confidence."];
  }

  function renderRouter() {
    const item = data.expressionRouter;
    document.getElementById("router").innerHTML = `
      <div class="router-layout">
        ${sectionHead(item)}
        <div class="panel">
          ${choiceGroup("scene", lang === "zh" ? "场景类型" : "Scene Type", item.sceneTypes)}
          ${choiceGroup("sport", lang === "zh" ? "运动项目" : "Sport", item.sports)}
          ${choiceGroup("mood", lang === "zh" ? "品牌情绪" : "Brand Mood", item.moods)}
          <div class="result"><span class="label">${lang === "zh" ? "推荐表情模式" : "Recommended Expression"}</span><strong id="expressionMode"></strong><p id="expressionReason"></p></div>
        </div>
      </div>
    `;
    document.querySelectorAll(".choices").forEach((wrap) => {
      wrap.addEventListener("click", (event) => {
        if (!event.target.matches("button")) return;
        routerState[wrap.dataset.group] = event.target.dataset.value;
        updateRouter();
      });
    });
    updateRouter();
  }

  function choiceGroup(group, label, options) {
    return `<div class="control"><span class="label">${label}</span><div class="choices" data-group="${group}">${options.map((option) => `<button class="choice" type="button" data-value="${option}">${option}</button>`).join("")}</div></div>`;
  }

  function updateRouter() {
    document.querySelectorAll(".choices").forEach((wrap) => {
      const group = wrap.dataset.group;
      wrap.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.value === routerState[group]));
    });
    const [mode, reason] = routeExpression();
    document.getElementById("expressionMode").textContent = mode;
    document.getElementById("expressionReason").textContent = reason;
  }

  function renderPrompt() {
    renderPromptRouter();
    return;
  }

  function routerDataV2() {
    return data.promptRouterV2 || window.siteData?.promptRouterV2 || {
      sportPromptRouterData: window.sportPromptRouterData,
      sportPacks: window.sportPacks,
      stylePacks: window.stylePacks,
      expressionModes: window.expressionModes,
      impactPacks: window.impactPacks,
      motionBlurPacks: window.motionBlurPacks,
      lightingPacks: window.lightingPacks,
      textureControlPack: window.textureControlPack,
      posterLayoutPack: window.posterLayoutPack,
    };
  }

  function getRouterPack(name) {
    return routerDataV2()[name] || window[name] || {};
  }

  function resolveDefaultLighting(state) {
    if (state.style === "retroMagazine") return "retroFilm";
    if (["badminton", "volleyball"].includes(state.sport)) return "indoorDrama";
    if (state.sport === "frisbee") return "brightCampus";
    return "outdoorGolden";
  }

  function normalizePromptRouterState(state) {
    const sports = getRouterPack("sportPacks");
    const sportKeys = Object.keys(sports);
    if (!sports[state.sport]) state.sport = sportKeys[0] || "basketball";
    const sport = sports[state.sport];
    if (!sport) return state;
    const actionKeys = Object.keys(sport.actions || {});
    const sceneKeys = Object.keys(sport.scenes || {});
    if (!sport.actions?.[state.action]) state.action = actionKeys[0];
    if (!sport.scenes?.[state.scene]) state.scene = sceneKeys[0];
    if (!state.impact) state.impact = getRouterPack("stylePacks")[state.style]?.impact || "medium";
    if (!state.referenceMode) state.referenceMode = "noReference";
    if (!state.platform) state.platform = "gptImage";
    if (typeof state.consistencyLock !== "boolean") state.consistencyLock = true;
    return state;
  }

  function resolveExpressionMode(state) {
    if (state.expression && state.expression !== "auto") return state.expression;
    const sport = getRouterPack("sportPacks")[state.sport];
    const action = sport?.actions?.[state.action];
    if (action?.expression) return action.expression;
    const style = getRouterPack("stylePacks")[state.style];
    if (style?.preferredExpression) return style.preferredExpression;
    return "modeA";
  }

  function getExpressionReason(state, resolvedExpression) {
    const sport = getRouterPack("sportPacks")[state.sport];
    const style = getRouterPack("stylePacks")[state.style];
    const action = sport?.actions?.[state.action];
    const expression = getRouterPack("expressionModes")[resolvedExpression];
    if (state.expression && state.expression !== "auto") return `当前表情为手动指定：${expression?.label || resolvedExpression}。`;
    return `当前运动项目为「${sport?.label || state.sport}」，动作瞬间为「${action?.label || state.action}」，风格为「${style?.label || state.style}」。系统优先根据动作状态判断表情，因此自动匹配 ${expression?.label || resolvedExpression}。`;
  }

  function validateSportConsistency(state, promptText) {
    const sport = getRouterPack("sportPacks")[state.sport];
    if (!sport) return ["未找到当前运动项目的场景包。"];
    const warnings = [];
    const lowerPrompt = String(promptText || "").toLowerCase();
    (sport.forbidden || "")
      .split(",")
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean)
      .forEach((word) => {
        if (word && lowerPrompt.includes(word)) warnings.push(`当前运动项目为「${sport.label}」，但 Prompt 中出现了不应出现的元素：${word}`);
      });
    return warnings;
  }

  function getPromptRouterParts(state) {
    normalizePromptRouterState(state);
    const sportData = getRouterPack("sportPromptRouterData");
    const sport = getRouterPack("sportPacks")[state.sport];
    const style = getRouterPack("stylePacks")[state.style];
    const action = sport.actions[state.action];
    const scene = sport.scenes[state.scene || Object.keys(sport.scenes)[0]];
    const expressionKey = resolveExpressionMode(state);
    const expression = getRouterPack("expressionModes")[expressionKey];
    const blur = getRouterPack("motionBlurPacks")[action.motionBlur || "technical"];
    const impact = getRouterPack("impactPacks")[state.impact || style.impact || "medium"];
    const lighting = getRouterPack("lightingPacks")[state.lighting || resolveDefaultLighting(state)];
    return { sportData, sport, style, action, scene, expressionKey, expression, blur, impact, lighting };
  }

  function buildMidjourneyPrompt(state) {
    const p = getPromptRouterParts(state);
    const referenceRule = state.referenceMode === "hasReference" ? p.sportData.referenceRules.hasReference.english : p.sportData.referenceRules.noReference.english;
    const outfit = state.referenceMode === "hasReference" ? "preserve the outfit from the reference image" : p.sport.defaultOutfit.english;
    const consistency = state.consistencyLock ? "keep the same facial identity, hairstyle, body proportions, outfit system, sportswear styling, and campaign visual language across the full poster series" : "";
    return [
      p.sportData.defaultCharacter.english,
      referenceRule,
      outfit,
      consistency,
      p.action.english,
      p.scene.english,
      p.sport.props.english,
      p.style.english,
      p.impact.english,
      p.expression.english,
      p.blur.english,
      p.lighting.english,
      p.textureControlPack?.english || getRouterPack("textureControlPack").english,
      getRouterPack("posterLayoutPack").english,
      "clear foreground, middle ground, and background layers",
      "no real brand logos, no unreadable text, no distorted limbs, no random outfit color changes",
      "--ar 4:5 --stylize 200 --v 7",
    ].filter(Boolean).join(", ");
  }

  function buildGPTImagePrompt(state) {
    const p = getPromptRouterParts(state);
    const referenceRule = state.referenceMode === "hasReference" ? p.sportData.referenceRules.hasReference.chinese : p.sportData.referenceRules.noReference.chinese;
    const outfitRule = state.referenceMode === "hasReference" ? "如果上传了垫图，请严格保持垫图中的服装颜色、款式、面料质感和整体穿搭，不要调用默认服饰。" : `默认服饰系统：${p.sport.defaultOutfit.chinese}`;
    const lockRule = state.consistencyLock ? "如果用于系列海报，请保持人物身份、服饰系统、运动项目设定和品牌视觉语言一致。" : "";
    return `请生成一张 4:5 竖版校园运动品牌海报。\n\n【参考图规则】\n${referenceRule}\n${lockRule}\n\n【运动项目】\n${p.sport.label}\n\n【服装系统】\n${outfitRule}\n\n【动作瞬间】\n${p.action.chinese}\n\n【场景与道具】\n场景：${p.scene.chinese}\n道具：${p.sport.props.chinese}\n\n【风格版本】\n${p.style.chinese}\n\n【视觉冲击】\n${p.impact.chinese}\n\n【表情模式】\n${p.expression.chinese}\n\n【运动模糊】\n${p.blur.chinese}\n\n【灯光设计】\n${p.lighting.chinese}\n\n【背景层次】\n请明确前景、中景和背景：前景为运动道具或场地纹理，中景为主角运动员，背景为与当前运动项目匹配的校园场地与建筑环境。\n\n【质感控制】\n${getRouterPack("textureControlPack").chinese}\n\n【海报排版】\n${getRouterPack("posterLayoutPack").chinese}\n\n【禁止】\n不要出现真实品牌 logo，不要生成乱码文字，不要出现与当前运动项目冲突的道具、场景或服饰。不要肢体畸形，不要多手指，不要塑料皮肤，不要过度磨皮，不要随机改变服装颜色。`;
  }

  function buildNanoBananaPrompt(state) {
    const p = getPromptRouterParts(state);
    const referenceRule = state.referenceMode === "hasReference" ? p.sportData.referenceRules.hasReference.chinese : p.sportData.referenceRules.noReference.chinese;
    const outfitRule = state.referenceMode === "hasReference" ? "有垫图时，人物和服装以垫图为最高优先级，只改变动作、场景、镜头、灯光和海报氛围。" : `无垫图时，使用当前运动项目默认服饰：${p.sport.defaultOutfit.chinese}`;
    const lockRule = state.consistencyLock ? "保持系列人物、服饰、运动项目设定和品牌视觉气质一致。" : "";
    return `生成一张 4:5 竖版校园运动品牌海报。\n\n【必须保持 / 参考图规则】\n${referenceRule}\n${outfitRule}\n${lockRule}\n\n【运动项目匹配】\n当前运动项目：${p.sport.label}\n必须使用该运动项目对应的场地、动作、道具和服饰，不要混入其他运动项目元素。\n\n【动作版本】\n${p.action.chinese}\n\n【场景版本】\n${p.scene.chinese}\n\n【道具系统】\n${p.sport.props.chinese}\n\n【风格版本】\n${p.style.chinese}\n\n【视觉冲击】\n${p.impact.chinese}\n\n【表情模式】\n${p.expression.chinese}\n\n【运动模糊】\n${p.blur.chinese}\n\n【灯光设计】\n${p.lighting.chinese}\n\n【背景层次】\n前景：运动道具或场地纹理；\n中景：主角运动员；\n背景：与当前运动项目匹配的校园场地、队友或建筑环境。\n\n【质感控制】\n${getRouterPack("textureControlPack").chinese}\n\n【海报版式】\n${getRouterPack("posterLayoutPack").chinese}\n\n【禁止】\n不要换脸，不要在有垫图时改变服装颜色或款式，不要出现其他运动项目的道具和场景，不要真实品牌 logo，不要乱码文字，不要卡通化，不要过度磨皮，不要塑料皮肤，不要杂乱背景。`;
  }

  function buildPlatformPrompt(state) {
    if (state.platform === "midjourney") return buildMidjourneyPrompt(state);
    if (state.platform === "nanoBanana") return buildNanoBananaPrompt(state);
    return buildGPTImagePrompt(state);
  }

  function buildWorkflowPreview(state) {
    const p = getPromptRouterParts(state);
    const referenceLabel = state.referenceMode === "hasReference" ? "有垫图 → 人物与服饰以垫图为最高优先级" : "无垫图 → 使用当前运动项目默认人物与服饰系统";
    return [
      `1. 运动项目：${p.sport.label} → 调用对应场景包`,
      `2. 参考图规则：${referenceLabel}`,
      `3. 动作瞬间：${p.action.label} → 自动匹配 ${p.expression.label}`,
      `4. 场景系统：${p.scene.label}`,
      `5. 风格叠加：${p.style.label} → 只改变广告气质，不改变运动本体`,
      `6. 质量控制：视觉冲击 + 运动模糊 + 灯光设计 + 背景层次 + 质感控制`,
      `7. 平台输出：${state.platform} → 输出对应结构的提示词`,
    ].join("\n");
  }

  function optionList(items, currentValue) {
    return Object.entries(items || {}).map(([value, item]) => `<option value="${value}" ${value === currentValue ? "selected" : ""}>${escapeHTML(item.englishLabel || item.label || value)}</option>`).join("");
  }

  function renderPromptRouterControls() {
    normalizePromptRouterState(promptRouterState);
    const sports = getRouterPack("sportPacks");
    const sport = sports[promptRouterState.sport];
    return `
      <label class="prompt-router-control"><span>Sport / 运动项目</span><select class="prompt-router-select" data-pr-field="sport">${optionList(sports, promptRouterState.sport)}</select></label>
      <label class="prompt-router-control"><span>Style / 风格版本</span><select class="prompt-router-select" data-pr-field="style">${optionList(getRouterPack("stylePacks"), promptRouterState.style)}</select></label>
      <label class="prompt-router-control"><span>Action / 动作瞬间</span><select class="prompt-router-select" data-pr-field="action">${optionList(sport.actions, promptRouterState.action)}</select></label>
      <label class="prompt-router-control"><span>Scene / 场景</span><select class="prompt-router-select" data-pr-field="scene">${optionList(sport.scenes, promptRouterState.scene)}</select></label>
      <label class="prompt-router-control"><span>Reference Mode / 参考图模式</span><select class="prompt-router-select" data-pr-field="referenceMode"><option value="noReference" ${promptRouterState.referenceMode === "noReference" ? "selected" : ""}>No Reference / 无垫图</option><option value="hasReference" ${promptRouterState.referenceMode === "hasReference" ? "selected" : ""}>Has Reference / 有垫图</option></select></label>
      <label class="prompt-router-control"><span>Expression / 表情模式</span><select class="prompt-router-select" data-pr-field="expression"><option value="auto" ${promptRouterState.expression === "auto" ? "selected" : ""}>Auto / 自动判断</option>${optionList(getRouterPack("expressionModes"), promptRouterState.expression)}</select></label>
      <label class="prompt-router-control"><span>Platform / 平台输出</span><select class="prompt-router-select" data-pr-field="platform"><option value="gptImage" ${promptRouterState.platform === "gptImage" ? "selected" : ""}>GPT Image</option><option value="nanoBanana" ${promptRouterState.platform === "nanoBanana" ? "selected" : ""}>Nano Banana</option><option value="midjourney" ${promptRouterState.platform === "midjourney" ? "selected" : ""}>Midjourney</option></select></label>
      <label class="prompt-router-control"><span>Impact Level / 视觉冲击</span><select class="prompt-router-select" data-pr-field="impact">${optionList(getRouterPack("impactPacks"), promptRouterState.impact)}</select></label>
      <label class="prompt-router-checkbox"><input type="checkbox" data-pr-field="consistencyLock" ${promptRouterState.consistencyLock ? "checked" : ""} /><span>Consistency Lock / 人物与服饰一致性</span></label>
    `;
  }

  function renderPromptRouterSummary() {
    const p = getPromptRouterParts(promptRouterState);
    return `<div class="prompt-router-summary"><span>运动：${p.sport.label}</span><span>动作：${p.action.label}</span><span>场景：${p.scene.label}</span><span>表情：${p.expression.label}</span><span>平台：${promptRouterState.platform}</span><span>一致性：${promptRouterState.consistencyLock ? "开启" : "关闭"}</span></div>`;
  }

  function renderSportRouteResult() {
    const p = getPromptRouterParts(promptRouterState);
    return `<div class="prompt-router-route"><strong>运动项目路由结果：</strong>${p.sport.label} → ${p.scene.label} / ${p.action.label} / ${p.sport.props.chinese} / ${promptRouterState.referenceMode === "hasReference" ? "垫图服饰优先" : p.sport.defaultOutfit.chinese}</div>`;
  }

  function renderPromptRouter() {
    const root = document.querySelector("#prompt") || document.querySelector("#router");
    if (!root || !getRouterPack("sportPacks").basketball) return;
    normalizePromptRouterState(promptRouterState);
    const resolvedExpression = resolveExpressionMode(promptRouterState);
    const reason = getExpressionReason(promptRouterState, resolvedExpression);
    const promptText = buildPlatformPrompt(promptRouterState);
    const workflowText = buildWorkflowPreview(promptRouterState);
    const warnings = validateSportConsistency(promptRouterState, promptText);
    root.innerHTML = `
      <div class="prompt-router-shell prompt-router-v2">
        <div class="prompt-router-header">
          <p class="eyebrow">PROMPT ROUTER / 提示词路由器</p>
          <h2>Campus Sports Poster Prompt Router</h2>
          <p class="section-subtitle">校园运动品牌海报提示词路由器</p>
          <p class="prompt-router-intro">根据运动项目、动作瞬间、品牌风格与参考图状态，自动路由场景、服饰、道具、表情、灯光与质感控制。</p>
        </div>
        <div class="prompt-router-grid">
          <div class="prompt-router-panel prompt-router-controls">${renderPromptRouterControls()}</div>
          <div class="prompt-router-output">
            <div class="output-header"><div><p class="eyebrow">CAMPUS_PROMPT_ROUTER.OUTPUT</p><h3>Platform Prompt</h3></div><div class="output-actions"><button type="button" data-pr-copy="prompt">Copy Prompt / 复制提示词</button><button type="button" data-pr-copy="workflow">Copy Workflow / 复制工作流</button><button type="button" data-pr-action="reset">Reset / 重置</button></div></div>
            ${renderPromptRouterSummary()}
            ${renderSportRouteResult()}
            ${warnings.length ? `<div class="prompt-router-warning">⚠ 当前运动项目、动作、场景、道具或服饰可能不一致。请检查是否误用了其他运动场景包。<br>${warnings.map(escapeHTML).join("<br>")}</div>` : ""}
            <div class="prompt-router-reason"><strong>表情判断理由：</strong>${escapeHTML(reason)}</div>
            <label class="prompt-output-label">Workflow Preview / 工作流预览</label>
            <pre class="workflow-preview" id="promptRouterWorkflow">${escapeHTML(workflowText)}</pre>
            <label class="prompt-output-label">Prompt Preview / 提示词预览</label>
            <pre class="prompt-output" id="promptRouterPrompt">${escapeHTML(promptText)}</pre>
          </div>
        </div>
      </div>
    `;
    bindPromptRouterEvents();
    if (document.getElementById("workflow")) renderWorkflow();
  }

  function handlePromptRouterSportChange(newSport) {
    promptRouterState.sport = newSport;
    const sport = getRouterPack("sportPacks")[newSport];
    promptRouterState.action = Object.keys(sport.actions || {})[0];
    promptRouterState.scene = Object.keys(sport.scenes || {})[0];
    promptRouterState.lighting = resolveDefaultLighting(promptRouterState);
    renderPromptRouter();
  }

  function bindPromptRouterEvents() {
    document.querySelectorAll("[data-pr-field]").forEach((el) => {
      el.addEventListener("change", (event) => {
        const field = event.target.dataset.prField;
        if (field === "sport") return handlePromptRouterSportChange(event.target.value);
        promptRouterState[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
        if (field === "style") promptRouterState.lighting = resolveDefaultLighting(promptRouterState);
        renderPromptRouter();
      });
    });
    document.querySelectorAll("[data-pr-copy]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.prCopy === "workflow") copyPromptRouterText(buildWorkflowPreview(promptRouterState));
        if (button.dataset.prCopy === "prompt") copyPromptRouterText(buildPlatformPrompt(promptRouterState));
      });
    });
    document.querySelectorAll("[data-pr-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.prAction === "reset") {
          promptRouterState = { ...defaultPromptRouterState };
          renderPromptRouter();
        }
      });
    });
  }

  async function copyPromptRouterText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showPromptRouterToast("Copied / 已复制");
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      showPromptRouterToast(ok ? "Copied / 已复制" : "Copy failed / 复制失败");
    }
  }

  function showPromptRouterToast(message) {
    let toast = document.querySelector(".prompt-router-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "prompt-router-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 1600);
  }

  function renderLegacyPrompt() {
    const item = data.promptGenerator;
    document.getElementById("prompt").innerHTML = `
      ${sectionHead(item)}
      <div class="prompt-layout">
        <div class="panel prompt-form" id="promptForm"></div>
        <div class="panel prompt-output">
          <div class="toolbar">
            <span class="file-name">campus_gravity_break.prompt</span>
            <div class="tools">
              <button class="tool-btn" id="copyPrompt">Copy Prompt / 复制提示词</button>
              <button class="tool-btn" id="coolVersion">Cool Version / 冷感版本</button>
              <button class="tool-btn" id="youthfulVersion">Youthful Version / 青春版本</button>
              <button class="tool-btn" id="resetPrompt">Reset / 重置</button>
            </div>
          </div>
          <pre id="promptOutput"></pre>
        </div>
      </div>
    `;
    renderPromptForm();
    setupPromptButtons();
    updatePrompt();
  }

  function renderPromptForm() {
    document.getElementById("promptForm").innerHTML = data.promptGenerator.fields
      .map(([key, label]) => `<label><span class="label">${label}</span><textarea rows="${key === "floatingObjectSet" || key === "posterStyle" ? 3 : 2}" data-field="${key}">${promptValues[key]}</textarea></label>`)
      .join("");
    document.getElementById("promptForm").addEventListener("input", (event) => {
      if (!event.target.matches("textarea")) return;
      useDefaultPrompt = false;
      promptValues[event.target.dataset.field] = event.target.value;
      updatePrompt();
    });
  }

  function buildPrompt() {
    return (data.promptGenerator.outputTemplate || "")
      .replaceAll("{scene}", promptValues.scene)
      .replaceAll("{sport}", promptValues.sport)
      .replaceAll("{character}", promptValues.character)
      .replaceAll("{actionMoment}", promptValues.actionMoment)
      .replaceAll("{expressionMode}", promptValues.expressionMode)
      .replaceAll("{floatingObjectSet}", promptValues.floatingObjectSet)
      .replaceAll("{lighting}", promptValues.lighting)
      .replaceAll("{posterStyle}", promptValues.posterStyle);
  }

  function defaultPrompt() {
    const d = data.promptGenerator.defaults;
    return `Create a hyper-realistic vertical campus sports brand advertisement photograph inside a modern campus basketball gym, filled with explosive youth basketball energy. A young East Asian female basketball athlete crouches low on the glossy reflective court floor in a dramatic ultra-wide-angle pose, one hand thrust toward the camera in extreme foreground and the other arm reaching outward and upward, wearing a retro blue and yellow campus basketball uniform, striped white socks, and basketball sneakers. Her expression is cool, focused, and self-possessed, with sharp eyes, neutral mouth, calm confidence, and controlled athletic intensity. Around her, a large spinning basketball floats diagonally in the upper left, surrounded by exactly 7 prominent suspended basketball-related object groups: ${d.floatingObjectSet}. Add sweat droplets, rubber dust, tape strips, blue-and-yellow fabric ribbons, and kicked-up court particles. Use glossy floor reflections, frozen motion, cinematic fisheye perspective, shallow depth of field, dramatic lighting, realistic skin and fabric texture, vivid orange, blue, white, and yellow palette, nostalgic 90s sports film energy, and modern youth sportswear campaign style. No real brand logos. Do not copy any exact reference composition, typography layout, pose, or final visual result.`;
  }

  function updatePrompt() {
    document.getElementById("promptOutput").textContent = useDefaultPrompt ? defaultPrompt() : buildPrompt();
  }

  function setupPromptButtons() {
    document.getElementById("copyPrompt").addEventListener("click", async () => {
      await navigator.clipboard.writeText(document.getElementById("promptOutput").textContent);
      const button = document.getElementById("copyPrompt");
      button.textContent = "Copied / 已复制";
      setTimeout(() => (button.textContent = "Copy Prompt / 复制提示词"), 1500);
    });
    document.getElementById("coolVersion").addEventListener("click", () => setPromptVersion("cool"));
    document.getElementById("youthfulVersion").addEventListener("click", () => setPromptVersion("youthful"));
    document.getElementById("resetPrompt").addEventListener("click", () => {
      useDefaultPrompt = true;
      promptValues = { ...data.promptGenerator.defaults };
      renderPromptForm();
      updatePrompt();
    });
  }

  function setPromptVersion(version) {
    useDefaultPrompt = false;
    promptValues.expressionMode = version === "cool" ? "cool, aloof, focused, and self-possessed" : "youthful, energetic, bright, and emotionally open";
    promptValues.posterStyle = version === "cool" ? "graphite shadows, electric blue edge light, basketball orange impact accents, premium street-sport campaign style" : "sunlit campus yellow, vivid blue, bright orange motion accents, playful retro youth club campaign style";
    renderPromptForm();
    updatePrompt();
  }

  function renderGrammar() {
    document.getElementById("grammar").innerHTML = `
      <p class="section-kicker">Visual Grammar</p>
      <h2>Visual Grammar</h2>
      <p class="section-subtitle">${lang === "zh" ? "视觉语法：镜头冲击、角色锚点、动作瞬间与漂浮道具系统。" : "Visual grammar: lens impact, character anchor, decisive action, and floating props."}</p>
      <div class="grammar-grid">
        ${data.grammarCards
          .filter((card) => card.visible !== false)
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((card) => {
            const originalIndex = data.grammarCards.indexOf(card);
            const sources = assetCandidates(card.image || card.cover || card.poster || "", card.poster || card.cover || "");
            return `<article class="card">${sources[0] ? `<img class="grammar-thumb" src="${versionAsset(sources[0])}" data-fallbacks="${escapeAttr(JSON.stringify(sources.slice(1)))}" alt="${t(card.title)}" style="aspect-ratio:${ratioValue(card.mediaRatio)};object-fit:${card.objectFit};object-position:${card.objectPosition}" onerror="window.cgbImageFallback(this)" />` : ""}<div class="tag" data-edit-path="grammarCards.${originalIndex}.label.${lang}" data-edit-type="text">${t(card.label || card.tag)}</div><h3 data-edit-path="grammarCards.${originalIndex}.title.${lang}" data-edit-type="text">${t(card.title)}</h3><p data-edit-path="grammarCards.${originalIndex}.description.${lang}" data-edit-type="textarea">${t(card.description || card.copy)}</p></article>`;
          })
          .join("")}
      </div>
    `;
  }

  function renderWorkflow() {
    const steps = [
      {
        title: "Step 01｜Sport First / 运动项目优先",
        copy: "先选择运动项目，系统调用对应运动场景包。篮球、飞盘、足球、田径、排球、羽毛球分别拥有自己的场地、动作、道具和服饰系统。",
      },
      {
        title: "Step 02｜Reference Priority / 参考图优先",
        copy: "如果上传人物或服装垫图，系统优先保持垫图中的人物长相、发型、身形、服装颜色、服装款式和面料质感；如果没有垫图，才使用当前运动项目默认服饰。",
      },
      {
        title: "Step 03｜Action & Expression Router / 动作与表情路由",
        copy: "系统根据动作状态自动判断表情：技术动作匹配冷静专注，单人品牌主视觉匹配高冷态度，多人社团匹配青春活力，庆祝瞬间匹配胜利情绪。",
      },
      {
        title: "Step 04｜Style Overlay / 风格叠加",
        copy: "风格版本只改变画面气质与广告风格，不改变运动项目本体。飞盘仍是飞盘，足球仍是足球，田径仍在跑道上。",
      },
      {
        title: "Step 05｜Image Quality Control / 画面质量控制",
        copy: "系统自动加入视觉冲击、运动模糊、灯光设计、背景层次和质感控制，避免画面变成普通运动照片或廉价 AI 图。",
      },
      {
        title: "Step 06｜Platform Output / 平台专用输出",
        copy: "最终根据平台输出不同提示词结构：Midjourney 使用英文关键词密集版，GPT Image 使用中文自然语言约束版，Nano Banana 使用分块式约束版。",
      },
    ];
    const workflowPreview = typeof buildWorkflowPreview === "function" ? buildWorkflowPreview(promptRouterState) : "";
    document.getElementById("workflow").innerHTML = `
      <p class="section-kicker">WORKFLOW / 生成逻辑</p>
      <h2>From Sport Pack to Platform Prompt</h2>
      <p class="section-subtitle">从运动项目场景包到平台专用提示词：先确定运动本体，再叠加风格、表情、质量控制和输出格式。</p>
      <div class="workflow-grid workflow-logic-grid">${steps.map((step, index) => `<article class="workflow-card workflow-step-card"><div class="tag">${String(index + 1).padStart(2, "0")}</div><h3>${step.title}</h3><p>${step.copy}</p></article>`).join("")}</div>
      <div class="workflow-compare">
        <article class="workflow-card workflow-step-card"><div class="tag">ERROR</div><h3>错误逻辑</h3><p>飞盘场景继续使用篮球、篮球架、篮球场和篮球服。</p></article>
        <article class="workflow-card workflow-step-card"><div class="tag">RIGHT</div><h3>正确逻辑</h3><p>飞盘场景自动切换为校园草坪、飞盘、奔跑接盘、轻量训练服和明亮校园光。</p></article>
      </div>
      <label class="prompt-output-label">Current Workflow Preview / 当前流程</label>
      <pre class="workflow-preview">${escapeHTML(workflowPreview)}</pre>
    `;
  }

  function renderCTA() {
    const item = data.cta;
    document.getElementById("cta").innerHTML = `
      <div class="system-card">
        <p class="section-kicker">${t(item.kicker)}</p>
        <h2>${t(item.title)}</h2>
        <p class="section-subtitle">${t(item.subtitle)}</p>
        <div class="actions">${(item.buttons || []).map((button) => `<a class="button ${button.style === "primary" ? "primary" : ""}" href="${button.href || "#top"}">${t(button.label)}</a>`).join("")}</div>
      </div>
    `;
  }

  function applySectionOrderAndVisibility() {
    const main = document.querySelector("main");
    const idByKey = {
      hero: "top",
      brandStory: "story",
      campaignMedia: "campaign",
      products: "products",
      cases: "cases",
      expressionRouter: "router",
      promptGenerator: "prompt",
      grammarCards: "grammar",
      workflow: "workflow",
      cta: "cta",
    };
    data.meta.sectionOrder.forEach((key) => {
      const node = document.getElementById(idByKey[key]);
      if (!node) return;
      node.hidden = data.meta.sections?.[key]?.visible === false;
      main.appendChild(node);
    });
  }

  function setupMotion() {
    const stage = document.getElementById("posterStage");
    const poster = document.getElementById("poster");
    if (!stage || !poster) return;
    stage.onmousemove = (event) => {
      const rect = stage.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      poster.style.setProperty("--poster-x", `${x * -0.025}px`);
      poster.style.setProperty("--poster-y", `${y * -0.025}px`);
      poster.style.setProperty("--poster-ry", `${x * 0.012}deg`);
      poster.style.setProperty("--poster-rx", `${y * -0.01}deg`);
      stage.querySelectorAll(".float").forEach((item) => {
        const depth = Number(item.dataset.depth);
        item.style.setProperty("--float-x", `${x * (depth / 38)}px`);
        item.style.setProperty("--float-y", `${y * (depth / 38)}px`);
        item.style.setProperty("--float-r", `${x * (depth / 260)}deg`);
      });
    };
    if (window.__cgbScrollBound) return;
    window.__cgbScrollBound = true;
    window.addEventListener("scroll", () => {
      const hero = document.querySelector(".hero");
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      hero.style.setProperty("--hero-shift", `${progress * -46}px`);
      hero.style.setProperty("--stage-shift", `${progress * 13}px`);
      poster.style.setProperty("--scroll-tilt", `${progress * -1.8}deg`);
    }, { passive: true });
  }

  function pathGet(path) {
    return path.split(".").reduce((target, key) => (target == null ? undefined : target[key]), data);
  }

  function pathSet(path, value) {
    const keys = path.split(".");
    let target = data;
    keys.slice(0, -1).forEach((key) => {
      if (target[key] == null) target[key] = {};
      target = target[key];
    });
    target[keys[keys.length - 1]] = value;
  }

  function refreshDraftAndPreview(options = {}) {
    pushUndoState();
    data = normalizeData(data);
    data.meta.savedAt = new Date().toISOString();
    promptValues = { ...data.promptGenerator.defaults };
    renderAll();
    if (options.exportFiles) {
      exportDiskDataFiles();
      notifySave("已导出 siteData.js 和 siteData.boot.js，请覆盖项目文件夹后上传 GitHub。");
      return;
    }
    notifySave(isEditMode ? "预览已更新。修改配图后请直接编辑 siteData.js，或点「导出到本地文件」覆盖。" : "内容已更新。");
  }

  function installInlineEditControls() {
    document.querySelectorAll(".inline-edit-button").forEach((button) => button.remove());
    document.querySelectorAll(".editable-target").forEach((node) => {
      node.classList.remove("editable-target", "editable-active");
      node.removeAttribute("tabindex");
      node.removeAttribute("title");
    });
    if (!isEditMode) return;

    document.querySelectorAll("[data-edit-path]").forEach((node) => {
      node.classList.add("editable-target");
      node.setAttribute("tabindex", "0");
      node.title = lang === "zh" ? "点击在编辑面板中修改此内容" : "Click to edit in the panel";
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        document.querySelectorAll(".editable-active").forEach((el) => el.classList.remove("editable-active"));
        node.classList.add("editable-active");
        openFieldEditor(node.dataset.editPath, node.dataset.editType || "text");
      });
    });
  }

  function openFieldEditor(path, type) {
    const pathInput = document.getElementById("activePath");
    const typeInput = document.getElementById("activeType");
    const valueInput = document.getElementById("activeValue");
    const quickEdit = document.getElementById("quickEditBlock");
    if (!pathInput || !valueInput) return;
    pathInput.value = path;
    if (typeInput) typeInput.value = type;
    const value = pathGet(path);
    valueInput.value = typeof value === "object" ? JSON.stringify(value, null, 2) : value ?? "";
    if (quickEdit) quickEdit.hidden = false;
    const panel = document.getElementById("editorPanel");
    if (panel) {
      panel.scrollTop = 0;
      valueInput.focus();
    }
  }

  function renderEditor() {
    if (!isEditMode) return;
    document.body.classList.add("edit-mode");
    const panel = document.getElementById("editorPanel");
    const sectionRows = data.meta.sectionOrder
      .map((key, index) => `<div class="editor-row"><input class="section-order" data-section="${key}" type="number" value="${index + 1}" min="1" /><label><input class="section-visible" data-section="${key}" type="checkbox" ${data.meta.sections[key]?.visible !== false ? "checked" : ""} /> ${key}</label></div>`)
      .join("");
    const productOptions = data.products.map((item, index) => `<option value="${index}">${item.id}</option>`).join("");
    const caseOptions = data.cases.map((item, index) => `<option value="${index}">${item.id}</option>`).join("");
    const grammarOptions = data.grammarCards.map((item, index) => `<option value="${index}">${item.id}</option>`).join("");
    const objectOptions = data.hero.objects.map((item, index) => `<option value="${index}">${item.id}</option>`).join("");
    panel.innerHTML = `
      <div class="editor-dragbar" id="editorDragbar">
        <div>
          <p class="section-kicker">Local Edit Mode</p>
          <h2>EditorPanel</h2>
        </div>
        <span>Drag</span>
      </div>
      <div class="editor-status" id="editorStatus">内容读取自本地 siteData.js。改配图请编辑 siteData.js 后运行 npm run save-local；或点「导出到本地文件」覆盖项目文件。</div>
      <div class="editor-quick-edit" id="quickEditBlock" hidden>
        <p class="section-kicker">Quick Edit / 点击页面文字</p>
        <label>字段路径<input id="activePath" readonly /></label>
        <input id="activeType" type="hidden" value="text" />
        <label>内容<textarea id="activeValue" rows="4"></textarea></label>
        <button class="tool-btn" id="saveActiveField" type="button">保存当前字段</button>
      </div>
      <div class="tools editor-top-tools">
        <button class="tool-btn" id="undoEdit">撤回一步 Ctrl+Z</button>
        <button class="tool-btn" id="exportDiskTop">导出到本地文件</button>
        <button class="tool-btn" id="saveAndReload">导出并刷新页面</button>
        <button class="tool-btn" id="clearDraftTop">重新读取磁盘数据</button>
      </div>
      <div class="editor-tabs">
        <button class="editor-tab active" data-tab="text">文字</button>
        <button class="editor-tab" data-tab="media">Media</button>
        <button class="editor-tab" data-tab="collections">Items</button>
        <button class="editor-tab" data-tab="layout">Layout</button>
        <button class="editor-tab" data-tab="color">颜色</button>
        <button class="editor-tab" data-tab="data">Data</button>
      </div>

      <div class="editor-pane active" data-pane="text">
        <label>编辑语言<select id="editorLang"><option value="zh" ${lang === "zh" ? "selected" : ""}>中文 zh</option><option value="en" ${lang === "en" ? "selected" : ""}>English en</option></select></label>
        <label>文字大类<select id="textCategory">${textCategoryOptions()}</select></label>
        <div id="textFields"></div>
        <label>Prompt output template<textarea id="promptTemplateEditor" rows="5">${data.promptGenerator.outputTemplate}</textarea></label>
        <div class="tools">
          <button class="tool-btn" id="saveTextFields">Save Text</button>
          <button class="tool-btn" id="savePromptTemplate">Save Prompt Template</button>
          <button class="tool-btn" id="resetDraft">恢复磁盘默认</button>
        </div>
        <p class="editor-help">本栏修改仅影响当前预览，不会写入浏览器。配图路径清单见 media-paths.txt（npm run list-media）。改完 siteData.js 后运行 npm run save-local。</p>
      </div>

      <div class="editor-pane" data-pane="media">
        <div class="asset-guide">
          <strong>本地图片/视频放置位置</strong>
          <p>海报：/assets/posters/</p>
          <p>产品：/assets/products/</p>
          <p>案例：/assets/cases/</p>
          <p>视频：/assets/videos/</p>
          <p>物件：/assets/objects/</p>
          <p>放入或替换文件后，在下方路径填写相对路径，例如 ./assets/posters/new.png，点击 Save Media，再刷新网页即可重新读取。</p>
          <p>如果替换同名文件，页面也会自动加版本号来刷新显示。</p>
        </div>
        <label>Hero media type<select id="heroMediaType"><option value="image" ${data.hero.mainMediaType === "image" ? "selected" : ""}>image</option><option value="video" ${data.hero.mainMediaType === "video" ? "selected" : ""}>video</option></select></label>
        <label>Hero media path<input id="heroMediaSrc" value="${data.hero.mainMediaSrc}" /></label>
        <label>Hero poster fallback<input id="heroMediaPoster" value="${data.hero.mainMediaPoster}" /></label>
        <label>Hero media ratio${ratioSelect("heroMediaRatio", data.hero.mainMediaRatio)}</label>
        <label>Hero object-fit${fitSelect("heroObjectFit", data.hero.mainMediaObjectFit)}</label>
        <label>Hero crop position<input id="heroObjectPosition" value="${data.hero.mainMediaObjectPosition}" /></label>
        <label>Background type<select id="heroBgType"><option value="none" ${data.hero.backgroundMediaType === "none" ? "selected" : ""}>none</option><option value="gradient" ${data.hero.backgroundMediaType === "gradient" ? "selected" : ""}>gradient</option><option value="image" ${data.hero.backgroundMediaType === "image" ? "selected" : ""}>image</option><option value="video" ${data.hero.backgroundMediaType === "video" ? "selected" : ""}>video</option></select></label>
        <label>Background media path<input id="heroBgSrc" value="${data.hero.backgroundMediaSrc}" /></label>
        <label>Background video poster<input id="heroBgPoster" value="${data.hero.backgroundVideoPoster}" /></label>
        <label>Overlay opacity<input id="heroBgOpacity" type="number" step="0.05" min="0" max="1" value="${data.hero.backgroundOverlayOpacity}" /></label>
        <h3 class="editor-subtitle">Brand Story media / 品牌故事图片</h3>
        ${sectionMediaFields("brandStory", data.brandStory, "Brand Story")}
        <h3 class="editor-subtitle">Campaign media / 主视觉视频或图片</h3>
        ${sectionMediaFields("campaignMedia", data.campaignMedia, "Campaign")}
        <h3 class="editor-subtitle">Roller promo / 主视觉下方轮滑宣传视频</h3>
        ${sectionMediaFields("campaignPromo", data.campaignMedia.promoVideo, "Campaign promo")}
        <h3 class="editor-subtitle">Floating objects / 首页漂浮物件</h3>
        <label>Floating object<select id="objectIndex">${objectOptions}</select></label>
        <div id="objectEditor"></div>
        <div class="tools">
          <button class="tool-btn" id="saveMedia">Save Media</button>
          <button class="tool-btn" id="restoreHeroPoster">恢复默认首页海报</button>
        </div>
      </div>

      <div class="editor-pane" data-pane="collections">
        <div class="asset-guide">
          <strong>新增内容</strong>
          <p>点击“新增产品线”或“新增案例”会在当前列表末尾添加一个新项目，不会覆盖已有内容。</p>
        </div>
        <label>Product<select id="productIndex">${productOptions}</select></label>
        <div id="productEditor"></div>
        <div class="tools"><button class="tool-btn" id="saveProduct">保存产品线</button><button class="tool-btn primary-action" id="addProduct">新增产品线</button></div>
        <label>Case<select id="caseIndex">${caseOptions}</select></label>
        <div id="caseEditor"></div>
        <div class="tools"><button class="tool-btn" id="saveCase">保存案例</button><button class="tool-btn primary-action" id="addCase">新增案例</button></div>
        <label>Visual grammar card<select id="grammarIndex">${grammarOptions}</select></label>
        <div id="grammarEditor"></div>
        <div class="tools"><button class="tool-btn" id="saveGrammar">Save Grammar</button><button class="tool-btn" id="addGrammar">Add Grammar Card</button></div>
      </div>

      <div class="editor-pane" data-pane="layout">
        <p class="editor-help">Change section order number and visibility, then save.</p>
        ${sectionRows}
        <button class="tool-btn" id="saveSections">Save Section Layout</button>
      </div>

      <div class="editor-pane" data-pane="color">
        <p class="editor-help">只使用当前网页涉及到的色卡，避免颜色过多。</p>
        <div class="palette-grid">${paletteButtons()}</div>
        ${colorField("heroTitle", "首页大标题")}
        ${colorField("heroSubtitle", "首页副标题")}
        ${colorField("sectionTitle", "区块大标题")}
        ${colorField("body", "正文")}
        ${colorField("label", "黄色 micro labels")}
        ${colorField("cardTitle", "卡片标题")}
        <h3 class="editor-subtitle">Typography / 字号</h3>
        ${sizeField("heroTitle", "首页大标题 rem")}
        ${sizeField("sectionTitle", "区块大标题 rem")}
        ${sizeField("heroSubtitle", "首页副标题 rem")}
        ${sizeField("sectionSubtitle", "区块副标题 rem")}
        ${sizeField("body", "正文 rem")}
        ${sizeField("cardTitle", "卡片标题 rem")}
        ${sizeField("label", "标签 rem")}
        ${sizeField("nav", "导航 rem")}
        ${sizeField("button", "按钮 rem")}
        ${sizeField("productSubtitle", "产品/案例中文副标题 rem")}
        ${sizeField("galleryOverlay", "案例图片叠字 rem")}
        ${sizeField("statNumber", "数据数字 rem")}
        ${sizeField("statText", "数据说明 rem")}
        ${sizeField("blockquote", "引用/提示摘要 rem")}
        ${sizeField("editor", "编辑面板 rem")}
        <button class="tool-btn" id="saveColors">Save Colors</button>
      </div>

      <div class="editor-pane" data-pane="data">
        <label>Full data JSON editor<textarea id="editDataJson" rows="9">${JSON.stringify(data, null, 2)}</textarea></label>
        <div class="tools">
          <button class="tool-btn" id="saveFullData">Save Full JSON</button>
          <button class="tool-btn" id="exportJson">Export JSON</button>
          <button class="tool-btn" id="exportJs">Export JS</button>
        </div>
        <label>Import pasted JSON<textarea id="importText" rows="5"></textarea></label>
        <button class="tool-btn" id="importJson">Import JSON</button>
        <label>Export output<textarea id="exportText" rows="7" readonly></textarea></label>
      </div>
    `;
    wireEditor(panel);
  }

  function saveWithoutUndo(message, exportFiles = false) {
    data = normalizeData(data);
    data.meta.savedAt = new Date().toISOString();
    renderAll();
    if (exportFiles) exportDiskDataFiles();
    notifySave(message || (exportFiles ? "已导出 siteData.js 和 siteData.boot.js。" : "预览已更新。"));
  }

  function ratioSelect(id, selected) {
    return `<select id="${id}">${["1:1", "4:5", "3:4", "16:9", "9:16", "2:3", "3:2", "2:1"].map((r) => `<option value="${r}" ${selected === r ? "selected" : ""}>${r}</option>`).join("")}</select>`;
  }

  function fitSelect(id, selected) {
    return `<select id="${id}">${["cover", "contain", "fill", "none", "scale-down"].map((v) => `<option value="${v}" ${selected === v ? "selected" : ""}>${v}</option>`).join("")}</select>`;
  }

  function mediaTypeSelect(id, selected) {
    return `<select id="${id}">${["image", "video"].map((v) => `<option value="${v}" ${selected === v ? "selected" : ""}>${v}</option>`).join("")}</select>`;
  }

  function sectionMediaFields(prefix, item, label) {
    return `
      <label>${label} media type${mediaTypeSelect(`${prefix}MediaType`, item.mediaType || "image")}</label>
      <label>${label} image path<input id="${prefix}Image" value="${item.image || item.cover || ""}" /></label>
      <label>${label} video path<input id="${prefix}Video" value="${item.video || ""}" /></label>
      <label>${label} poster fallback<input id="${prefix}Poster" value="${item.poster || item.image || item.cover || ""}" /></label>
      <label>${label} media ratio${ratioSelect(`${prefix}Ratio`, item.mediaRatio || "16:9")}</label>
      <label>${label} object-fit${fitSelect(`${prefix}Fit`, item.objectFit || "cover")}</label>
      <label>${label} crop position<input id="${prefix}Position" value="${item.objectPosition || "center"}" /></label>
    `;
  }

  function textCategoryOptions() {
    const options = [
      ["hero", "Hero / 首页"],
      ["brandStory", "Brand Story / 品牌故事"],
      ["products", "Products / 产品线"],
      ["cases", "Cases / 案例库"],
      ["grammarCards", "Visual Grammar / 视觉语法"],
      ["expressionRouter", "Expression Router / 表情路由"],
      ["promptGenerator", "Prompt Generator / 提示词"],
      ["workflow", "Workflow / 工作流"],
      ["cta", "CTA / 结尾"],
    ];
    return options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  }

  function paletteButtons() {
    return Object.entries(data.appearance.palette)
      .map(([name, color]) => `<button class="palette-swatch" type="button" data-color="${color}" style="--swatch:${color}">${name}<span>${color}</span></button>`)
      .join("");
  }

  function colorField(key, label) {
    return `<label>${label}<select class="color-select" data-color-key="${key}">${Object.entries(data.appearance.palette).map(([name, color]) => `<option value="${color}" ${data.appearance.textColors[key] === color ? "selected" : ""}>${name} ${color}</option>`).join("")}</select></label>`;
  }

  function sizeField(key, label) {
    const value = data.appearance.fontSizes?.[key] ?? 1;
    return `<label>${label}<input class="size-input" data-size-key="${key}" type="number" min="0.5" max="16" step="0.05" value="${value}" /></label>`;
  }

  function renderTextFields() {
    const wrap = document.getElementById("textFields");
    if (!wrap) return;
    const category = document.getElementById("textCategory").value;
    const rows = [];
    const add = (label, path, multiline = false) => rows.push(`<label>${label}<${multiline ? "textarea" : "input"} class="text-edit-field" data-path="${path}" ${multiline ? "rows=\"4\"" : ""} value="${!multiline ? escapeAttr(pathGet(path) || "") : ""}">${multiline ? escapeHTML(pathGet(path) || "") : ""}</${multiline ? "textarea" : "input"}></label>`);
    if (category === "hero") {
      add("Title", `hero.title.${lang}`);
      add("Eyebrow", `hero.eyebrow.${lang}`);
      add("Subtitle", `hero.subtitle.${lang}`);
      add("Description", `hero.description.${lang}`, true);
      add("Index line", `hero.indexLine.${lang}`);
      data.hero.ctaButtons.forEach((button, i) => add(`CTA ${i + 1}`, `hero.ctaButtons.${i}.label.${lang}`));
    }
    if (category === "brandStory") {
      add("Title", `brandStory.title.${lang}`);
      add("Subtitle", `brandStory.subtitle.${lang}`, true);
      add("Copy", `brandStory.copy.${lang}`, true);
      (data.brandStory.paragraphs || []).forEach((_, i) => add(`Paragraph ${i + 1}`, `brandStory.paragraphs.${i}.${lang}`, true));
    }
    if (category === "products") data.products.forEach((item, i) => {
      rows.push(`<h3 class="editor-subtitle">${item.id}</h3>`);
      add("Title", `products.${i}.name.${lang}`);
      add("Subtitle", `products.${i}.cnName.${lang}`);
      add("Category", `products.${i}.category.${lang}`);
      add("Description", `products.${i}.copy.${lang}`, true);
    });
    if (category === "cases") data.cases.forEach((item, i) => {
      rows.push(`<h3 class="editor-subtitle">${item.id}</h3>`);
      add("Title", `cases.${i}.title.${lang}`);
      add("Chinese subtitle", `cases.${i}.cnTitle.${lang}`);
      add("Description", `cases.${i}.description.${lang}`, true);
      add("Expression", `cases.${i}.expressionMode.${lang}`);
      add("Action moment", `cases.${i}.actionMoment.${lang}`);
      add("Floating objects", `cases.${i}.floatingObjectSystem.${lang}`, true);
      add("Prompt excerpt", `cases.${i}.promptExcerpt.${lang}`, true);
    });
    if (category === "grammarCards") data.grammarCards.forEach((item, i) => {
      rows.push(`<h3 class="editor-subtitle">${item.id}</h3>`);
      add("Label", `grammarCards.${i}.label.${lang}`);
      add("Title", `grammarCards.${i}.title.${lang}`);
      add("Description", `grammarCards.${i}.description.${lang}`, true);
    });
    if (category === "expressionRouter") {
      add("Title", `expressionRouter.title.${lang}`);
      add("Subtitle", `expressionRouter.subtitle.${lang}`, true);
    }
    if (category === "promptGenerator") {
      add("Title", `promptGenerator.title.${lang}`);
      add("Subtitle", `promptGenerator.subtitle.${lang}`, true);
      Object.keys(data.promptGenerator.defaults).forEach((key) => rows.push(`<label>${key}<textarea class="prompt-default-field" data-key="${key}" rows="3">${escapeHTML(data.promptGenerator.defaults[key] || "")}</textarea></label>`));
    }
    if (category === "workflow") {
      add("Title", `workflow.title.${lang}`);
      add("Subtitle", `workflow.subtitle.${lang}`, true);
      (data.workflow.cards || data.workflow.steps || []).forEach((step, i) => {
        rows.push(`<h3 class="editor-subtitle">${step.id}</h3>`);
        add("Step title", `workflow.cards.${i}.title.${lang}`);
        add("Step copy", `workflow.cards.${i}.copy.${lang}`, true);
      });
    }
    if (category === "cta") {
      add("Title", `cta.title.${lang}`);
      add("Subtitle", `cta.subtitle.${lang}`, true);
      data.cta.buttons.forEach((button, i) => add(`Button ${i + 1}`, `cta.buttons.${i}.label.${lang}`));
    }
    wrap.innerHTML = rows.join("");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/\n/g, " ");
  }

  function wireEditor(panel) {
    panel.querySelectorAll(".editor-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        panel.querySelectorAll(".editor-tab,.editor-pane").forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");
        panel.querySelector(`[data-pane="${tab.dataset.tab}"]`).classList.add("active");
      });
    });
    panel.querySelector("#exportDiskTop").addEventListener("click", () => refreshDraftAndPreview({ exportFiles: true }));
    panel.querySelector("#saveAndReload").addEventListener("click", () => {
      refreshDraftAndPreview({ exportFiles: true });
      window.setTimeout(() => location.reload(), 1200);
    });
    panel.querySelector("#clearDraftTop").addEventListener("click", () => {
      purgeBrowserDraft();
      reloadDiskData();
      renderAll();
      notifySave("已重新读取磁盘 siteData.js / siteData.boot.js。");
    });
    panel.querySelector("#editorLang").addEventListener("change", (event) => {
      lang = "zh";
      event.target.value = "zh";
      renderAll();
    });
    panel.querySelector("#textCategory").addEventListener("change", renderTextFields);
    panel.querySelector("#undoEdit").addEventListener("click", undoLastChange);
    panel.querySelector("#saveActiveField")?.addEventListener("click", saveActiveField);
    panel.querySelector("#saveTextFields").addEventListener("click", saveTextFields);
    panel.querySelector("#savePromptTemplate").addEventListener("click", () => {
      data.promptGenerator.outputTemplate = panel.querySelector("#promptTemplateEditor").value;
      refreshDraftAndPreview();
    });
    panel.querySelector("#resetDraft").addEventListener("click", () => {
      purgeBrowserDraft();
      reloadDiskData();
      renderAll();
      notifySave("已恢复磁盘默认 siteData.js。");
    });
    panel.querySelector("#saveMedia").addEventListener("click", saveMediaEditor);
    panel.querySelector("#restoreHeroPoster").addEventListener("click", restoreDefaultHeroPoster);
    panel.querySelector("#objectIndex").addEventListener("change", renderObjectEditor);
    panel.querySelector("#productIndex")?.addEventListener("change", renderProductEditor);
    panel.querySelector("#caseIndex")?.addEventListener("change", renderCaseEditor);
    panel.querySelector("#grammarIndex")?.addEventListener("change", renderGrammarEditor);
    panel.querySelector("#saveProduct")?.addEventListener("click", saveProductEditor);
    panel.querySelector("#saveCase")?.addEventListener("click", saveCaseEditor);
    panel.querySelector("#saveGrammar")?.addEventListener("click", saveGrammarEditor);
    panel.querySelector("#addProduct")?.addEventListener("click", addProduct);
    panel.querySelector("#addCase")?.addEventListener("click", addCase);
    panel.querySelector("#addGrammar")?.addEventListener("click", addGrammar);
    panel.querySelector("#saveSections").addEventListener("click", saveSectionEditor);
    panel.querySelector("#saveColors").addEventListener("click", saveColorEditor);
    panel.querySelector("#saveFullData").addEventListener("click", () => {
      pushUndoState();
      data = normalizeData(safeParse(panel.querySelector("#editDataJson").value, data));
      refreshDraftAndPreview({ exportFiles: true });
    });
    panel.querySelector("#exportJson").addEventListener("click", () => (panel.querySelector("#exportText").value = JSON.stringify(data, null, 2)));
    panel.querySelector("#exportJs").addEventListener("click", () => (panel.querySelector("#exportText").value = `window.siteData = ${JSON.stringify(data, null, 2)};`));
    panel.querySelector("#importJson").addEventListener("click", () => {
      pushUndoState();
      data = normalizeData(safeParse(panel.querySelector("#importText").value, data));
      refreshDraftAndPreview({ exportFiles: true });
    });
    panel.onclick = (event) => {
      if (event.target.id === "deleteObject") deleteCurrentObject();
      if (event.target.id === "productDelete") deleteCurrentCollectionItem("products", "productIndex");
      if (event.target.id === "caseDelete") deleteCurrentCollectionItem("cases", "caseIndex");
      if (event.target.id === "grammarDelete") deleteCurrentCollectionItem("grammarCards", "grammarIndex");
    };
    renderObjectEditor();
    renderProductEditor();
    renderCaseEditor();
    renderGrammarEditor();
    renderTextFields();
    setupEditorDrag(panel);
  }

  function saveTextFields() {
    document.querySelectorAll(".text-edit-field").forEach((field) => pathSet(field.dataset.path, field.value));
    document.querySelectorAll(".prompt-default-field").forEach((field) => {
      data.promptGenerator.defaults[field.dataset.key] = field.value;
    });
    refreshDraftAndPreview();
  }

  function saveColorEditor() {
    document.querySelectorAll(".color-select").forEach((select) => {
      data.appearance.textColors[select.dataset.colorKey] = select.value;
    });
    data.appearance.fontSizes = data.appearance.fontSizes || {};
    document.querySelectorAll(".size-input").forEach((input) => {
      data.appearance.fontSizes[input.dataset.sizeKey] = Number(input.value);
    });
    refreshDraftAndPreview();
  }

  function setupEditorDrag(panel) {
    const handle = document.getElementById("editorDragbar");
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
    handle.addEventListener("pointerdown", (event) => {
      dragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const left = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, event.clientX - offsetX));
      const top = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, event.clientY - offsetY));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });
    handle.addEventListener("pointerup", () => {
      dragging = false;
    });
  }

  function saveActiveField() {
    const pathInput = document.getElementById("activePath");
    const typeInput = document.getElementById("activeType");
    const valueInput = document.getElementById("activeValue");
    if (!pathInput || !valueInput) return;
    const path = pathInput.value.trim();
    const type = typeInput?.value || "text";
    let value = valueInput.value;
    if (!path) return;
    if (type === "json") value = safeParse(value, pathGet(path));
    pathSet(path, value);
    refreshDraftAndPreview();
  }

  function saveMediaEditor() {
    data.hero.mainMediaType = document.getElementById("heroMediaType").value;
    data.hero.mainMediaSrc = document.getElementById("heroMediaSrc").value;
    data.hero.mainMediaPoster = document.getElementById("heroMediaPoster").value;
    data.hero.mainMediaRatio = document.getElementById("heroMediaRatio").value;
    data.hero.mainMediaObjectFit = document.getElementById("heroObjectFit").value;
    data.hero.mainMediaObjectPosition = document.getElementById("heroObjectPosition").value;
    data.hero.backgroundMediaType = document.getElementById("heroBgType").value;
    data.hero.backgroundMediaSrc = document.getElementById("heroBgSrc").value;
    data.hero.backgroundVideoPoster = document.getElementById("heroBgPoster").value;
    data.hero.backgroundOverlayOpacity = Number(document.getElementById("heroBgOpacity").value);
    saveSectionMedia("brandStory");
    saveSectionMedia("campaignMedia");
    saveCampaignPromoMedia();
    saveObjectEditor(false);
    refreshDraftAndPreview();
  }

  function saveCampaignPromoMedia() {
    const pv = data.campaignMedia?.promoVideo;
    if (!pv || !document.getElementById("campaignPromoMediaType")) return;
    pv.mediaType = document.getElementById("campaignPromoMediaType").value;
    pv.image = document.getElementById("campaignPromoImage").value;
    pv.video = document.getElementById("campaignPromoVideo").value;
    pv.poster = document.getElementById("campaignPromoPoster").value;
    pv.mediaRatio = document.getElementById("campaignPromoRatio").value;
    pv.objectFit = document.getElementById("campaignPromoFit").value;
    pv.objectPosition = document.getElementById("campaignPromoPosition").value;
  }

  function saveSectionMedia(prefix) {
    const item = data[prefix];
    if (!item) return;
    item.mediaType = document.getElementById(`${prefix}MediaType`).value;
    item.image = document.getElementById(`${prefix}Image`).value;
    item.cover = item.cover !== undefined ? item.image : item.cover;
    item.video = document.getElementById(`${prefix}Video`).value;
    item.poster = document.getElementById(`${prefix}Poster`).value;
    item.mediaRatio = document.getElementById(`${prefix}Ratio`).value;
    item.objectFit = document.getElementById(`${prefix}Fit`).value;
    item.objectPosition = document.getElementById(`${prefix}Position`).value;
  }

  function restoreDefaultHeroPoster() {
    data.hero.mainMediaType = "image";
    data.hero.mainMediaSrc = "./assets/posters/JTXL03品牌世界观主视觉2 (4).png";
    data.hero.mainMediaPoster = "./assets/posters/JTXL03品牌世界观主视觉2 (4).png";
    data.hero.mainMediaRatio = "4:5";
    data.hero.mainMediaObjectFit = "cover";
    data.hero.mainMediaObjectPosition = "center";
    refreshDraftAndPreview();
    notifySave("已恢复默认首页海报，并保存到本地草稿。");
  }

  function renderObjectEditor() {
    const index = Number(document.getElementById("objectIndex")?.value || 0);
    const item = data.hero.objects[index];
    if (!item) return;
    document.getElementById("objectEditor").innerHTML = `
      <label>Title zh<input id="objTitleZh" value="${item.title?.zh || t(item.title)}" /></label>
      <label>Title en<input id="objTitleEn" value="${item.title?.en || ""}" /></label>
      <label>Image path<input id="objImage" value="${item.image || ""}" /></label>
      <label>Visible<select id="objVisible"><option value="true" ${item.visible !== false ? "selected" : ""}>true</option><option value="false" ${item.visible === false ? "selected" : ""}>false</option></select></label>
      <div class="editor-grid-mini">
        <label>x<input id="objX" value="${item.x}" /></label><label>y<input id="objY" value="${item.y}" /></label>
        <label>scale<input id="objScale" type="number" step="0.05" value="${item.scale}" /></label><label>rotation<input id="objRotation" type="number" value="${item.rotation}" /></label>
        <label>opacity<input id="objOpacity" type="number" step="0.05" min="0" max="1" value="${item.opacity}" /></label><label>zIndex<input id="objZ" type="number" value="${item.zIndex}" /></label>
        <label>speed<input id="objSpeed" type="number" step="0.5" value="${item.animationSpeed}" /></label><label>parallax<input id="objParallax" type="number" value="${item.parallaxStrength}" /></label>
      </div>
      <button class="tool-btn danger" type="button" id="deleteObject">删除当前漂浮物</button>
    `;
  }

  function saveObjectEditor(shouldRefresh = true) {
    const index = Number(document.getElementById("objectIndex")?.value || 0);
    const item = data.hero.objects[index];
    if (!item) return;
    item.title = { zh: document.getElementById("objTitleZh").value, en: document.getElementById("objTitleEn").value };
    item.label = item.title;
    item.image = document.getElementById("objImage").value;
    item.visible = document.getElementById("objVisible").value === "true";
    item.x = document.getElementById("objX").value;
    item.y = document.getElementById("objY").value;
    item.scale = Number(document.getElementById("objScale").value);
    item.rotation = Number(document.getElementById("objRotation").value);
    item.opacity = Number(document.getElementById("objOpacity").value);
    item.zIndex = Number(document.getElementById("objZ").value);
    item.animationSpeed = Number(document.getElementById("objSpeed").value);
    item.parallaxStrength = Number(document.getElementById("objParallax").value);
    item.depth = item.parallaxStrength;
    if (shouldRefresh) refreshDraftAndPreview();
  }

  function deleteCurrentObject() {
    const index = Number(document.getElementById("objectIndex")?.value || 0);
    if (!data.hero.objects[index]) return;
    pushUndoState();
    data.hero.objects.splice(index, 1);
    saveWithoutUndo("已删除当前漂浮物。");
  }

  function deleteCurrentCollectionItem(collectionKey, selectId) {
    const index = Number(document.getElementById(selectId)?.value || 0);
    if (!data[collectionKey]?.[index]) return;
    pushUndoState();
    data[collectionKey].splice(index, 1);
    saveWithoutUndo("已删除当前项。");
  }

  function renderProductEditor() {
    const index = Number(document.getElementById("productIndex")?.value || 0);
    const item = data.products[index];
    if (!item) return;
    document.getElementById("productEditor").innerHTML = collectionEditorFields("product", item);
  }

  function renderCaseEditor() {
    const index = Number(document.getElementById("caseIndex")?.value || 0);
    const item = data.cases[index];
    if (!item) return;
    document.getElementById("caseEditor").innerHTML = collectionEditorFields("case", item);
  }

  function renderGrammarEditor() {
    const index = Number(document.getElementById("grammarIndex")?.value || 0);
    const item = data.grammarCards[index];
    if (!item) return;
    document.getElementById("grammarEditor").innerHTML = `
      ${collectionEditorFields("grammar", item, { imageLabel: "Grammar image path", defaultRatio: "16:9" })}
    `;
  }

  function collectionEditorFields(prefix, item, options = {}) {
    const imageValue = item.image || item.cover || "";
    const coverField = prefix === "case" ? `<label>Cover path<input id="${prefix}Cover" value="${item.cover || item.image || ""}" /></label>` : "";
    return `
      <div class="asset-guide small">
        <strong>${options.imageLabel || "Media path"}</strong>
        <p>产品图片建议放在 ./assets/products/，案例图片建议放在 ./assets/cases/，视觉语法图片建议放在 ./assets/grammar/。填写相对路径后点击保存，刷新也会保留。</p>
      </div>
      <label>Media type${mediaTypeSelect(`${prefix}MediaType`, item.mediaType || (item.video ? "video" : "image"))}</label>
      <label>${options.imageLabel || "Image path"}<input id="${prefix}Image" value="${imageValue}" /></label>
      ${coverField}
      <label>Video path<input id="${prefix}Video" value="${item.video || ""}" /></label>
      <label>Poster fallback<input id="${prefix}Poster" value="${item.poster || item.cover || item.image || ""}" /></label>
      <div class="editor-grid-mini">
        <label>Media ratio${ratioSelect(`${prefix}Ratio`, item.mediaRatio || options.defaultRatio || "4:5")}</label>
        <label>Object fit${fitSelect(`${prefix}Fit`, item.objectFit || "cover")}</label>
      </div>
      <label>Object position<input id="${prefix}Position" value="${item.objectPosition || "center"}" /></label>
      <label>Visible<select id="${prefix}Visible"><option value="true" ${item.visible !== false ? "selected" : ""}>true</option><option value="false" ${item.visible === false ? "selected" : ""}>false</option></select></label>
      <button class="tool-btn danger" type="button" id="${prefix}Delete">删除当前项</button>
      <label>Card JSON<textarea id="${prefix}Json" rows="8">${JSON.stringify(item, null, 2)}</textarea></label>
    `;
  }

  function saveProductEditor() {
    const index = Number(document.getElementById("productIndex")?.value || 0);
    const item = safeParse(document.getElementById("productJson").value, data.products[index]);
    item.mediaType = document.getElementById("productMediaType").value;
    item.image = document.getElementById("productImage").value;
    item.video = document.getElementById("productVideo").value;
    item.poster = document.getElementById("productPoster").value;
    item.mediaRatio = document.getElementById("productRatio").value;
    item.objectFit = document.getElementById("productFit").value;
    item.objectPosition = document.getElementById("productPosition").value;
    item.visible = document.getElementById("productVisible").value === "true";
    data.products[index] = item;
    refreshDraftAndPreview();
  }

  function saveCaseEditor() {
    const index = Number(document.getElementById("caseIndex")?.value || 0);
    const item = safeParse(document.getElementById("caseJson").value, data.cases[index]);
    item.mediaType = document.getElementById("caseMediaType").value;
    item.image = document.getElementById("caseImage").value;
    item.cover = document.getElementById("caseCover").value || item.image;
    item.video = document.getElementById("caseVideo").value;
    item.poster = document.getElementById("casePoster").value;
    item.mediaRatio = document.getElementById("caseRatio").value;
    item.objectFit = document.getElementById("caseFit").value;
    item.objectPosition = document.getElementById("casePosition").value;
    item.visible = document.getElementById("caseVisible").value === "true";
    data.cases[index] = item;
    refreshDraftAndPreview();
  }

  function saveGrammarEditor() {
    const index = Number(document.getElementById("grammarIndex")?.value || 0);
    const item = safeParse(document.getElementById("grammarJson").value, data.grammarCards[index]);
    item.mediaType = document.getElementById("grammarMediaType").value;
    item.image = document.getElementById("grammarImage").value;
    item.video = document.getElementById("grammarVideo").value;
    item.poster = document.getElementById("grammarPoster").value;
    item.mediaRatio = document.getElementById("grammarRatio").value;
    item.objectFit = document.getElementById("grammarFit").value;
    item.objectPosition = document.getElementById("grammarPosition").value;
    item.visible = document.getElementById("grammarVisible").value === "true";
    data.grammarCards[index] = item;
    refreshDraftAndPreview();
  }

  function saveSectionEditor() {
    const ordered = [...document.querySelectorAll(".section-order")]
      .map((input) => ({ key: input.dataset.section, order: Number(input.value) || 99 }))
      .sort((a, b) => a.order - b.order)
      .map((item) => item.key);
    data.meta.sectionOrder = ordered;
    document.querySelectorAll(".section-visible").forEach((input) => {
      data.meta.sections[input.dataset.section] = data.meta.sections[input.dataset.section] || {};
      data.meta.sections[input.dataset.section].visible = input.checked;
    });
    refreshDraftAndPreview();
  }

  function addProduct() {
    pushUndoState();
    data.products.push({
      id: `product-${Date.now()}`,
      name: { zh: "New Product", en: "New Product" },
      cnName: { zh: "新产品", en: "New Product" },
      category: { zh: "校园运动", en: "Campus Sport" },
      description: { zh: "填写产品说明。", en: "Add product description." },
      copy: { zh: "填写产品说明。", en: "Add product description." },
      image: "./assets/products/new-product.png",
      video: "",
      mediaType: "image",
      mediaRatio: "4:5",
      objectFit: "cover",
      objectPosition: "center",
      colorways: [],
      tags: [],
      scene: { zh: "校园运动", en: "Campus Sport" },
      relatedCampaign: "",
      visible: true,
    });
    saveWithoutUndo("已新增产品线。");
    const select = document.getElementById("productIndex");
    if (select) {
      select.value = String(data.products.length - 1);
      renderProductEditor();
    }
  }

  function addCase() {
    pushUndoState();
    data.cases.push({
      id: `case-${Date.now()}`,
      title: { zh: "New Case", en: "New Case" },
      cnTitle: { zh: "新案例", en: "New Case" },
      category: { zh: "战役案例", en: "Campaign Case" },
      cover: "./assets/cases/new-case.png",
      image: "./assets/cases/new-case.png",
      video: "",
      mediaType: "image",
      mediaRatio: "4:5",
      objectFit: "cover",
      objectPosition: "center",
      description: { zh: "填写案例描述。", en: "Add case description." },
      expressionMode: { zh: "冷感自信", en: "Cool & Aloof" },
      actionMoment: { zh: "填写动作瞬间", en: "Add action moment" },
      floatingObjectSystem: { zh: "填写物件系统", en: "Add object system" },
      promptExcerpt: { zh: "填写提示词摘要。", en: "Add prompt excerpt." },
      fullPrompt: "",
      tags: [],
      visible: true,
    });
    saveWithoutUndo("已新增案例。");
    const select = document.getElementById("caseIndex");
    if (select) {
      select.value = String(data.cases.length - 1);
      renderCaseEditor();
    }
  }

  function addGrammar() {
    data.grammarCards.push({
      id: `grammar-${Date.now()}`,
      label: { zh: "标签", en: "Label" },
      tag: { zh: "标签", en: "Label" },
      title: { zh: "新语法卡", en: "New Grammar Card" },
      description: { zh: "填写视觉语法说明。", en: "Add grammar description." },
      copy: { zh: "填写视觉语法说明。", en: "Add grammar description." },
      image: "",
      mediaRatio: "16:9",
      objectFit: "cover",
      objectPosition: "center",
      visible: true,
      order: data.grammarCards.length,
    });
    refreshDraftAndPreview();
  }

  function fractionVisibleInViewport(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return 0;
    const visibleW = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const visibleH = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return (visibleW * visibleH) / (rect.width * rect.height);
  }

  function sectionVideoPresenceSync(video) {
    if (!(video instanceof HTMLVideoElement)) return;
    const inViewNow = !document.hidden && fractionVisibleInViewport(video) >= SECTION_VIDEO_VISIBLE_RATIO;
    const wasInView = scrollVideoInView.get(video) === true;
    scrollVideoInView.set(video, inViewNow);
    if (inViewNow && !wasInView) {
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      video.play().catch(() => {});
    } else if (!inViewNow && wasInView) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }

  function setupScrollSectionVideos() {
    if (window.__cgbSectionVideoIo) {
      try {
        window.__cgbSectionVideoIo.disconnect();
      } catch {
        /* ignore */
      }
    }
    const videos = [...document.querySelectorAll("video[data-audio-video]")];
    if (!videos.length) return;
    const flush = () => {
      videos.forEach((v) => sectionVideoPresenceSync(v));
      applyVideoAudio(false);
    };
    const observer = new IntersectionObserver(flush, {
      threshold: [0, 0.12, SECTION_VIDEO_VISIBLE_RATIO - 1e-4, SECTION_VIDEO_VISIBLE_RATIO + 1e-4, 0.5, 0.75, 1],
      rootMargin: "0px",
    });
    videos.forEach((v) => {
      observer.observe(v);
    });
    window.__cgbSectionVideoIo = observer;
    flush();
  }

  function setupVideoAudioControl() {
    let button = document.getElementById("videoAudioToggle");
    if (!button) {
      button = document.createElement("button");
      button.id = "videoAudioToggle";
      button.className = "video-audio-toggle";
      button.type = "button";
      document.querySelector(".nav-tools")?.prepend(button);
    }
    button.onclick = () => {
      videosMuted = !videosMuted;
      applyVideoAudio(true);
    };
    if (!window.__cgbVideoAudioBound) {
      window.__cgbVideoAudioBound = true;
      const schedule = () => {
        window.cancelAnimationFrame(window.__cgbVideoAudioFrame);
        window.__cgbVideoAudioFrame = window.requestAnimationFrame(() => {
          [...document.querySelectorAll("video[data-audio-video]")].forEach((v) => sectionVideoPresenceSync(v));
          applyVideoAudio(false);
        });
      };
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      document.addEventListener("visibilitychange", schedule);
    }
    applyVideoAudio();
  }

  function getActiveVideo(videos) {
    if (document.hidden) return null;
    const inViewList = videos.filter((v) => scrollVideoInView.get(v) === true);
    if (!inViewList.length) return null;
    /** 自动跟声：在已进入版块的视频里，按「可见面积比 + 纵向居中程度」选出唯一主声轨（恒有结果） */
    let best = null;
    let bestScore = -1;
    inViewList.forEach((video) => {
      const frac = fractionVisibleInViewport(video);
      const rect = video.getBoundingClientRect();
      const videoMid = rect.top + rect.height / 2;
      const viewMid = window.innerHeight / 2;
      const centerFit = 1 - Math.min(1, Math.abs(videoMid - viewMid) / Math.max(window.innerHeight, 1));
      const score = frac * 10 + centerFit * 3;
      if (score > bestScore) {
        bestScore = score;
        best = video;
      }
    });
    return best;
  }

  async function applyVideoAudio(userTriggered = false) {
    const videos = [...document.querySelectorAll("video[data-audio-video]")];
    const activeVideo = getActiveVideo(videos);
    let autoplayDeniedUnmuted = false;
    await Promise.all(
      videos.map(async (video) => {
        const inView = scrollVideoInView.get(video) === true;
        if (!inView) {
          video.volume = 0;
          video.muted = true;
          video.setAttribute("muted", "");
          return;
        }
        const shouldHaveSound = !videosMuted && video === activeVideo;
        video.defaultMuted = !shouldHaveSound;
        video.volume = shouldHaveSound ? 1 : 0;
        video.muted = !shouldHaveSound;
        if (shouldHaveSound) video.removeAttribute("muted");
        else video.setAttribute("muted", "");
        try {
          await video.play();
        } catch {
          video.muted = true;
          video.volume = 0;
          video.setAttribute("muted", "");
          autoplayDeniedUnmuted = autoplayDeniedUnmuted || shouldHaveSound;
          await video.play().catch(() => {});
        }
      }),
    );
    if (autoplayDeniedUnmuted && !userTriggered && !window.__cgbGestureSoundScheduled) {
      window.__cgbGestureSoundScheduled = true;
      const unlockSoundPlayback = () => {
        applyVideoAudio(true);
      };
      document.addEventListener("pointerdown", unlockSoundPlayback, { capture: true, once: true });
      document.addEventListener("keydown", unlockSoundPlayback, { capture: true, once: true });
    }
    const button = document.getElementById("videoAudioToggle");
    if (!button) return;
    button.hidden = videos.length === 0;
    button.setAttribute("aria-pressed", String(!videosMuted));
    button.textContent = videosMuted ? (lang === "zh" ? "开启声音" : "Sound On") : (lang === "zh" ? "自动跟随声音" : "Auto Sound");
  }

  function renderAll() {
    applyAppearance();
    renderHero();
    renderBrandStory();
    renderCampaignMedia();
    renderProducts();
    renderCases();
    renderRouter();
    renderPrompt();
    renderGrammar();
    renderWorkflow();
    renderCTA();
    renderEditor();
    applySectionOrderAndVisibility();
    installInlineEditControls();
    setupMotion();
    setupScrollSectionVideos();
    setupVideoAudioControl();
    setupMediaPreview();
  }

  function setupMediaPreview() {
    let preview = document.getElementById("mediaPreview");
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "mediaPreview";
      preview.className = "media-preview";
      preview.innerHTML = `<div class="media-preview-frame"><img alt="" /></div>`;
      document.body.appendChild(preview);
    }
    const image = preview.querySelector("img");
    document.querySelectorAll("#products .product-media img, #cases .gallery-poster img, #grammar .grammar-thumb").forEach((node) => {
      node.onmouseenter = () => {
        image.src = node.currentSrc || node.src;
        image.alt = node.alt || "";
        preview.classList.add("show");
      };
      node.onmousemove = (event) => {
        const pad = 22;
        const x = Math.min(window.innerWidth - preview.offsetWidth - pad, event.clientX + pad);
        const y = Math.min(window.innerHeight - preview.offsetHeight - pad, event.clientY + pad);
        preview.style.left = `${Math.max(pad, x)}px`;
        preview.style.top = `${Math.max(pad, y)}px`;
      };
      node.onmouseleave = () => preview.classList.remove("show");
    });
  }

  document.getElementById("langToggle").addEventListener("click", () => {
    lang = "zh";
    renderAll();
  });

  document.addEventListener("keydown", (event) => {
    if (!isEditMode) return;
    const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
    if (!isUndo) return;
    event.preventDefault();
    undoLastChange();
  });

  renderAll();
})();

