// PureSuck for Hugo — 无框架 ES Module
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

/* ---------- 主题切换（带 View Transition 圆形扩散） ---------- */
const setTheme = (t) => {
  root.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch {}
};
$('#theme-toggle')?.addEventListener('click', (e) => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return setTheme(next);
  const { clientX: x, clientY: y } = e;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => setTheme(next));
  vt.ready.then(() => root.animate(
    { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
    { duration: 450, easing: 'ease-out', pseudoElement: '::view-transition-new(root)' }
  ));
});

/* ---------- 代码复制 ---------- */
const copyIcon = '<svg class="icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>';
const okIcon = '<svg class="icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';
$$('.prose pre').forEach((pre) => {
  const btn = Object.assign(document.createElement('button'), { className: 'icon-btn copy', ariaLabel: '复制代码', innerHTML: copyIcon });
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.innerText.trim()); } catch { return; }
    btn.innerHTML = okIcon;
    setTimeout(() => (btn.innerHTML = copyIcon), 1500);
  });
  pre.append(btn);
});

/* ---------- 图片灯箱（<dialog>） ---------- */
const box = $('#lightbox');
if (box) {
  const big = $('img', box);
  $$('img[data-zoom]').forEach((img) => img.addEventListener('click', () => {
    big.src = img.currentSrc || img.src; big.alt = img.alt;
    box.showModal();
  }));
  box.addEventListener('click', () => box.close());
}

/* ---------- 目录滚动高亮 ---------- */
const toc = $('#toc');
if (toc) {
  const links = new Map($$('a[href^="#"]', toc).map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const heads = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting);
    if (!visible.length) return;
    links.forEach((a) => a.classList.remove('active'));
    links.get(visible[0].target.id)?.classList.add('active');
  }, { rootMargin: '0px 0px -75% 0px' });
  heads.forEach((h) => io.observe(h));
}

/* ---------- 站内搜索（按需加载 index.json） ---------- */
const dlg = $('#search-dialog');
const input = $('#search-input');
const list = $('#search-results');
let index = null;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mark = (text, q) => esc(text).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);

async function search(q) {
  q = q.trim();
  if (!q) return (list.innerHTML = '');
  index ??= await fetch($('script[data-search]').dataset.search).then((r) => r.json()).catch(() => []);
  const lq = q.toLowerCase();
  const hits = index
    .map((p) => ({ p, score: (p.title.toLowerCase().includes(lq) ? 2 : 0) + (p.content.toLowerCase().includes(lq) ? 1 : 0) }))
    .filter((h) => h.score).sort((a, b) => b.score - a.score).slice(0, 20);
  list.innerHTML = hits.length
    ? hits.map(({ p }) => {
        const i = p.content.toLowerCase().indexOf(lq);
        const snip = i < 0 ? p.summary : (i > 30 ? '…' : '') + p.content.slice(Math.max(0, i - 30), i + 90);
        return `<li><a href="${p.url}">${mark(p.title, q)}<small>${mark(snip, q)}</small></a></li>`;
      }).join('')
    : '<li><small style="padding:.5rem .6rem;display:block">没有找到相关内容</small></li>';
}
const openSearch = () => { dlg?.showModal(); input?.focus(); };
$('#search-open')?.addEventListener('click', openSearch);
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
});
let timer;
input?.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => search(input.value), 120); });
dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
