import { Entity, allUrl } from './entity.ts';
import { NotExistException } from './exceptions.ts';
import * as eventtop from './eventtop.ts';
import { Api } from './network.ts';
import type { Obj } from './types.ts';
import { API, type Server } from './utils.ts';

export const getAll = (index = 5) => new Api(allUrl(API.all.archives, index)).getJson<Record<string, Obj>>();

export class EventArchive extends Entity<Obj> {
  protected readonly infoUrl = '';
  protected readonly label = 'Event archive';
  protected override readonly commentCategory = 'EVENTARCHIVE_COMMENT';

  protected override async fetchInfo(): Promise<Obj> {
    const info = (await getAll(5))[String(this.id)];
    if (!info) throw new NotExistException(`Event archive ${this.id}`);
    return info;
  }

  /** 最终排名分数线 */
  getTop(server: Server, mid = 0) {
    return eventtop.getData(server, this.id, mid, { latest: 1 });
  }
}
