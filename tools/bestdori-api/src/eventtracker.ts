import { HTTPStatusError, NotExistException } from './exceptions.ts';
import { getList } from './post.ts';
import { Api } from './network.ts';
import * as eventtop from './eventtop.ts';
import type { Obj, PostList } from './types.ts';
import { API, type Order, type Server } from './utils.ts';

export const getRates = () => new Api(API.tracker.rates).getJson<Obj[]>();

export class EventTracker {
  readonly event: number;
  readonly server: Server;
  constructor(event: number, server: Server) {
    this.event = event;
    this.server = server;
  }

  /** 实时 T10 排名追踪 */
  getTop(interval: number, mid = 0) {
    return eventtop.getData(this.server, this.event, mid, { interval });
  }

  /** 指定排名的分数线追踪信息 */
  async getData(tier: number): Promise<Obj> {
    try {
      return await new Api(API.tracker.eventtracker).getJson({ server: this.server, event: this.event, tier });
    } catch (e) {
      if (e instanceof HTTPStatusError && e.statusCode === 404) throw new NotExistException(`Event ${this.event}`);
      throw e;
    }
  }

  getComment(limit = 20, offset = 0, order: Order = 'TIME_ASC'): Promise<PostList> {
    return getList({ categoryName: 'EVENTTRACKER_COMMENT', categoryId: `${this.event}_${this.server}`, order, limit, offset });
  }
}
