const DATA_FILES = ['site', 'projects', 'workbench', 'categories', 'works'];
const PASSWORD = '666888';
const UPLOAD_FOLDER = 'assets/uploads';

let data = null;
let draft = null;
let selectedWorkId = null;
let adminOpen = false;
let adminAuthed = false;
let adminTab = 'site';
let projectRootHandle = null;
let pendingAssetTarget = null;
let adminPosition = { x: 32, y: 96 };
let isDraggingAdmin = false;
let dragOffset = { x: 0, y: 0 };
let selectedWorkbenchNodeId = 'prompt-system';
let adminScrollTop = 0;
let allMediaMuted = false;
let caseVideoMuted = false;
let draggedWorkIndex = null;
let undoSnapshot = null;

const root = document.getElementById('root');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safePath(path = '') {
  if (!path) return '';
  if (/^(https?:|mailto:|#)/.test(path)) return path;
  return path.startsWith('/') ? `.${path}` : path;
}

function tags(items = []) {
  return `<div class="tag-row">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
}

function splitList(value = '') {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function joinList(value = []) {
  return value.join(', ');
}

function joinLines(value = []) {
  return value.join('\n');
}

function ratioNumber(value = '4 / 5') {
  if (!value || value === 'auto') return 1;
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return 1;
  const [, width, height] = match.map(Number);
  return width && height ? width / height : 0.8;
}

function ratioStyle(value = '4 / 5') {
  const ratio = ratioNumber(value);
  const basis = Math.max(220, Math.round(ratio * 330));
  return `--ratio:${escapeHtml(value || '4 / 5')};--ratio-num:${ratio};--basis:${basis}px;--compact-basis:${Math.max(210, Math.round(basis * 0.84))}px;--grow:${Math.max(0.45, ratio)}`;
}

function workThumb(work, categories) {
  return `
    <button class="masonry-item" style="${ratioStyle(work.previewRatio || '4 / 5')}" data-auto-ratio="${work.previewRatio === 'auto' ? 'true' : 'false'}" data-action="select-work" data-work-id="${escapeHtml(work.id)}">
      ${mediaMarkup(work.coverImage, work.title, 'masonry-media')}
      <span class="category-id-badge">${escapeHtml(work.categoryId)}</span>
      <span class="masonry-overlay">
        <small>${escapeHtml(categories[work.categoryId]?.title || work.categoryId)}</small>
        <strong>${escapeHtml(work.title)}</strong>
        <em>${escapeHtml(work.tags.slice(0, 3).join(' / '))}</em>
        <b>查看案例</b>
      </span>
    </button>
  `;
}

function byId(list, id) {
  return list.find((item) => item.id === id);
}

function setByPath(object, path, value) {
  const parts = path.split('.');
  let target = object;
  while (parts.length > 1) {
    const part = parts.shift();
    if (target[part] == null) target[part] = {};
    target = target[part];
  }
  target[parts[0]] = value;
}

function getByPath(object, path) {
  return path.split('.').reduce((target, part) => target?.[part], object);
}

function mediaMarkup(src, alt = '', className = '') {
  if (!src) return `<div class="media-placeholder ${className}">等待选择素材</div>`;
  const autoplay = className.includes('hero-media') || className.includes('masonry-media') || className.includes('project-cover') || className.includes('about-bg') ? ' autoplay' : '';
  return src.match(/\.(mp4|mov|webm)$/i)
    ? `<video class="${className}" src="${escapeHtml(safePath(src))}" muted loop playsinline${autoplay} preload="metadata"></video>`
    : `<img class="${className}" src="${escapeHtml(safePath(src))}" alt="${escapeHtml(alt)}" loading="lazy">`;
}

async function loadAllData() {
  try {
    const entries = await Promise.all(DATA_FILES.map(async (name) => {
      const response = await fetch(`./data/${name}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`无法读取 ${name}`);
      return [name, await response.json()];
    }));
    return Object.fromEntries(entries);
  } catch (error) {
    if (window.__PORTFOLIO_DATA__) return structuredClone(window.__PORTFOLIO_DATA__);
    throw error;
  }
}

function visibleCategories(source = data) {
  return [...source.categories].filter((item) => item.isVisible).sort((a, b) => a.order - b.order);
}

function visibleWorks(source = data) {
  return [...source.works].filter((item) => item.isVisible).sort((a, b) => a.order - b.order);
}

function categoryMap(source = data) {
  return Object.fromEntries(visibleCategories(source).map((item) => [item.id, item]));
}

function navigation() {
  return `
    <header class="topbar">
      <a class="brand" href="#home">${escapeHtml(data.site.brand)}</a>
      <nav>${data.site.navigation.map((item) => `<a href="#${escapeHtml(item.target)}">${escapeHtml(item.label)}</a>`).join('')}</nav>
      <button class="icon-button" data-action="open-admin">编辑</button>
    </header>
  `;
}

function floatingSectionNav() {
  return '';
}
function heroSection() {
  const site = data.site;
  return `
    <section class="hero section-shell" id="home">
      <div class="bento hero-grid">
        <aside class="cell hero-rail">
          <span>始于 2026</span>
          <strong>AIGC 视觉作品集</strong>
          <a href="#projects">向下浏览</a>
        </aside>
        <div class="cell hero-stage">
          <div class="grid-lines"></div>
          <div class="hero-media-frame">
            ${mediaMarkup(site.heroMedia, site.heroTitle, 'hero-media')}
          </div>
          <div class="orb-panel">
            <div class="orb-ring"></div>
            <p class="eyebrow">个人创作系统</p>
            <h1>${escapeHtml(site.heroTitle)}</h1>
            <h2>${escapeHtml(site.heroSubtitle)}</h2>
            <p>${escapeHtml(site.heroStatement)}</p>
            <div class="hero-actions">
              <a class="button button-accent" href="#projects">网页项目</a>
              <a class="button button-ghost" href="#categories">作品分类</a>
            </div>
          </div>
        </div>
        <aside class="cell hero-meta">
          <div><p class="eyebrow">身份标签</p>${tags(site.identityTags)}</div>
          <div><p class="eyebrow">工具栈</p><ul class="stack-list">${site.toolStack.slice(0, 5).map((tool) => `<li>${escapeHtml(tool)}</li>`).join('')}</ul></div>
          <div class="light-card"><p>创作焦点</p><strong>空间叙事<br>生成式系统</strong></div>
        </aside>
      </div>
    </section>
  `;
}

function projectsSection() {
  const projects = [...data.projects].filter((item) => item.isVisible).sort((a, b) => a.order - b.order);
  return `
    <section class="section-shell" id="projects">
      <div class="section-heading">
        <div><p class="eyebrow">网页项目</p><h2>三个独立网页项目</h2></div>
        <p class="heading-note">这里链接到你已经放入本文件夹的三个项目页面，作为作品集的独立网页展示入口。</p>
      </div>
      <div class="project-grid">
        ${projects.map((project) => `
          <a class="project-card" href="${escapeHtml(safePath(project.url || '#'))}">
            <div class="project-media">${mediaMarkup(project.coverImage, project.title, 'project-cover')}</div>
            <div class="project-body">
              <p class="eyebrow">${escapeHtml(project.category)}</p>
              <h3>${escapeHtml(project.title)}</h3>
              <strong>${escapeHtml(project.subtitle)}</strong>
              <p>${escapeHtml(project.description)}</p>
              ${tags(project.tags)}
            </div>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

function workbenchSection() {
  const workbench = data.workbench;
  const branches = workbench.processMap?.branches || [];
  const selectedNode = branches.find((branch) => branch.id === selectedWorkbenchNodeId) || branches.find((branch) => branch.id === workbench.selectedNodeId) || branches[1] || workbench.processMap?.core;
  const detail = selectedNode?.detail || {};
  return `
    <section class="section-shell workbench" id="workbench">
      <div class="method-hero compact-method">
        <div>
          <p class="eyebrow">${escapeHtml(workbench.eyebrow || '方法系统')}</p>
          <h2>${escapeHtml(workbench.title)}</h2>
          <strong>${escapeHtml(workbench.subtitle)}</strong>
        </div>
        <p>${escapeHtml(workbench.coreStatement)}</p>
        <a class="button button-accent" href="#process-map">${escapeHtml(workbench.ctaLabel || '查看流程地图')}</a>
      </div>
      <div class="method-timeline timeline-row" aria-label="AI 工作流">
        ${(workbench.workflowSteps || []).map((step, index) => `
          <article class="timeline-card">
            <span>${escapeHtml(step.number || String(index + 1).padStart(2, '0'))}</span>
            <h4>${escapeHtml(step.title)}</h4>
            ${step.cnTitle ? `<h5>${escapeHtml(step.cnTitle)}</h5>` : ''}
            <p>${escapeHtml(step.content)}</p>
          </article>
        `).join('')}
      </div>
      <div class="process-layout compact-process" id="process-map">
        <div class="process-map sphere-map">
          <div class="process-orbit" aria-hidden="true">
            <span class="orbit-ring ring-1"></span>
            <span class="orbit-ring ring-2"></span>
            <span class="orbit-ring ring-3"></span>
            <span class="orbit-pulse"></span>
          </div>
          <button class="process-node core-node ${selectedNode?.id === 'core' ? 'selected' : ''}" data-action="select-process-node" data-node-id="core">
            ${escapeHtml(workbench.processMap?.core?.title || 'Project Core Brief')}
          </button>
          ${branches.map((branch, index) => `
            <button class="process-node branch-node node-${index + 1} ${selectedNode?.id === branch.id ? 'selected' : ''}" data-action="select-process-node" data-node-id="${escapeHtml(branch.id)}">
              <strong>${escapeHtml(branch.title)}</strong>
              <span>${(branch.children || []).map((child) => escapeHtml(child)).join(' / ')}</span>
            </button>
          `).join('')}
        </div>
        <aside class="detail-panel">
          <p class="eyebrow">当前节点</p>
          <h3>${escapeHtml(selectedNode?.title || 'Prompt System')}</h3>
          ${[
            ['目标', detail.goal],
            ['输入', detail.input],
            ['工具', detail.tool],
            ['提示词逻辑', detail.promptLogic],
            ['输出', detail.output],
            ['设计判断', detail.designDecision]
          ].map(([label, value]) => `<div class="detail-row"><span>${label}</span><p>${escapeHtml(value || '')}</p></div>`).join('')}
        </aside>
      </div>
    </section>
  `;
}
function masonry(works) {
  const categories = categoryMap();
  const fillerText = data.site.masonryFillerText || 'AIGC PORTFOLIO';
  return `
    <div class="masonry optimized-wall">
      ${works.map((work) => workThumb(work, categories)).join('')}
      <div class="masonry-filler" aria-hidden="true">${escapeHtml(fillerText)}</div>
    </div>
  `;
}

function featuredMasonry(works) {
  const categories = categoryMap();
  const rows = [];
  const rowCount = Math.max(1, Math.min(3, Math.ceil(works.length / 4)));
  works.forEach((work, index) => {
    const rowIndex = index % rowCount;
    if (!rows[rowIndex]) rows[rowIndex] = [];
    rows[rowIndex].push(work);
  });
  return `
    <div class="featured-masonry">
      ${rows.map((row, rowIndex) => {
        const duplicated = Array.from({ length: 6 }, () => row).flat();
        return `
          <div class="featured-row ${rowIndex % 2 === 0 ? 'move-left' : 'move-right'}">
            <div class="featured-track">
              ${duplicated.map((work) => workThumb(work, categories)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function worksSection() {
  return `
    <section class="section-shell section-flush" id="works">
      <div class="section-heading">
        <div><p class="eyebrow">精选作品</p><h2>作品展示</h2></div>
        <p class="heading-note">沿用初版最后的无缝作品墙逻辑，图片之间没有间距，悬浮时显示作品信息。</p>
      </div>
      ${featuredMasonry(visibleWorks().filter((work) => work.isFeatured))}
    </section>
  `;
}

function categorySections() {
  const categories = visibleCategories();
  return `
    <section class="category-sections" id="categories">
      <div class="category-jump">
        ${categories.map((category) => `<a href="#category-${escapeHtml(category.id)}">${escapeHtml(category.title)}</a>`).join('')}
      </div>
      ${categories.map((category) => {
        const works = visibleWorks().filter((work) => work.categoryId === category.id);
        if (!works.length) return '';
        return `
          <section class="section-shell section-flush category-block" id="category-${escapeHtml(category.id)}">
            <div class="section-heading">
              <div><p class="eyebrow">作品分类</p><h2>${escapeHtml(category.title)}</h2></div>
              <p class="heading-note">${escapeHtml(category.description)}</p>
            </div>
            ${masonry(works)}
          </section>
        `;
      }).join('')}
    </section>
  `;
}

function aboutSection() {
  const fallbackAbout = typeof data.site.about === 'string' ? data.site.about : '';
  const about = typeof data.site.about === 'object' && data.site.about
    ? data.site.about
    : {
      eyebrow: 'ABOUT CREATOR',
      title: '关于我',
      englishTitle: 'ABOUT ME',
      subtitle: 'AIGC VISUAL DESIGNER / ARCHITECTURAL THINKING',
      image: 'assets/about/about-hero.jpg',
      paragraphs: [fallbackAbout],
      focus: ['品牌视觉', '空间叙事', 'AIGC 工作流', '网页作品集', '视频故事板'],
      tools: data.site.toolStack || [],
      contact: (data.site.contacts || []).map((item) => item.label),
      statement: 'AI 负责扩展可能性，设计师负责判断可用性。'
    };
  const groups = [
    ['01 / FOCUS', about.focus || []],
    ['02 / TOOLS', about.tools || []],
    ['03 / CONTACT', about.contact || []]
  ];
  return `
    <section class="about-brand-section" id="about">
      <div class="about-visual">
        ${mediaMarkup(about.image, about.title || '关于我', 'about-bg')}
      </div>
      <div class="about-info">
        <div class="about-axis" aria-hidden="true"></div>
        <div class="about-kicker">
          <span>${escapeHtml(about.eyebrow || 'ABOUT CREATOR')}</span>
          <span>AIGC VISUAL DESIGNER</span>
          <span>ARCHITECTURAL THINKING</span>
        </div>
        <div class="about-title-block">
          <p>PROFILE / CURRENT DIRECTION</p>
          <h2>${escapeHtml(about.title || '关于我')}</h2>
          <strong>${escapeHtml(about.englishTitle || 'ABOUT ME')}</strong>
          <em>${escapeHtml(about.subtitle || '')}</em>
        </div>
        <div class="about-copy">
          ${(about.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </div>
        <blockquote>${escapeHtml(about.statement || '')}</blockquote>
        <div class="about-info-groups">
          ${groups.map(([label, items]) => `
            <div class="about-info-group">
              <h3>${escapeHtml(label)}</h3>
              <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </div>
          `).join('')}
        </div>
        <a class="about-pdf-link" href="${escapeHtml(safePath(data.site.pdfUrl))}">PDF Download</a>
      </div>
    </section>
  `;
}

function sectionContent(section) {
  if (section.type === 'image') return `<img class="case-image" src="${escapeHtml(safePath(section.image))}" alt="${escapeHtml(section.title)}">`;
  if (section.type === 'gallery') return `<div class="case-gallery">${(section.images || []).map((image) => `<img src="${escapeHtml(safePath(image))}" alt="${escapeHtml(section.title)}">`).join('')}</div>`;
  if (section.type === 'beforeAfter') return `<div class="before-after"><img src="${escapeHtml(safePath(section.beforeImage))}" alt="修改前"><img src="${escapeHtml(safePath(section.afterImage))}" alt="修改后"></div>`;
  if (section.type === 'video') return `<video src="${escapeHtml(safePath(section.image))}" controls></video>`;
  return `<p>${escapeHtml(section.content)}</p>`;
}

function caseLayer() {
  if (!selectedWorkId) return '';
  const work = visibleWorks().find((item) => item.id === selectedWorkId);
  if (!work) return '';
  const category = categoryMap()[work.categoryId];
  return `
    <div class="case-layer" role="dialog" aria-modal="true">
      <button class="case-close" data-action="close-case">关闭</button>
      <article class="case-page">
        <header class="case-header">
          <p class="eyebrow">${escapeHtml(category?.title || '案例')}</p>
          <h2>${escapeHtml(work.title)}</h2>
          <strong>${escapeHtml(work.subtitle)}</strong>
          <p>${escapeHtml(work.description)}</p>
          ${tags(work.tags)}
        </header>
        ${work.coverImage?.match(/\.(mp4|mov|webm)$/i)
          ? `<div class="case-video-wrap"><video class="case-cover" src="${escapeHtml(safePath(work.coverImage))}" controls autoplay ${allMediaMuted || caseVideoMuted ? 'muted' : ''} loop></video><div class="case-audio-tools"><button data-action="toggle-all-muted">${allMediaMuted ? '网页全部取消静音' : '网页全部静音'}</button><button data-action="toggle-case-muted">${caseVideoMuted ? '本视频取消静音' : '本视频静音'}</button></div></div>`
          : `<img class="case-cover" src="${escapeHtml(safePath(work.coverImage))}" alt="${escapeHtml(work.title)}">`}
        <div class="case-meta-grid">
          <div><p class="eyebrow">提示词逻辑</p><p>${escapeHtml(work.promptLogic)}</p></div>
          <div><p class="eyebrow">使用工具</p><p>${escapeHtml(work.tools.join(' / '))}</p></div>
          <div><p class="eyebrow">过程说明</p><p>${escapeHtml(work.processNotes)}</p></div>
        </div>
        ${(work.caseSections || []).map((section) => `<section class="case-section"><h3>${escapeHtml(section.title)}</h3>${sectionContent(section)}</section>`).join('')}
      </article>
    </div>
  `;
}

function input(name, label, value, multiline = false) {
  const safeValue = escapeHtml(value);
  return `
    <label class="field">
      <span>${label}</span>
      ${multiline ? `<textarea data-bind="${name}" rows="4">${safeValue}</textarea>` : `<input data-bind="${name}" value="${safeValue}">`}
    </label>
  `;
}

function listInput(path, label, value = []) {
  return input(path, `${label}（逗号分隔）`, joinList(value));
}

function linesInput(path, label, value = []) {
  return `
    <label class="field">
      <span>${label}</span>
      <textarea data-bind="${path}" data-value-type="lines" rows="5">${escapeHtml(joinLines(value))}</textarea>
    </label>
  `;
}

function numberInput(path, label, value = 0) {
  return `
    <label class="field">
      <span>${label}</span>
      <input type="number" data-bind="${path}" data-value-type="number" value="${Number(value) || 0}">
    </label>
  `;
}

function checkInput(path, label, value = false) {
  return `
    <label class="check-field">
      <input type="checkbox" data-bind="${path}" data-value-type="checkbox" ${value ? 'checked' : ''}>
      ${label}
    </label>
  `;
}

function selectInput(path, label, value, options) {
  return `
    <label class="field">
      <span>${label}</span>
      <select data-bind="${path}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(value) === String(option.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
      </select>
    </label>
  `;
}

function assetInput(path, label, value = '') {
  return `
    <div class="field asset-field">
      <span>${label}</span>
      <div class="asset-row">
        <input data-bind="${path}" value="${escapeHtml(value || '')}" placeholder="选择项目内图片或视频">
        <button type="button" data-action="pick-asset" data-asset-path="${escapeHtml(path)}">选择文件</button>
        <button type="button" data-action="upload-asset" data-asset-path="${escapeHtml(path)}">上传文件</button>
      </div>
    </div>
  `;
}

function adminSiteEditor() {
  const about = typeof draft.site.about === 'object' && draft.site.about
    ? draft.site.about
    : {
      eyebrow: 'ABOUT CREATOR',
      title: '关于我',
      englishTitle: 'ABOUT ME',
      subtitle: 'AIGC VISUAL DESIGNER / ARCHITECTURAL THINKING',
      image: 'assets/about/about-hero.jpg',
      paragraphs: [draft.site.about || ''],
      focus: ['品牌视觉', '空间叙事', 'AIGC 工作流', '网页作品集', '视频故事板'],
      tools: draft.site.toolStack || [],
      contact: (draft.site.contacts || []).map((item) => item.label),
      statement: 'AI 负责扩展可能性，设计师负责判断可用性。'
    };
  if (typeof draft.site.about !== 'object' || !draft.site.about) draft.site.about = about;
  return `
    <div class="admin-section" data-site-editor>
      ${input('site.heroTitle', '首页大标题', draft.site.heroTitle)}
      ${input('site.heroSubtitle', '首页副标题', draft.site.heroSubtitle)}
      ${input('site.heroStatement', '首页说明', draft.site.heroStatement, true)}
      ${assetInput('site.heroMedia', '首页中间图片或视频', draft.site.heroMedia || '')}
      ${input('site.masonryFillerText', '作品墙补位英文', draft.site.masonryFillerText || 'AIGC PORTFOLIO')}
      ${listInput('site.toolStack', '工具栈', draft.site.toolStack)}
      ${assetInput('site.pdfUrl', '作品集 PDF 路径', draft.site.pdfUrl)}
      <h3 class="admin-subtitle">About / 关于我</h3>
      ${input('site.about.eyebrow', '英文小标', about.eyebrow || '')}
      ${input('site.about.title', '中文标题', about.title || '')}
      ${input('site.about.englishTitle', '英文标题', about.englishTitle || '')}
      ${input('site.about.subtitle', '身份副标题', about.subtitle || '')}
      ${assetInput('site.about.image', '人物主视觉图片', about.image || '')}
      ${linesInput('site.about.paragraphs', '介绍段落（一行一段）', about.paragraphs || [])}
      ${linesInput('site.about.focus', 'FOCUS（一行一项）', about.focus || [])}
      ${linesInput('site.about.tools', 'TOOLS（一行一项）', about.tools || [])}
      ${linesInput('site.about.contact', 'CONTACT（一行一项）', about.contact || [])}
      ${input('site.about.statement', '强调语', about.statement || '', true)}
    </div>
  `;
}
function adminProjectsEditor() {
  return `
    <div class="admin-section">
      <button class="admin-action" data-action="add-item" data-list="projects">新增网页项目</button>
      ${draft.projects.map((project, index) => `
        <details class="editor-card" open>
          <summary>${escapeHtml(project.title || '未命名项目')}</summary>
          <div class="form-grid">
            ${input(`projects.${index}.title`, '项目标题', project.title)}
            ${input(`projects.${index}.subtitle`, '项目副标题', project.subtitle)}
            ${input(`projects.${index}.category`, '项目类型', project.category)}
            ${input(`projects.${index}.url`, '项目链接', project.url)}
            ${assetInput(`projects.${index}.coverImage`, '封面图片或视频', project.coverImage)}
            ${listInput(`projects.${index}.tags`, '标签', project.tags)}
            ${numberInput(`projects.${index}.order`, '排序', project.order)}
            ${checkInput(`projects.${index}.isVisible`, '公开显示', project.isVisible)}
          </div>
          ${input(`projects.${index}.description`, '项目说明', project.description, true)}
          <button class="danger" data-action="delete-item" data-list="projects" data-index="${index}">删除项目</button>
        </details>
      `).join('')}
    </div>
  `;
}

function adminWorkbenchEditor() {
  const branches = draft.workbench.processMap?.branches || [];
  return `
    <div class="admin-section">
      ${input('workbench.eyebrow', '眉标', draft.workbench.eyebrow || '')}
      ${input('workbench.title', '工作台标题', draft.workbench.title)}
      ${input('workbench.subtitle', '工作台副标题', draft.workbench.subtitle)}
      ${input('workbench.coreStatement', '核心说明', draft.workbench.coreStatement, true)}
      ${input('workbench.ctaLabel', '按钮文字', draft.workbench.ctaLabel || '')}
      <h3 class="admin-subtitle">横向流程步骤</h3>
      <button class="admin-action" data-action="add-item" data-list="workbench.workflowSteps">新增流程步骤</button>
      ${(draft.workbench.workflowSteps || []).map((step, index) => `
        <div class="editor-card">
          ${input(`workbench.workflowSteps.${index}.number`, '编号', step.number || String(index + 1).padStart(2, '0'))}
          ${input(`workbench.workflowSteps.${index}.title`, '英文标题', step.title)}
          ${input(`workbench.workflowSteps.${index}.cnTitle`, '中文标题', step.cnTitle || '')}
          ${input(`workbench.workflowSteps.${index}.content`, '一句话说明', step.content, true)}
          <button class="danger" data-action="delete-item" data-list="workbench.workflowSteps" data-index="${index}">删除</button>
        </div>
      `).join('')}
      <h3 class="admin-subtitle">中心节点</h3>
      ${input('workbench.processMap.core.title', '中心节点标题', draft.workbench.processMap?.core?.title || '')}
      ${input('workbench.processMap.core.detail.goal', '中心节点目标', draft.workbench.processMap?.core?.detail?.goal || '', true)}
      <h3 class="admin-subtitle">流程地图分支</h3>
      <button class="admin-action" data-action="add-item" data-list="workbench.processMap.branches">新增分支</button>
      ${branches.map((branch, index) => `
        <div class="editor-card">
          ${input(`workbench.processMap.branches.${index}.id`, '分支 ID', branch.id)}
          ${input(`workbench.processMap.branches.${index}.title`, '分支标题', branch.title)}
          ${listInput(`workbench.processMap.branches.${index}.children`, '子节点', branch.children || [])}
          ${input(`workbench.processMap.branches.${index}.detail.goal`, '目标', branch.detail?.goal || '', true)}
          ${input(`workbench.processMap.branches.${index}.detail.input`, '输入', branch.detail?.input || '', true)}
          ${input(`workbench.processMap.branches.${index}.detail.tool`, '工具', branch.detail?.tool || '', true)}
          ${input(`workbench.processMap.branches.${index}.detail.promptLogic`, '提示词逻辑', branch.detail?.promptLogic || '', true)}
          ${input(`workbench.processMap.branches.${index}.detail.output`, '输出', branch.detail?.output || '', true)}
          ${input(`workbench.processMap.branches.${index}.detail.designDecision`, '设计判断', branch.detail?.designDecision || '', true)}
          <button class="danger" data-action="delete-item" data-list="workbench.processMap.branches" data-index="${index}">删除分支</button>
        </div>
      `).join('')}
    </div>
  `;
}

function adminCategoriesEditor() {
  draft.works.sort((a, b) => (a.order || 0) - (b.order || 0));
  const categoryOptions = draft.categories.map((category) => ({ value: category.id, label: category.title }));
  const ratioOptions = [
    { value: 'auto', label: '原图比例' },
    { value: '1 / 1', label: '方图 1:1' },
    { value: '4 / 5', label: '竖图 4:5' },
    { value: '3 / 4', label: '竖图 3:4' },
    { value: '16 / 9', label: '横图 16:9' },
    { value: '3 / 2', label: '横图 3:2' }
  ];
  return `
    <div class="admin-section">
      <button class="admin-action" data-action="add-item" data-list="categories">新增分类</button>
      ${draft.categories.map((category, index) => {
        const works = draft.works
          .map((work, workIndex) => ({ work, workIndex }))
          .filter((item) => item.work.categoryId === category.id)
          .sort((a, b) => (a.work.order || 0) - (b.work.order || 0));
        return `
          <details class="editor-card category-editor-card" open>
            <summary>${escapeHtml(category.title || '未命名分类')}</summary>
            <div class="form-grid">
              ${input(`categories.${index}.id`, '分类 ID', category.id)}
              ${input(`categories.${index}.title`, '分类标题', category.title)}
              ${input(`categories.${index}.englishTitle`, '备用标题', category.englishTitle)}
              ${listInput(`categories.${index}.tags`, '标签', category.tags)}
              ${numberInput(`categories.${index}.order`, '排序', category.order)}
              ${checkInput(`categories.${index}.isVisible`, '公开显示', category.isVisible)}
            </div>
            ${input(`categories.${index}.description`, '分类说明', category.description, true)}
            <div class="category-work-tools">
              <h3 class="admin-subtitle">分类内作品</h3>
              <button class="admin-action" data-action="add-work-to-category" data-category-id="${escapeHtml(category.id)}">新增本分类作品</button>
            </div>
            <div class="nested-work-list">
              ${works.length ? works.map(({ work, workIndex }) => workEditorCard(work, workIndex, categoryOptions, ratioOptions)).join('') : '<p class="empty-note">这个分类下还没有作品。</p>'}
            </div>
            <button class="danger" data-action="delete-item" data-list="categories" data-index="${index}">删除分类</button>
          </details>
        `;
      }).join('')}
      <details class="editor-card all-work-pool">
        <summary>未归类案例（分类 ID 已失效的作品）</summary>
        <div class="nested-work-list">
          ${draft.works
            .map((work, workIndex) => ({ work, workIndex }))
            .filter(({ work }) => !draft.categories.some((category) => category.id === work.categoryId))
            .sort((a, b) => (a.work.order || 0) - (b.work.order || 0))
            .map(({ work, workIndex }) => workEditorCard(work, workIndex, categoryOptions, ratioOptions))
            .join('') || '<p class="empty-note">当前没有失效分类的作品。</p>'}
        </div>
      </details>
    </div>
  `;
}

function workEditorCard(work, index, categoryOptions, ratioOptions) {
  return `
    <details class="editor-card work-editor-card" draggable="true" data-work-editor-index="${index}">
      <summary><span class="drag-handle">拖拽排序</span>${escapeHtml(work.title || '未命名作品')}</summary>
      <div class="form-grid">
        ${input(`works.${index}.title`, '作品标题', work.title)}
        ${input(`works.${index}.subtitle`, '作品副标题', work.subtitle)}
        ${selectInput(`works.${index}.categoryId`, '所属分类', work.categoryId, categoryOptions)}
        ${selectInput(`works.${index}.previewRatio`, '缩略图预览比例', work.previewRatio || '4 / 5', ratioOptions)}
        ${numberInput(`works.${index}.order`, '排序', work.order)}
        ${checkInput(`works.${index}.isFeatured`, '加入精选', work.isFeatured)}
        ${checkInput(`works.${index}.isVisible`, '公开显示', work.isVisible)}
      </div>
      ${input(`works.${index}.description`, '作品简介', work.description, true)}
      ${assetInput(`works.${index}.coverImage`, '封面图片或视频', work.coverImage)}
      ${input(`works.${index}.images`, '图片组路径（逗号分隔）', joinList(work.images || []), true)}
      ${listInput(`works.${index}.tags`, '标签', work.tags)}
      ${listInput(`works.${index}.tools`, '工具', work.tools)}
      ${input(`works.${index}.promptLogic`, '创作思路 / 提示词逻辑', work.promptLogic, true)}
      ${input(`works.${index}.processNotes`, '设计理念 / 过程说明', work.processNotes, true)}
      <div class="case-section-tools">
        <h3 class="admin-subtitle">案例详情段落</h3>
        <button class="admin-action" data-action="add-section" data-work-index="${index}">新增段落</button>
      </div>
      ${(work.caseSections || []).map((section, sectionIndex) => sectionEditor(work, index, section, sectionIndex)).join('')}
      <button class="danger" data-action="delete-item" data-list="works" data-index="${index}">删除作品</button>
    </details>
  `;
}
function sectionEditor(work, workIndex, section, sectionIndex) {
  return `
    <div class="section-editor">
      <div class="form-grid">
        ${selectInput(`works.${workIndex}.caseSections.${sectionIndex}.type`, '段落类型', section.type, [
          { value: 'text', label: '文字' },
          { value: 'image', label: '图片' },
          { value: 'gallery', label: '图库' },
          { value: 'beforeAfter', label: '前后对比' },
          { value: 'prompt', label: '提示词' },
          { value: 'video', label: '视频' }
        ])}
        ${input(`works.${workIndex}.caseSections.${sectionIndex}.title`, '段落标题', section.title)}
      </div>
      ${input(`works.${workIndex}.caseSections.${sectionIndex}.content`, '正文内容', section.content || '', true)}
      ${assetInput(`works.${workIndex}.caseSections.${sectionIndex}.image`, '图片或视频路径', section.image || '')}
      ${input(`works.${workIndex}.caseSections.${sectionIndex}.images`, '图库路径（逗号分隔）', joinList(section.images || []), true)}
      ${assetInput(`works.${workIndex}.caseSections.${sectionIndex}.beforeImage`, '对比前图片', section.beforeImage || '')}
      ${assetInput(`works.${workIndex}.caseSections.${sectionIndex}.afterImage`, '对比后图片', section.afterImage || '')}
      <button class="danger" data-action="delete-section" data-work-index="${workIndex}" data-section-index="${sectionIndex}">删除段落</button>
    </div>
  `;
}

function adminWorksEditor() {
  draft.works.sort((a, b) => (a.order || 0) - (b.order || 0));
  const categoryOptions = draft.categories.map((category) => ({ value: category.id, label: category.title }));
  const ratioOptions = [
    { value: 'auto', label: '原图比例' },
    { value: '1 / 1', label: '方图 1:1' },
    { value: '4 / 5', label: '竖图 4:5' },
    { value: '3 / 4', label: '竖图 3:4' },
    { value: '16 / 9', label: '横图 16:9' },
    { value: '3 / 2', label: '横图 3:2' }
  ];
  return `
    <div class="admin-section">
      <button class="admin-action" data-action="add-item" data-list="works">新增作品</button>
      ${draft.works.map((work, index) => workEditorCard(work, index, categoryOptions, ratioOptions)).join('')}
    </div>
  `;
}
function adminPanel() {
  if (!adminOpen) return '';
  if (!adminAuthed) {
    return `
      <div class="admin-layer">
        <div class="admin-auth">
          <button class="case-close" data-action="close-admin">关闭</button>
          <p class="eyebrow">编辑入口</p>
          <h2>请输入密码</h2>
          <p>这是本地网页编辑入口保护，不是真正的安全登录。</p>
          <input type="password" data-admin-password placeholder="请输入密码" autocomplete="off">
          <p class="admin-message" data-auth-message hidden></p>
          <button class="button button-accent" data-action="auth-admin">进入编辑</button>
        </div>
      </div>
    `;
  }
  const tabs = [
    ['site', '基础'],
    ['projects', '网页项目'],
    ['workbench', '工作台'],
    ['categories', '分类与作品'],
  ];
  const body = adminTab === 'site'
    ? adminSiteEditor()
    : adminTab === 'projects'
      ? adminProjectsEditor()
      : adminTab === 'workbench'
        ? adminWorkbenchEditor()
        : adminCategoriesEditor();
  return `
    <div class="admin-layer admin-layer-floating">
      <aside class="admin-drawer" style="left:${adminPosition.x}px; top:${adminPosition.y}px;">
        <div class="admin-head admin-drag-handle">
          <div><p class="eyebrow">本地网页编辑</p><h2>内容面板</h2></div>
          <button data-action="close-admin">关闭</button>
        </div>
        <p class="offline-note">${projectRootHandle ? '已连接项目文件夹，可以写回 JSON 和上传素材。' : '请先选择当前作品集项目文件夹；网页不会把内容保存到浏览器。'}</p>
        <div class="admin-footer">
          <button class="button button-ghost" data-action="choose-folder">选择项目文件夹</button>
          <button class="button button-ghost" data-action="undo-admin" ${undoSnapshot ? '' : 'disabled'}>撤回一步</button>
          <button class="button button-ghost" data-action="preview-admin">预览修改</button>
          <button class="button button-accent" data-action="save-admin">保存到项目文件</button>
        </div>
        <div class="tab-row">${tabs.map(([id, label]) => `<button class="${adminTab === id ? 'active' : ''}" data-action="admin-tab" data-tab="${id}">${label}</button>`).join('')}</div>
        <div class="admin-scroll">
          ${body}
        </div>
        <p class="admin-message" data-save-message hidden></p>
        <input class="hidden-file-input" type="file" data-hidden-upload accept="image/*,video/*,.pdf">
      </aside>
    </div>
  `;
}

function render() {
  const previousAdminScrollTop = adminScrollTop;
  root.innerHTML = `
    ${navigation()}
    ${floatingSectionNav()}
    <main>
      ${heroSection()}
      ${projectsSection()}
      ${workbenchSection()}
      ${worksSection()}
      ${categorySections()}
      ${aboutSection()}
    </main>
    <footer><span>© 2026 AIGC 作品集</span><span>静态展示 + 本地网页编辑</span></footer>
    ${caseLayer()}
    ${adminPanel()}
  `;
  updateFloatingNav();
  requestAnimationFrame(updateMasonryLayout);
  const adminScroll = document.querySelector('.admin-scroll');
  if (adminScroll) adminScroll.scrollTop = previousAdminScrollTop;
}

function captureAdminScroll() {
  adminScrollTop = document.querySelector('.admin-scroll')?.scrollTop || adminScrollTop;
}

function syncDraftFromEditors() {
  if (!draft) return true;
  document.querySelectorAll('[data-bind]').forEach((field) => {
    const path = field.dataset.bind;
    const current = getByPath(draft, path);
    let value = field.value;
    if (field.dataset.valueType === 'checkbox') value = field.checked;
    else if (field.dataset.valueType === 'number') value = Number(field.value) || 0;
    else if (field.dataset.valueType === 'lines') value = field.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    else if (Array.isArray(current)) value = splitList(field.value);
    setByPath(draft, path, value);
  });
  return true;
}

function rememberUndoState() {
  if (!draft) return;
  undoSnapshot = structuredClone(draft);
}

function undoAdminStep() {
  if (!undoSnapshot) return false;
  draft = structuredClone(undoSnapshot);
  data = structuredClone(draft);
  undoSnapshot = null;
  return true;
}

async function getDirectoryHandleByPath(rootHandle, folderPath, create = false) {
  let handle = rootHandle;
  for (const part of folderPath.split('/').filter(Boolean)) {
    handle = await handle.getDirectoryHandle(part, { create });
  }
  return handle;
}

async function writeTextFile(rootHandle, filePath, content) {
  const parts = filePath.split('/').filter(Boolean);
  const fileName = parts.pop();
  const dirHandle = await getDirectoryHandleByPath(rootHandle, parts.join('/'), true);
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

function bundleText(payload) {
  return `window.__PORTFOLIO_DATA__ = ${JSON.stringify(payload, null, 2)};\n`;
}

async function saveDraftToFiles(messageNode) {
  if (!syncDraftFromEditors()) {
    messageNode.hidden = false;
    messageNode.textContent = '有 JSON 格式错误，请先修正红框内容。';
    return;
  }
  if (!window.showDirectoryPicker) {
    messageNode.hidden = false;
    messageNode.textContent = '当前浏览器不支持网页直接写入本地文件。请使用新版 Chrome 或 Edge。';
    return;
  }
  if (!projectRootHandle) projectRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await Promise.all(DATA_FILES.map((name) => writeTextFile(projectRootHandle, `data/${name}.json`, `${JSON.stringify(draft[name], null, 2)}\n`)));
  await writeTextFile(projectRootHandle, 'data/bundle.js', bundleText(draft));
  data = structuredClone(draft);
  messageNode.hidden = false;
  messageNode.textContent = '已写回 data/*.json 和 data/bundle.js。';
}

function uniqueFileName(name) {
  const safe = name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
  return `${Date.now()}-${safe}`;
}

async function copyFileToAssets(file) {
  if (!window.showDirectoryPicker) throw new Error('当前浏览器不支持直接写入本地文件。');
  if (!projectRootHandle) projectRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const dirHandle = await getDirectoryHandleByPath(projectRootHandle, UPLOAD_FOLDER, true);
  const fileName = uniqueFileName(file.name);
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return `${UPLOAD_FOLDER}/${fileName}`;
}

async function findHandlePath(dirHandle, targetHandle, base = '') {
  for await (const [name, handle] of dirHandle.entries()) {
    if (['node_modules', '.git', 'dist'].includes(name)) continue;
    const nextPath = base ? `${base}/${name}` : name;
    if (await handle.isSameEntry(targetHandle)) return nextPath;
    if (handle.kind === 'directory') {
      const found = await findHandlePath(handle, targetHandle, nextPath);
      if (found) return found;
    }
  }
  return '';
}

async function pickExistingAsset() {
  if (!window.showOpenFilePicker || !window.showDirectoryPicker) {
    throw new Error('当前浏览器不支持从网页选择项目内文件。请使用新版 Chrome 或 Edge。');
  }
  if (!projectRootHandle) projectRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const [fileHandle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: '图片、视频或 PDF',
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
          'video/*': ['.mp4', '.webm', '.mov'],
          'application/pdf': ['.pdf']
        }
      }
    ]
  });
  const relativePath = await findHandlePath(projectRootHandle, fileHandle);
  if (!relativePath) throw new Error('请选择 AIGC portfolio 文件夹内部的文件。');
  return relativePath;
}

function setAssetPath(path) {
  if (!pendingAssetTarget) return;
  captureAdminScroll();
  syncDraftFromEditors();
  rememberUndoState();
  setByPath(draft, pendingAssetTarget, path);
  data = structuredClone(draft);
  render();
}

function blankForList(listPath) {
  const factories = {
    projects: () => ({
      id: `project-${Date.now()}`,
      title: '新网页项目',
      subtitle: '项目副标题',
      category: '网页项目',
      description: '项目说明',
      coverImage: '',
      url: '',
      tags: ['AIGC'],
      order: draft.projects.length + 1,
      isVisible: true
    }),
    categories: () => ({
      id: `category-${Date.now()}`,
      title: '新分类',
      englishTitle: '新分类',
      description: '分类说明',
      tags: ['AIGC'],
      order: draft.categories.length + 1,
      isVisible: true
    }),
    works: () => ({
      id: `work-${Date.now()}`,
      categoryId: draft.categories[0]?.id || 'commercial',
      title: '新作品',
      subtitle: '作品副标题',
      description: '作品简介',
      coverImage: '',
      images: [],
      tags: ['AIGC'],
      tools: ['ChatGPT'],
      promptLogic: '创作思路',
      processNotes: '设计理念',
      caseSections: [],
      previewRatio: '4 / 5',
      order: draft.works.length + 1,
      isFeatured: true,
      isVisible: true
    }),
    'workbench.overviewCards': () => ({ title: '新卡片', content: '内容说明' }),
    'workbench.workflowSteps': () => ({ number: String((draft.workbench.workflowSteps || []).length + 1).padStart(2, '0'), title: 'New Step', cnTitle: '新步骤', content: '步骤说明' }),
    'workbench.skillCards': () => ({ title: '新能力', content: '能力说明' }),
    'workbench.processMap.branches': () => ({
      id: `branch-${Date.now()}`,
      title: '新分支',
      children: ['子节点一', '子节点二'],
      detail: {
        goal: '目标说明',
        input: '输入内容',
        tool: '使用工具',
        promptLogic: '提示词逻辑',
        output: '输出结果',
        designDecision: '设计判断'
      }
    })
  };
  return factories[listPath]?.() || {};
}

function addItem(listPath) {
  const list = getByPath(draft, listPath);
  if (Array.isArray(list)) list.push(blankForList(listPath));
}

function addWorkToCategory(categoryId) {
  const work = blankForList('works');
  work.categoryId = categoryId;
  draft.works.push(work);
}

function deleteItem(listPath, index) {
  const list = getByPath(draft, listPath);
  if (Array.isArray(list)) list.splice(index, 1);
}

function addSection(workIndex) {
  const work = draft.works[workIndex];
  if (!work.caseSections) work.caseSections = [];
  work.caseSections.push({
    id: `section-${Date.now()}`,
    type: 'text',
    title: '新段落',
    content: '这里填写创作思路、设计理念或过程说明。',
    image: '',
    images: []
  });
}

function deleteSection(workIndex, sectionIndex) {
  draft.works[workIndex]?.caseSections?.splice(sectionIndex, 1);
}

function normalizeWorkOrder() {
  draft.works.forEach((work, index) => {
    work.order = index + 1;
  });
}

function moveWork(fromIndex, toIndex) {
  if (fromIndex == null || toIndex == null || fromIndex === toIndex) return;
  const [item] = draft.works.splice(fromIndex, 1);
  draft.works.splice(toIndex, 0, item);
  normalizeWorkOrder();
}

function updateFloatingNav() {
  const links = [...document.querySelectorAll('[data-float-for]')];
  if (!links.length) return;
  const current = links.find((link) => {
    const section = document.getElementById(link.dataset.floatFor);
    if (!section) return false;
    const rect = section.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.45 && rect.bottom > window.innerHeight * 0.25;
  });
  links.forEach((link) => link.classList.toggle('active', link === current));
}

function updateMasonryLayout() {
  document.querySelectorAll('.masonry').forEach((wall) => {
    const filler = wall.querySelector('.masonry-filler');
    const items = [...wall.querySelectorAll('.masonry-item')];
    items.forEach((item) => {
      item.style.removeProperty('flex');
      item.style.removeProperty('width');
      item.style.removeProperty('height');
    });

    if (!wall.closest('.featured-masonry') && items.length) {
      const gap = Number.parseFloat(getComputedStyle(wall).columnGap) || 0;
      const targetHeight = window.innerWidth <= 560 ? 280 : 330;
      wall.style.setProperty('--masonry-row-height', `${targetHeight}px`);
      const rows = [];
      let row = [];
      let rowWidth = 0;
      items.forEach((item) => {
        const ratio = Number.parseFloat(getComputedStyle(item).getPropertyValue('--ratio-num')) || 0.8;
        const width = Math.max(180, ratio * targetHeight);
        const nextWidth = rowWidth + width + (row.length ? gap : 0);
        if (row.length && nextWidth > wall.clientWidth * 0.96) {
          rows.push(row);
          row = [];
          rowWidth = 0;
        }
        row.push({ item, ratio, width });
        rowWidth += width + (row.length > 1 ? gap : 0);
      });
      if (row.length) rows.push(row);

      rows.forEach((currentRow, rowIndex) => {
        const isLastRow = rowIndex === rows.length - 1;
        const ratioSum = currentRow.reduce((sum, entry) => sum + entry.ratio, 0);
        const availableWidth = Math.max(1, wall.clientWidth - gap * Math.max(0, currentRow.length - 1));
        const height = isLastRow ? targetHeight : availableWidth / ratioSum;
        currentRow.forEach((entry) => {
          const itemWidth = height * entry.ratio;
          entry.item.style.flex = `0 0 ${itemWidth}px`;
          entry.item.style.width = `${itemWidth}px`;
          entry.item.style.height = `${height}px`;
        });
      });
    }

    if (filler && items.length) {
      const lastItemTop = items[items.length - 1].offsetTop;
      filler.classList.toggle('is-standalone', filler.offsetTop > lastItemTop);
    }
  });

}

function clampAdminPosition() {
  adminPosition.x = Math.max(8, Math.min(adminPosition.x, window.innerWidth - 280));
  adminPosition.y = Math.max(76, Math.min(adminPosition.y, window.innerHeight - 120));
}

root.addEventListener('click', async (event) => {
  if (event.target.classList?.contains('case-layer')) {
    selectedWorkId = null;
    render();
    return;
  }

  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'open-admin') {
    adminOpen = true;
    adminAuthed = false;
    draft = structuredClone(data);
    undoSnapshot = null;
    render();
  }
  if (action === 'close-admin') {
    adminOpen = false;
    adminAuthed = false;
    render();
  }
  if (action === 'auth-admin') {
    const password = document.querySelector('[data-admin-password]')?.value;
    const message = document.querySelector('[data-auth-message]');
    if (password === PASSWORD) {
      adminAuthed = true;
      render();
    } else if (message) {
      message.hidden = false;
      message.textContent = '密码不正确。';
    }
  }
  if (action === 'choose-folder') {
    const message = document.querySelector('[data-save-message]');
    try {
      projectRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      message.hidden = false;
      message.textContent = '已选择项目文件夹。';
      render();
    } catch {
      message.hidden = false;
      message.textContent = '未选择文件夹。';
    }
  }
  if (action === 'pick-asset') {
    pendingAssetTarget = target.dataset.assetPath;
    const message = document.querySelector('[data-save-message]');
    try {
      const path = await pickExistingAsset();
      setAssetPath(path);
    } catch (error) {
      if (message) {
        message.hidden = false;
        message.textContent = `选择失败：${error.message}`;
      }
    }
  }
  if (action === 'upload-asset') {
    pendingAssetTarget = target.dataset.assetPath;
    document.querySelector('[data-hidden-upload]')?.click();
  }
  if (action === 'add-item') {
    captureAdminScroll();
    syncDraftFromEditors();
    rememberUndoState();
    addItem(target.dataset.list);
    render();
  }
  if (action === 'add-work-to-category') {
    captureAdminScroll();
    syncDraftFromEditors();
    rememberUndoState();
    addWorkToCategory(target.dataset.categoryId);
    render();
  }
  if (action === 'delete-item') {
    captureAdminScroll();
    syncDraftFromEditors();
    rememberUndoState();
    deleteItem(target.dataset.list, Number(target.dataset.index));
    render();
  }
  if (action === 'add-section') {
    captureAdminScroll();
    syncDraftFromEditors();
    rememberUndoState();
    addSection(Number(target.dataset.workIndex));
    render();
  }
  if (action === 'delete-section') {
    captureAdminScroll();
    syncDraftFromEditors();
    rememberUndoState();
    deleteSection(Number(target.dataset.workIndex), Number(target.dataset.sectionIndex));
    render();
  }
  if (action === 'select-process-node') {
    selectedWorkbenchNodeId = target.dataset.nodeId;
    render();
  }
  if (action === 'admin-tab') {
    adminScrollTop = 0;
    syncDraftFromEditors();
    adminTab = target.dataset.tab;
    render();
  }
  if (action === 'preview-admin') {
    captureAdminScroll();
    if (syncDraftFromEditors()) {
      data = structuredClone(draft);
      render();
    }
  }
  if (action === 'undo-admin') {
    captureAdminScroll();
    if (undoAdminStep()) render();
  }
  if (action === 'save-admin') {
    const message = document.querySelector('[data-save-message]');
    try {
      await saveDraftToFiles(message);
    } catch (error) {
      message.hidden = false;
      message.textContent = `保存失败：${error.message}`;
    }
  }
  if (action === 'select-work') {
    selectedWorkId = target.dataset.workId;
    caseVideoMuted = false;
    render();
  }
  if (action === 'close-case') {
    selectedWorkId = null;
    render();
  }
  if (action === 'toggle-all-muted') {
    allMediaMuted = !allMediaMuted;
    document.querySelectorAll('video').forEach((video) => {
      video.muted = allMediaMuted || (video.closest('.case-video-wrap') && caseVideoMuted);
    });
    render();
  }
  if (action === 'toggle-case-muted') {
    caseVideoMuted = !caseVideoMuted;
    const video = document.querySelector('.case-video-wrap video');
    if (video) video.muted = allMediaMuted || caseVideoMuted;
    render();
  }
});

root.addEventListener('change', async (event) => {
  if (event.target.matches('[data-hidden-upload]')) {
    const file = event.target.files?.[0];
    const message = document.querySelector('[data-save-message]');
    if (!file || !message) return;
    try {
      syncDraftFromEditors();
      rememberUndoState();
      message.hidden = false;
      message.textContent = '正在复制文件...';
      const path = await copyFileToAssets(file);
      setAssetPath(path);
      const nextMessage = document.querySelector('[data-save-message]');
      if (nextMessage) {
        nextMessage.hidden = false;
        nextMessage.textContent = `已上传并写入相对路径：${path}`;
      }
    } catch (error) {
      message.hidden = false;
      message.textContent = `上传失败：${error.message}`;
    }
  }
});

root.addEventListener('dragstart', (event) => {
  const card = event.target.closest('[data-work-editor-index]');
  if (!card) return;
  captureAdminScroll();
  syncDraftFromEditors();
  rememberUndoState();
  draggedWorkIndex = Number(card.dataset.workEditorIndex);
  card.classList.add('dragging');
  event.dataTransfer?.setData('text/plain', String(draggedWorkIndex));
  event.dataTransfer.effectAllowed = 'move';
});

root.addEventListener('dragover', (event) => {
  if (draggedWorkIndex == null) return;
  const card = event.target.closest('[data-work-editor-index]');
  if (!card) return;
  event.preventDefault();
  card.classList.add('drag-over');
});

root.addEventListener('dragleave', (event) => {
  event.target.closest('[data-work-editor-index]')?.classList.remove('drag-over');
});

root.addEventListener('drop', (event) => {
  const card = event.target.closest('[data-work-editor-index]');
  if (!card || draggedWorkIndex == null) return;
  event.preventDefault();
  const targetIndex = Number(card.dataset.workEditorIndex);
  moveWork(draggedWorkIndex, targetIndex);
  data = structuredClone(draft);
  draggedWorkIndex = null;
  render();
});

root.addEventListener('dragend', () => {
  draggedWorkIndex = null;
  document.querySelectorAll('.dragging, .drag-over').forEach((item) => item.classList.remove('dragging', 'drag-over'));
});

function applyAutoRatio(media) {
  const item = media.closest('[data-auto-ratio="true"]');
  if (!item) return;
  const width = media.videoWidth || media.naturalWidth;
  const height = media.videoHeight || media.naturalHeight;
  if (width && height) {
    item.style.setProperty('--ratio', `${width} / ${height}`);
    item.style.setProperty('--ratio-num', width / height);
    item.style.setProperty('--basis', `${Math.max(220, Math.round((width / height) * 330))}px`);
    item.style.setProperty('--compact-basis', `${Math.max(210, Math.round((width / height) * 277))}px`);
    item.style.setProperty('--grow', Math.max(0.45, width / height));
    requestAnimationFrame(updateMasonryLayout);
  }
}

root.addEventListener('load', (event) => {
  if (event.target.matches?.('.masonry-media')) applyAutoRatio(event.target);
}, true);

root.addEventListener('loadedmetadata', (event) => {
  if (event.target.matches?.('.masonry-media')) applyAutoRatio(event.target);
}, true);

root.addEventListener('pointerdown', (event) => {
  const handle = event.target.closest('.admin-drag-handle');
  if (!handle || event.target.closest('button, input, textarea, select, a, summary')) return;
  const drawer = event.target.closest('.admin-drawer');
  if (!drawer) return;
  isDraggingAdmin = true;
  const rect = drawer.getBoundingClientRect();
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  drawer.setPointerCapture?.(event.pointerId);
});

document.addEventListener('pointermove', (event) => {
  if (!isDraggingAdmin) return;
  adminPosition = { x: event.clientX - dragOffset.x, y: event.clientY - dragOffset.y };
  clampAdminPosition();
  const drawer = document.querySelector('.admin-drawer');
  if (drawer) {
    drawer.style.left = `${adminPosition.x}px`;
    drawer.style.top = `${adminPosition.y}px`;
  }
});

document.addEventListener('pointerup', () => {
  isDraggingAdmin = false;
});

window.addEventListener('scroll', updateFloatingNav, { passive: true });
window.addEventListener('resize', () => {
  clampAdminPosition();
  updateFloatingNav();
  updateMasonryLayout();
});

root.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && selectedWorkId) {
    selectedWorkId = null;
    render();
  }
  if (event.key === 'Enter' && event.target.matches('[data-admin-password]')) {
    document.querySelector('[data-action="auth-admin"]')?.click();
  }
});

root.addEventListener('mouseover', (event) => {
  const item = event.target.closest('.masonry-item, .project-card');
  const video = item?.querySelector('video');
  if (video) video.play().catch(() => {});
});

root.addEventListener('mouseout', (event) => {
  const item = event.target.closest('.masonry-item, .project-card');
  if (item?.classList.contains('masonry-item')) return;
  const video = item?.querySelector('video');
  if (video) {
    video.pause();
    video.currentTime = 0;
  }
});

root.innerHTML = '<main class="boot-screen">正在读取本地作品数据...</main>';
loadAllData()
  .then((loaded) => {
    data = loaded;
    draft = structuredClone(data);
    render();
  })
  .catch(() => {
    root.innerHTML = '<main class="boot-screen">数据读取失败，请检查 data 目录中的 JSON 文件。</main>';
  });


