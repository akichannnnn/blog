/** 解析 `https://t.me/s/<channel>` 公开预览页，不依赖运行环境（Worker / Node 通用）。 */

export type Media =
  | { type: 'photo'; src: string; ratio?: number }
  | { type: 'video' | 'gif' | 'roundvideo'; src: string; poster?: string; duration?: string }
  | { type: 'audio'; src: string; duration?: string }
  | { type: 'sticker'; src: string }
  | { type: 'videosticker'; src: string }
  | { type: 'document'; title: string; extra?: string }
  /** 视频太大等原因，网页预览里没有源文件，只能跳转 Telegram */
  | { type: 'unsupported' };

export interface LinkPreview {
  url: string;
  site?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface Message {
  id: number;
  date: string;
  /** 已清洗的 HTML 正文（只含白名单标签） */
  html: string;
  views?: string;
  edited?: boolean;
  forwardedFrom?: string;
  reply?: { id?: number; author?: string; text?: string };
  media: Media[];
  linkPreview?: LinkPreview;
  link: string;
}

export interface Page {
  channel: { title: string; description?: string; photo?: string };
  messages: Message[];
  /** 继续往前翻页时用的 `before`，没有更早的消息时为 `null` */
  next: number | null;
}

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED[e] ?? m;
  });
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** 只放行 Telegram 自己的 CDN，避免页面被塞进任意第三方资源 */
export function safeMediaUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(decodeEntities(raw), 'https://t.me');
    if (url.protocol !== 'https:') return undefined;
    const ok = /(^|\.)(telesco\.pe|telegram\.org|t\.me|cdn-telegram\.org)$/.test(url.hostname);
    return ok ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeLink(raw: string): string | undefined {
  try {
    const url = new URL(decodeEntities(raw), 'https://t.me');
    return ['http:', 'https:', 'tg:', 'mailto:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** 白名单清洗正文：保留行内格式、换行与链接，其余标签全部丢掉 */
export function sanitize(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<i class="emoji"[^>]*>\s*<b>([^<]*)<\/b>\s*<\/i>/g, '$1')
    .replace(/<tg-emoji[^>]*>([\s\S]*?)<\/tg-emoji>/g, '$1')
    .replace(/<(\/?)(a|b|i|u|s|em|strong|code|pre|blockquote|br|tg-spoiler)\b([^>]*)>|<[^>]*>/g, (_m, close: string, tag: string, attrs: string) => {
      if (!tag) return '';
      if (tag === 'br') return '<br>';
      if (tag === 'tg-spoiler') return close ? '</span>' : '<span class="spoiler">';
      if (close) return `</${tag}>`;
      if (tag === 'a') {
        // 话题标签 `?q=%23xxx` 在站内变成搜索
        const raw = /href="([^"]*)"/.exec(attrs)?.[1] ?? '';
        if (raw.startsWith('?q=')) return `<a href="#" class="hashtag" data-q="${escapeAttr(decodeEntities(decodeURIComponent(raw.slice(3))))}">`;
        const href = safeLink(/href="([^"]*)"/.exec(attrs)?.[1] ?? '');
        return href ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">` : '<a>';
      }
      return `<${tag}>`;
    })
    .trim();
}

const textOf = (html: string) => decodeEntities(html.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>/g, '')).trim();
const bg = (s: string) => safeMediaUrl(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/.exec(s)?.[1]);
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

function parseMedia(part: string): Media[] {
  const media: Media[] = [];

  // 按出现顺序收集：图片、视频/GIF/圆形视频、语音/音频、贴纸、文件
  const re = /<a\b[^>]*tgme_widget_message_photo_wrap[^>]*>|<(video|audio)\b[^>]*>|<[^>]*tgme_widget_message_sticker\b[^>]*>|<[^>]*tgme_widget_message_document_title[^>]*>([\s\S]*?)<\/div>\s*<div class="tgme_widget_message_document_extra"[^>]*>([\s\S]*?)<\/div>|message_media_not_supported_wrap/g;
  for (const m of part.matchAll(re)) {
    const tag = m[0];
    if (tag.includes('tgme_widget_message_photo_wrap')) {
      const src = bg(tag);
      const ratio = Number(attr(tag, 'data-ratio'));
      if (src) media.push({ type: 'photo', src, ...(ratio > 0 ? { ratio } : {}) });
    } else if (m[1] === 'video') {
      const src = safeMediaUrl(attr(tag, 'src'));
      if (!src) continue;
      const cls = attr(tag, 'class') ?? '';
      if (cls.includes('videosticker')) {
        media.push({ type: 'videosticker', src });
        continue;
      }
      // 缩略图 / 时长在同一个 video_player 外壳里
      const at = m.index ?? 0;
      const from = Math.max(part.lastIndexOf('<a', at), 0);
      const end = part.indexOf('</a>', at);
      const shell = part.slice(from, end < 0 ? at + 900 : end + 4);
      const poster = bg(/tgme_widget_message_video_thumb[^>]*>/.exec(shell)?.[0] ?? '');
      const duration = /message_video_duration[^>]*>([^<]*)</.exec(shell)?.[1];
      const isGif = /\sloop\b/.test(tag) || /^gif$/i.test(duration ?? '');
      media.push({
        type: cls.includes('roundvideo') ? 'roundvideo' : isGif ? 'gif' : 'video',
        src,
        ...(poster ? { poster } : {}),
        ...(duration ? { duration } : {}),
      });
    } else if (m[1] === 'audio') {
      const src = safeMediaUrl(attr(tag, 'src'));
      const duration = /message_voice_duration[^>]*>([^<]*)</.exec(part.slice(m.index ?? 0, (m.index ?? 0) + 600))?.[1];
      if (src) media.push({ type: 'audio', src, ...(duration ? { duration } : {}) });
    } else if (tag.includes('tgme_widget_message_sticker')) {
      const src = safeMediaUrl(attr(tag, 'data-webp'));
      if (src) media.push({ type: 'sticker', src });
    } else if (tag.includes('document_title')) {
      media.push({ type: 'document', title: textOf(m[2] ?? ''), ...(m[3] ? { extra: textOf(m[3]) } : {}) });
    } else {
      media.push({ type: 'unsupported' });
    }
  }
  // 「不支持」只是兜底提示，已有可展示的媒体时不必再出现
  return media.length > 1 ? media.filter((m) => m.type !== 'unsupported') : media;
}

function parseLinkPreview(part: string): LinkPreview | undefined {
  const start = part.indexOf('tgme_widget_message_link_preview');
  if (start < 0) return undefined;
  const block = part.slice(start, start + 4000);
  const url = safeLink(/href="([^"]*)"/.exec(block)?.[1] ?? '');
  if (!url) return undefined;
  const pick = (cls: string) => {
    const t = new RegExp(`link_preview_${cls}[^>]*>([\\s\\S]*?)</`).exec(block)?.[1];
    return t ? textOf(t) : undefined;
  };
  const image = bg(/link_preview_(?:image|right_image)[^>]*>/.exec(block)?.[0] ?? '');
  return { url, site: pick('site_name'), title: pick('title'), description: pick('description'), ...(image ? { image } : {}) };
}

export function parsePage(html: string, channel: string): Page {
  const title = decodeEntities(/<meta property="og:title" content="([^"]*)"/.exec(html)?.[1] ?? channel);
  const description = /<meta property="og:description" content="([^"]*)"/.exec(html)?.[1];
  const photo = safeMediaUrl(/<meta property="og:image" content="([^"]*)"/.exec(html)?.[1]);

  const messages: Message[] = [];
  for (const part of html.split('tgme_widget_message_wrap').slice(1)) {
    const id = /data-post="[^"/]+\/(\d+)"/.exec(part)?.[1];
    const date = /<time datetime="([^"]+)"/.exec(part)?.[1];
    if (!id || !date) continue;

    // 回复引用块自带一个 message_text 容器，先剔除，避免误当作正文
    const replyBlock = /<a class="tgme_widget_message_reply[\s\S]*?<\/a>/.exec(part)?.[0];
    const body = replyBlock ? part.replace(replyBlock, '') : part;
    const text = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(body)?.[1] ?? '';

    const forwarded = /tgme_widget_message_forwarded_from_name[^>]*>(?:<span[^>]*>)?([^<]*)/.exec(part)?.[1];
    const views = /tgme_widget_message_views">([^<]*)</.exec(part)?.[1];
    const reply = replyBlock && {
      id: Number(/\/(\d+)"/.exec(replyBlock)?.[1]) || undefined,
      author: textOf(/message_reply_author[^>]*>([\s\S]*?)<\/(?:div|span)>/.exec(replyBlock)?.[1] ?? '') || undefined,
      text: textOf(/message_reply_text[^>]*>([\s\S]*?)<\/div>/.exec(replyBlock)?.[1] ?? '') || undefined,
    };

    messages.push({
      id: Number(id),
      date,
      html: sanitize(text),
      ...(views ? { views } : {}),
      ...(/message_edited/.test(part) ? { edited: true } : {}),
      ...(forwarded ? { forwardedFrom: decodeEntities(forwarded) } : {}),
      ...(reply ? { reply } : {}),
      media: parseMedia(replyBlock ? body : part),
      ...(() => { const p = parseLinkPreview(part); return p ? { linkPreview: p } : {}; })(),
      link: `https://t.me/${channel}/${id}`,
    });
  }

  // 页面里是旧→新，反过来给前端：新→旧
  messages.reverse();
  const oldest = messages.at(-1)?.id;
  // 页面顶部有「加载更早消息」链接时才还有下一页
  const hasMore = /tme_messages_more[^>]*data-before="\d+"/.test(html) || /data-before="\d+"[^>]*tme_messages_more/.test(html);
  return {
    channel: { title, ...(description ? { description: decodeEntities(description) } : {}), ...(photo ? { photo } : {}) },
    messages,
    next: hasMore && oldest ? oldest : null,
  };
}
