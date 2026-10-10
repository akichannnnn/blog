import { settings } from './settings.ts';
import {
  AssetsNotExistError,
  HTTPStatusError,
  NoContentTypeError,
  REQUEST_EXCEPTION,
  RequestException,
} from './exceptions.ts';

export const BESTDORI = 'https://bestdori.com';

export type Params = Record<string, string | number | boolean | undefined>;

/** 全局 Cookie（如 `me.cookies`），登录后设置 */
let globalCookie: string | undefined;
export function setCookies(cookie: string | undefined): void {
  globalCookie = cookie;
}

let proxyDispatcher: Promise<unknown> | undefined;
async function dispatcher(): Promise<unknown> {
  if (!settings.proxy) return undefined;
  proxyDispatcher ??= import('undici' as string).then((u) => new u.ProxyAgent(settings.proxy));
  return proxyDispatcher;
}

/** 响应包装：提供 `json()` / `bytes()` */
export class Api {
  readonly url: string;

  constructor(url: string) {
    this.url = url.startsWith('http') ? url : `${BESTDORI}${url}`;
  }

  async get(params?: Params): Promise<Response> {
    return this.request('GET', { params });
  }

  async post(data?: unknown): Promise<Response> {
    return this.request('POST', { data });
  }

  async getJson<T>(params?: Params): Promise<T> {
    return (await this.get(params)).json() as Promise<T>;
  }

  async getBytes(params?: Params): Promise<Uint8Array> {
    return new Uint8Array(await (await this.get(params)).arrayBuffer());
  }

  private async request(method: 'GET' | 'POST', opts: { params?: Params; data?: unknown }): Promise<Response> {
    const url = new URL(this.url);
    for (const [k, v] of Object.entries(opts.params ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = {};
    if (url.origin === BESTDORI) headers['Content-Type'] = 'application/json;charset=UTF-8';
    if (globalCookie) headers['Cookie'] = globalCookie;

    const init: RequestInit & { dispatcher?: unknown } = {
      method,
      headers,
      body: opts.data === undefined ? undefined : JSON.stringify(opts.data),
      signal: AbortSignal.timeout(settings.timeout * 1000),
    };
    const d = await dispatcher();
    if (d) init.dispatcher = d;

    const response = await fetch(url, init);
    return this.handle(response, opts.params, opts.data);
  }

  private async handle(response: Response, params?: Params, data?: unknown): Promise<Response> {
    if (!response.ok) throw new HTTPStatusError(response);

    const contentType = response.headers.get('Content-Type');
    if (!contentType) throw new NoContentTypeError(new URL(response.url).pathname);

    const url = response.url;
    const path = new URL(url).pathname;

    if (url.startsWith(BESTDORI) && url.includes('/api/')) {
      if (!contentType.includes('application/json')) return response;
      const body: unknown = await response.clone().json();
      if (typeof body !== 'object' || body === null || Array.isArray(body)) return response;
      const { result, code } = body as { result?: boolean; code?: string };
      if (result === false) {
        const kwargs = (params ?? (data as Record<string, unknown> | undefined)) as Record<string, unknown> | undefined;
        if (code !== undefined) {
          const Err = REQUEST_EXCEPTION[code];
          if (Err) throw new Err(path, kwargs);
          throw new RequestException(path, code);
        }
        throw new RequestException(path);
      }
    } else if (url.includes('/assets/') || url.includes('/res/')) {
      // 资源不存在时 Bestdori 会返回 HTML 页面
      if (contentType.includes('text/html')) throw new AssetsNotExistError(url);
    }
    return response;
  }
}
