/** 本地调试代理（等价于 Worker，不需要 wrangler）：node scripts/dev-server.ts → http://localhost:8787 */
import { createServer } from 'node:http';
import worker from '../src/index.ts';

const env = { CHANNEL: 'sbgatools', ALLOWED_ORIGINS: 'http://localhost:1313' };
const port = Number(process.env.PORT ?? 8787);

createServer(async (req, res) => {
  const url = `http://localhost:${port}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const response = await worker.fetch(new Request(url, { method: req.method, headers }), env as never);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`telegram feed dev server: http://localhost:${port}`));
