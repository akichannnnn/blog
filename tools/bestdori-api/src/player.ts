import { PlayerNotExistError } from './exceptions.ts';
import { Api } from './network.ts';
import type { PlayerProfile } from './types.ts';
import { API, fmt } from './utils.ts';

export class Player {
  readonly id: number;
  readonly server: string;
  constructor(id: number, server: string) {
    this.id = id;
    this.server = server;
  }

  /**
   * @param mode 0: 缓存; 1: 缓存并后台更新; 2: 等待更新（超时返回缓存）; 3: 一直等待更新
   */
  async getProfile(mode: 0 | 1 | 2 | 3 = 2): Promise<PlayerProfile> {
    const res = await new Api(fmt(API.player.info, { server: this.server, id: this.id })).getJson<{
      result: boolean;
      data: { profile: PlayerProfile | null };
    }>({ mode });
    if (!res.result) throw new Error(`Invalid Server: ${this.server}`);
    if (!res.data.profile) throw new PlayerNotExistError(this.server, this.id);
    return res.data.profile;
  }
}
