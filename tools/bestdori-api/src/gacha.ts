import { Entity, allUrl } from './entity.ts';
import { AssetsNotExistError } from './exceptions.ts';
import { Api } from './network.ts';
import type { GachaInfo, Obj } from './types.ts';
import { API, ASSETS, assertServerAvailable, firstName, fmt, type ServerName } from './utils.ts';

export const getAll = (index: 0 | 1 | 3 | 5 = 5) =>
  new Api(allUrl(API.gacha.all, index)).getJson<Record<string, Obj>>();

export class Gacha extends Entity<GachaInfo> {
  protected readonly infoUrl = fmt(API.gacha.info, { id: this.id });
  protected readonly label = 'Gacha';
  protected override readonly commentCategory = 'GACHA_COMMENT';

  async getBanner(server: ServerName): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    if (!info.bannerAssetBundleName) throw new Error('Gacha has no banner asset bundle name.');
    assertServerAvailable(info.publishedAt, server, `Gacha '${firstName(info.gachaName)}'`);
    return new Api(
      fmt(ASSETS.homebanner.get, { server, banner_asset_bundle_name: info.bannerAssetBundleName }),
    ).getBytes();
  }

  /** 招募 pickup 图像，尝试获取所有存在的 */
  async getPickups(server: ServerName): Promise<Uint8Array[]> {
    const results = await Promise.all(
      ['pickup1', 'pickup2', 'pickup'].map((asset_name) =>
        new Api(fmt(ASSETS.gacha.screen, { server, id: this.id, asset_name })).getBytes().catch(() => null),
      ),
    );
    const found = results.filter((r): r is Uint8Array => r !== null);
    if (found.length === 0) throw new AssetsNotExistError('gacha pickups');
    return found;
  }

  async getLogo(server: ServerName): Promise<Uint8Array> {
    try {
      return await new Api(fmt(ASSETS.gacha.screen, { server, id: this.id, asset_name: 'logo' })).getBytes();
    } catch {
      throw new AssetsNotExistError('gacha logo');
    }
  }
}
