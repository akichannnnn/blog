import { NoDataException, ServerNotAvailableError } from './exceptions.ts';
import api from './data/api.json' with { type: 'json' };
import assets from './data/assets.json' with { type: 'json' };
import res from './data/res.json' with { type: 'json' };

export const API = api;
export const ASSETS = assets;
export const RES = res;

/** 服务器序号 0-4 */
export type Server = 0 | 1 | 2 | 3 | 4;
export type ServerName = 'jp' | 'en' | 'tw' | 'cn' | 'kr';
export const SERVERS: readonly ServerName[] = ['jp', 'en', 'tw', 'cn', 'kr'];
/** 各服务器的本地化字符串（日 / 英 / 台 / 国 / 韩） */
export type PerServer<T> = (T | null)[];
export type Order = 'TIME_DESC' | 'TIME_ASC';

/**
 * Python 风格的模板格式化，支持 `{x}`、`{x:d}`、`{x:>03d}`。
 */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)(?::([^}]*))?\}/g, (_, key: string, spec?: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`missing template value '${key}' for ${template}`);
    const m = spec && /^>0(\d+)d$/.exec(spec);
    return m ? String(v).padStart(Number(m[1]), '0') : String(v);
  });
}

/** 提取名称列表中第一个非空元素 */
export function firstName(names: PerServer<string>): string {
  return names.find((n) => !!n) ?? '';
}

/** 根据各服务器的发布时间数组推断默认服务器 */
export function firstServer(times: PerServer<unknown>, what: string): ServerName {
  const i = times.findIndex((t) => t != null);
  if (i < 0) throw new NoDataException(what);
  return SERVERS[i]!;
}

export function assertServerAvailable(times: PerServer<unknown>, server: ServerName, name: string): void {
  if (times[SERVERS.indexOf(server)] == null) {
    throw new ServerNotAvailableError(name, server);
  }
}
