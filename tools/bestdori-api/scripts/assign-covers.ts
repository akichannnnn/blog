/**
 * 为每篇文章随机抽一张 4★/5★ 卡牌作为封面。
 *
 *   node scripts/assign-covers.ts          # 只处理还没有 cover 的文章
 *   node scripts/assign-covers.ts --force  # 重新抽取所有文章
 *
 * 图片保存到 static/covers/<slug>.webp（需要安装 cwebp），并写入文章 front matter 的 `cover` / `coverCard`。
 */
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { cards } from '../src/index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const postDir = path.join(root, 'content/post');
const coverDir = path.join(root, 'static/covers');
const execFileAsync = promisify(execFile);
const force = process.argv.includes('--force');

interface Post {
  file: string;
  slug: string;
}

async function findPosts(): Promise<Post[]> {
  const posts: Post[] = [];
  for (const entry of await readdir(postDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const file = path.join(postDir, entry.name, 'index.md');
      if (await stat(file).then(() => true, () => false)) posts.push({ file, slug: entry.name });
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      posts.push({ file: path.join(postDir, entry.name), slug: entry.name.replace(/\.md$/, '') });
    }
  }
  return posts;
}

function setFrontMatter(source: string, values: Record<string, string>): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!m) return `---\n${Object.entries(values).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${source}`;
  let fm = m[1]!;
  for (const [key, value] of Object.entries(values)) {
    const line = new RegExp(`^${key}:.*$`, 'm');
    fm = line.test(fm) ? fm.replace(line, `${key}: ${value}`) : `${fm}\n${key}: ${value}`;
  }
  return source.replace(m[1]!, fm);
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** 依次尝试候选卡牌，直到图片下载成功（个别卡牌没有特训后图） */
async function downloadCover(candidates: number[]): Promise<{ id: number; image: Uint8Array }> {
  for (const id of candidates) {
    const card = new cards.Card(id);
    for (const variant of ['after_training', 'normal'] as const) {
      try {
        return { id, image: await card.getCard(variant) };
      } catch (e) {
        console.warn(`  card ${id} ${variant}: ${(e as Error).message}`);
      }
    }
  }
  throw new Error('no card image could be downloaded');
}

const posts = await findPosts();
const todo: Post[] = [];
for (const post of posts) {
  const source = await readFile(post.file, 'utf8');
  if (force || !/^cover:/m.test(source)) todo.push(post);
}
if (todo.length === 0) {
  console.log('all posts already have covers (use --force to reroll)');
  process.exit(0);
}

const all = await cards.getAll(5);
const pool = Object.entries(all)
  .filter(([, c]) => c.rarity >= 4 && c.releasedAt.some((t) => t != null))
  .map(([id]) => Number(id));
console.log(`${pool.length} cards with rarity >= 4`);

await mkdir(coverDir, { recursive: true });
for (const post of todo) {
  const { id, image } = await downloadCover(shuffle([...pool]).slice(0, 10));
  const png = path.join(coverDir, `${post.slug}.src.png`);
  await writeFile(png, image);
  await execFileAsync('cwebp', ['-q', '85', '-quiet', png, '-o', path.join(coverDir, `${post.slug}.webp`)]);
  await unlink(png);
  const source = await readFile(post.file, 'utf8');
  await writeFile(
    post.file,
    setFrontMatter(source, { cover: `/covers/${post.slug}.webp`, coverCard: String(id) }),
  );
  console.log(`${post.slug}: card ${id}`);
}
