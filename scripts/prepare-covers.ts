/**
 * 确保文章封面与 front matter 中的 coverCard 保持一致。
 *
 * - 已填写 coverCard 但没有封面文件：下载这张卡牌。
 * - 未填写 coverCard：随机抽取一张已发布的 4★/5★ 卡牌，并写入 coverCard。
 *
 * 运行：bun run covers
 * 指定文章：bun run covers -- --post content/post/example/index.md
 */
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cards } from '../tools/bestdori-api/src/index.ts';

const root = path.resolve(import.meta.dir, '..');
const postDir = path.join(root, 'content/post');
const coverDir = path.join(root, 'static/covers');

interface Post {
  file: string;
  slug: string;
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(() => true, () => false);
}

async function findPosts(): Promise<Post[]> {
  const posts: Post[] = [];
  for (const entry of await readdir(postDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const file = path.join(postDir, entry.name, 'index.md');
      if (await exists(file)) posts.push({ file, slug: entry.name });
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      posts.push({ file: path.join(postDir, entry.name), slug: entry.name.slice(0, -3) });
    }
  }
  return posts;
}

function selectedPosts(): Post[] | undefined {
  const selected: Post[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] !== '--post') continue;
    const value = process.argv[++i];
    if (!value) throw new Error('--post 需要一个文章文件路径。');
    const file = path.resolve(root, value);
    const relative = path.relative(postDir, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !relative.endsWith('.md')) {
      throw new Error(`不是 content/post 下的 Markdown 文章：${value}`);
    }
    const name = path.basename(file, '.md');
    const slug = name === 'index' ? path.basename(path.dirname(file)) : name;
    selected.push({ file, slug });
  }
  return selected.length > 0 ? selected : undefined;
}

function getFrontMatterValue(source: string, key: string): string | undefined {
  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];
  return frontMatter?.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, 'm'))?.[1]?.replace(/^['"]|['"]$/g, '');
}

function setFrontMatter(source: string, values: Record<string, string>): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) {
    const fields = Object.entries(values).map(([key, value]) => `${key}: ${value}`).join('\n');
    return `---\n${fields}\n---\n\n${source}`;
  }

  let frontMatter = match[1]!;
  for (const [key, value] of Object.entries(values)) {
    const line = new RegExp(`^${key}:.*$`, 'm');
    frontMatter = line.test(frontMatter)
      ? frontMatter.replace(line, `${key}: ${value}`)
      : `${frontMatter}\n${key}: ${value}`;
  }
  return source.replace(match[1]!, frontMatter);
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

async function downloadCard(id: number): Promise<Uint8Array> {
  const card = new cards.Card(id);
  for (const variant of ['after_training', 'normal'] as const) {
    try {
      return await card.getCard(variant);
    } catch (error) {
      console.warn(`  card ${id} ${variant}: ${(error as Error).message}`);
    }
  }
  throw new Error(`无法下载卡牌 ${id} 的完整图片。`);
}

async function randomCardId(): Promise<number> {
  const all = await cards.getAll(5);
  const candidates = Object.entries(all)
    .filter(([, card]) => card.rarity >= 4 && card.releasedAt.some((date) => date != null))
    .map(([id]) => Number(id));
  if (candidates.length === 0) throw new Error('没有可用的 4★/5★ 卡牌。');
  return shuffle(candidates)[0]!;
}

async function createCover(slug: string, cardId: number): Promise<void> {
  const output = path.join(coverDir, `${slug}.webp`);
  const source = path.join(coverDir, `${slug}.src.png`);
  await writeFile(source, await downloadCard(cardId));

  const process = Bun.spawn(['cwebp', '-q', '85', '-quiet', source, '-o', output], { stdout: 'inherit', stderr: 'inherit' });
  if (await process.exited !== 0) {
    await unlink(source).catch(() => undefined);
    throw new Error('cwebp 转换失败；请确认已安装 WebP 工具。');
  }
  await unlink(source);
}

await mkdir(coverDir, { recursive: true });
for (const post of selectedPosts() ?? await findPosts()) {
  const source = await readFile(post.file, 'utf8');
  const storedId = Number(getFrontMatterValue(source, 'coverCard'));
  const hasCardId = Number.isSafeInteger(storedId) && storedId > 0;
  const cover = path.join(coverDir, `${post.slug}.webp`);

  // 没有 ID 时才随机抽卡；已有 ID 时绝不重抽，避免封面随开发启动而变化。
  const cardId = hasCardId ? storedId : await randomCardId();
  if (!hasCardId) console.log(`${post.slug}: rolled card ${cardId}`);

  if (!hasCardId || !(await exists(cover))) {
    console.log(`${post.slug}: generating cover from card ${cardId}`);
    await createCover(post.slug, cardId);
  }

  const updated = setFrontMatter(source, {
    cover: `/covers/${post.slug}.webp`,
    coverCard: String(cardId),
  });
  if (updated !== source) await writeFile(post.file, updated);
}
