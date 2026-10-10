import { Entity, allUrl } from './entity.ts';
import { NoDataException } from './exceptions.ts';
import { Api } from './network.ts';
import { Stamp } from './stamps.ts';
import * as eventtop from './eventtop.ts';
import { EventTracker } from './eventtracker.ts';
import { getRotationMusics, getStages } from './festival.ts';
import type { EventInfo, Obj } from './types.ts';
import { API, ASSETS, assertServerAvailable, firstName, firstServer, fmt, type Server, type ServerName } from './utils.ts';

export const getAll = (index: 0 | 1 | 3 | 4 | 5 | 6 = 5) =>
  new Api(allUrl(API.events.all, index)).getJson<Record<string, Obj>>();

export class Event extends Entity<EventInfo> {
  protected readonly infoUrl = fmt(API.events.info, { id: this.id });
  protected readonly label = 'Event';
  protected override readonly commentCategory = 'EVENT_COMMENT';

  async getServer(): Promise<ServerName> {
    return firstServer((await this.ensureInfo()).startAt, 'event server');
  }

  /** 对应服务器的活动 PT & 排名追踪器 */
  tracker(server: Server): EventTracker {
    return new EventTracker(this.id, server);
  }

  private async asset(kind: 'banner' | 'logo', server: ServerName): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    assertServerAvailable(info.startAt, server, `Event '${firstName(info.eventName)}'`);
    return new Api(fmt(ASSETS.event[kind], { server, asset_bundle_name: info.assetBundleName })).getBytes();
  }

  getBanner(server: ServerName) { return this.asset('banner', server); }
  getLogo(server: ServerName) { return this.asset('logo', server); }

  async getTopscreen(server: ServerName, type: 'bg' | 'trim'): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    assertServerAvailable(info.startAt, server, `Event '${firstName(info.eventName)}'`);
    return new Api(
      fmt(ASSETS.event.topscreen, { server, asset_bundle_name: info.assetBundleName, type }),
    ).getBytes();
  }

  /** 活动奖励稀有表情 */
  async getStamp(): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    const rewards = info.pointRewards.find((x) => x != null);
    if (!rewards) throw new NoDataException('event point reward');
    const stampId = (rewards.find((r) => r.rewardType === 'stamp') as { rewardId?: number } | undefined)?.rewardId;
    if (stampId === undefined) throw new Error(`Event ${this.id} has no stamp reward.`);
    return new Stamp(stampId).getStamp(await this.getServer());
  }

  /** 最终 T10 排名分数线 */
  getTop(server: Server, mid = 0) {
    return eventtop.getData(server, this.id, mid, { latest: 1 });
  }

  getRotationMusics() { return getRotationMusics(this.id); }
  getStages() { return getStages(this.id); }
}
