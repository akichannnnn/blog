import { Entity, allUrl } from './entity.ts';
import { NotExistException } from './exceptions.ts';
import { Api } from './network.ts';
import type { Obj, StampInfo } from './types.ts';
import { API, ASSETS, fmt, type ServerName } from './utils.ts';

export const getAll = (index = 2) => new Api(allUrl(API.all.stamps, index)).getJson<Record<string, Obj>>();

export class Stamp extends Entity<StampInfo> {
  protected readonly infoUrl = '';
  protected readonly label = 'Stamp';

  /** 贴纸信息来自 `all.2.json` */
  protected override async fetchInfo(): Promise<StampInfo> {
    const info = (await getAll(2))[String(this.id)];
    if (!info) throw new NotExistException(`Stamp ${this.id}`);
    return info as StampInfo;
  }

  async getStamp(server: ServerName): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    return new Api(fmt(ASSETS.stamp.get, { server, image_name: info.imageName })).getBytes();
  }
}
