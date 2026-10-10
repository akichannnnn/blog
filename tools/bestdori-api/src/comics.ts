import { Entity, allUrl } from './entity.ts';
import { NotExistException } from './exceptions.ts';
import { Api } from './network.ts';
import type { ComicInfo, Obj } from './types.ts';
import { API, ASSETS, assertServerAvailable, firstName, fmt, type ServerName } from './utils.ts';

export const getAll = (index = 5) => new Api(allUrl(API.all.comics, index)).getJson<Record<string, Obj>>();

export class Comic extends Entity<ComicInfo> {
  protected readonly infoUrl = '';
  protected readonly label = 'Comic';
  protected override readonly commentCategory = 'COMIC_COMMENT';

  protected override async fetchInfo(): Promise<ComicInfo> {
    const info = (await getAll(5))[String(this.id)];
    if (!info) throw new NotExistException(`Comic ${this.id}`);
    return info as ComicInfo;
  }

  private async asset(kind: 'comic' | 'thumbnail', server: ServerName): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    assertServerAvailable(info.publicStartAt, server, `Comic ${firstName(info.title)}`);
    const type = info.assetBundleName.includes('fourframe') ? 'fourframe' : 'singleframe';
    return new Api(
      fmt(ASSETS.comic[kind], { server, type, asset_bundle_name: info.assetBundleName }),
    ).getBytes();
  }

  getThumbnail(server: ServerName) { return this.asset('thumbnail', server); }
  getAsset(server: ServerName) { return this.asset('comic', server); }
}
