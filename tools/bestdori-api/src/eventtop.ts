import { HTTPStatusError, NotExistException } from './exceptions.ts';
import { Api } from './network.ts';
import type { Obj } from './types.ts';
import { API, type Server } from './utils.ts';

export type EventTopData = Obj;

/** 获取活动 T10 排名数据：`interval` 为实时追踪，`latest: 1` 为最终分数线 */
export async function getData(
  server: Server,
  event: number,
  mid = 0,
  opts: { interval?: number; latest?: 1 } = {},
): Promise<EventTopData> {
  try {
    return await new Api(API.tracker.eventtop).getJson({ server, event, mid, ...opts });
  } catch (e) {
    if (e instanceof HTTPStatusError && e.statusCode === 404) throw new NotExistException(`Event ${event}`);
    throw e;
  }
}
