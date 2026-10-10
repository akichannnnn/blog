/* 「生活」页：访客打开时实时从 Telegram 频道（经 Worker 代理）读取并展示，支持搜索与无限加载 */
const root = document.getElementById('life');
const api = root.dataset.api;
const list = document.getElementById('life-list');
const status = document.getElementById('life-status');
const form = document.getElementById('life-form');
const input = document.getElementById('life-q');
const more = document.getElementById('life-more');
const lightbox = document.getElementById('lightbox');

const fmtDate = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

let query = '';
let next = null;
let loading = false;
let controller = null;
const seen = new Set();

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c != null));
  return node;
};

/* ---------- 媒体 ---------- */
function renderMedia(items, link) {
  if (!items.length) return null;
  const photos = items.filter((m) => m.type === 'photo');
  const wrap = el('div', { className: 'tg-media' });

  if (photos.length) {
    const grid = el('div', { className: `tg-photos n${Math.min(photos.length, 4)}` });
    for (const p of photos) {
      const img = el('img', { src: p.src, alt: '频道图片', loading: 'lazy', decoding: 'async' });
      if (p.ratio && photos.length === 1) img.style.aspectRatio = String(p.ratio);
      img.addEventListener('click', () => {
        const big = lightbox.querySelector('img');
        big.src = p.src;
        big.alt = img.alt;
        lightbox.showModal();
      });
      grid.append(img);
    }
    wrap.append(grid);
  }

  for (const m of items) {
    if (m.type === 'video') {
      wrap.append(el('video', { className: 'tg-video', src: m.src, poster: m.poster || '', controls: true, preload: 'none', playsInline: true }));
    } else if (m.type === 'gif') {
      const v = el('video', { className: 'tg-video', src: m.src, poster: m.poster || '', autoplay: true, loop: true, muted: true, playsInline: true, controls: false });
      v.muted = true;
      v.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
      wrap.append(v);
    } else if (m.type === 'roundvideo') {
      wrap.append(el('video', { className: 'tg-round', src: m.src, poster: m.poster || '', controls: true, preload: 'none', playsInline: true }));
    } else if (m.type === 'audio') {
      wrap.append(el('audio', { className: 'tg-audio', src: m.src, controls: true, preload: 'none' }));
    } else if (m.type === 'sticker') {
      wrap.append(el('img', { className: 'tg-sticker', src: m.src, alt: '贴纸', loading: 'lazy' }));
    } else if (m.type === 'videosticker') {
      const v = el('video', { className: 'tg-sticker', src: m.src, autoplay: true, loop: true, muted: true, playsInline: true });
      v.muted = true;
      wrap.append(v);
    } else if (m.type === 'document') {
      wrap.append(el('a', { className: 'tg-doc', href: link, target: '_blank', rel: 'noopener noreferrer' },
        el('strong', { textContent: m.title || '文件' }), m.extra ? el('small', { textContent: m.extra }) : null));
    } else if (m.type === 'unsupported') {
      wrap.append(el('a', { className: 'tg-doc', href: link, target: '_blank', rel: 'noopener noreferrer', textContent: '这个媒体网页端无法预览，在 Telegram 中查看 →' }));
    }
  }
  return wrap;
}

function renderPreview(p) {
  if (!p) return null;
  const a = el('a', { className: 'tg-preview', href: p.url, target: '_blank', rel: 'noopener noreferrer' });
  if (p.image) a.append(el('img', { src: p.image, alt: '', loading: 'lazy' }));
  a.append(el('span', {},
    p.site ? el('small', { textContent: p.site }) : null,
    p.title ? el('strong', { textContent: p.title }) : null,
    p.description ? el('em', { textContent: p.description }) : null));
  return a;
}

function renderMessage(m) {
  const body = el('div', { className: 'tg-text' });
  body.innerHTML = m.html; // Worker 已按白名单清洗
  body.querySelectorAll('.spoiler').forEach((s) => s.addEventListener('click', () => s.classList.add('shown'), { once: true }));

  const time = el('a', { href: m.link, target: '_blank', rel: 'noopener noreferrer' },
    el('time', { dateTime: m.date, textContent: fmtDate.format(new Date(m.date)) }));
  const meta = el('div', { className: 'tg-meta' }, time,
    m.edited ? el('span', { textContent: '已编辑' }) : null,
    m.views ? el('span', { textContent: `${m.views} 次查看` }) : null);

  return el('article', { className: 'tg-msg card', id: `p${m.id}` },
    el('div', { className: 'card-body' },
      m.forwardedFrom ? el('p', { className: 'tg-fwd', textContent: `转发自 ${m.forwardedFrom}` }) : null,
      m.reply ? el('blockquote', { className: 'tg-reply' }, el('strong', { textContent: m.reply.author || '' }), ` ${m.reply.text || ''}`) : null,
      m.html ? body : null,
      renderMedia(m.media, m.link),
      renderPreview(m.linkPreview),
      meta));
}

/* ---------- 加载 ---------- */
async function load(reset) {
  if (loading && !reset) return;
  controller?.abort();
  controller = new AbortController();
  const mine = controller;
  loading = true;

  if (reset) {
    list.replaceChildren();
    seen.clear();
    next = null;
    more.hidden = true;
  }
  status.textContent = reset ? '加载中…' : '';
  more.disabled = true;

  const url = new URL(api);
  if (query) url.searchParams.set('q', query);
  if (!reset && next) url.searchParams.set('before', next);

  try {
    const res = await fetch(url, { signal: mine.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = await res.json();
    const frag = document.createDocumentFragment();
    for (const m of page.messages) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      frag.append(renderMessage(m));
    }
    list.append(frag);
    next = page.next;
    status.textContent = seen.size ? '' : (query ? `没有找到「${query}」相关的内容` : '频道里还没有内容');
    more.hidden = !next;
  } catch (e) {
    if (e.name === 'AbortError') return;
    status.textContent = '';
    status.append('加载失败，', el('button', { className: 'link-btn', type: 'button', textContent: '点此重试', onclick: () => load(reset) }));
  } finally {
    if (controller === mine) {
      loading = false;
      more.disabled = false;
    }
  }
}

function search(q, push = true) {
  query = q.trim();
  input.value = query;
  const url = new URL(location.href);
  if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
  if (push) history.replaceState(null, '', url);
  load(true);
}

form.addEventListener('submit', (e) => { e.preventDefault(); search(input.value); });
let timer;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => input.value.trim() !== query && search(input.value), 500); });
list.addEventListener('click', (e) => {
  const tag = e.target.closest?.('a.hashtag');
  if (!tag) return;
  e.preventDefault();
  search(tag.dataset.q);
  scrollTo({ top: 0, behavior: 'smooth' });
});
more.addEventListener('click', () => load(false));
new IntersectionObserver((entries) => { if (entries[0].isIntersecting && next && !loading) load(false); }, { rootMargin: '600px' }).observe(more);

search(new URLSearchParams(location.search).get('q') ?? '', false);
