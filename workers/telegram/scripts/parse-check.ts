/** 用法: node scripts/parse-check.ts <t.me/s 页面保存下来的 html> [...] */
import { readFileSync } from 'node:fs';
import { parsePage } from '../src/parse.ts';

for (const file of process.argv.slice(2)) {
  const page = parsePage(readFileSync(file, 'utf8'), 'sbgatools');
  console.log(`${file}: ${page.messages.length} messages, next=${page.next}`);
  for (const m of page.messages) {
    const kinds = m.media.map((x) => x.type).join(',');
    console.log(`  #${m.id} ${m.date.slice(0, 16)} [${kinds}] ${m.html.slice(0, 40).replace(/\n/g, ' ')}${m.reply ? ' (reply)' : ''}${m.linkPreview ? ' (preview)' : ''}`);
  }
}
