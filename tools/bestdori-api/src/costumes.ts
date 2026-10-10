import { Entity, allUrl } from './entity.ts';
import { AssetsNotExistError } from './exceptions.ts';
import { Api } from './network.ts';
import type { CostumeInfo, Obj } from './types.ts';
import { API, ASSETS, fmt, firstServer, type ServerName } from './utils.ts';

export const getAll = (index: 0 | 5 = 5) => new Api(allUrl(API.costumes.all, index)).getJson<Record<string, Obj>>();

export class Costume extends Entity<CostumeInfo> {
  protected readonly infoUrl = fmt(API.costumes.info, { id: this.id });
  protected readonly label = 'Costume';
  protected override readonly commentCategory = 'COSTUME_COMMENT';

  async getServer(): Promise<ServerName> {
    return firstServer((await this.ensureInfo()).publishedAt, 'costume server');
  }

  async getSdChara(): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    return new Api(
      fmt(ASSETS.characters.livesd, { server: await this.getServer(), sd_resource_name: info.sdResourceName }),
    ).getBytes();
  }

  async getBuildData(): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    const server = await this.getServer();
    try {
      return await new Api(
        fmt(ASSETS.live2d.buildData, { server, asset_bundle_name: info.assetBundleName }),
      ).getBytes();
    } catch (e) {
      if (e instanceof AssetsNotExistError) {
        throw new AssetsNotExistError(`costume build data ${info.assetBundleName}-${server}`);
      }
      throw e;
    }
  }

  async getIcon(): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    return new Api(
      fmt(ASSETS.thumb.costume, {
        server: await this.getServer(),
        id: Math.floor(this.id / 50),
        asset_bundle_name: info.assetBundleName,
      }),
    ).getBytes();
  }
}
