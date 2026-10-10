import { Entity, allUrl } from './entity.ts';
import { Api } from './network.ts';
import type { CharacterInfo, Obj } from './types.ts';
import { API, ASSETS, RES, fmt } from './utils.ts';

export const getAll = (index: 0 | 2 | 5 = 5) =>
  new Api(allUrl(API.characters.all, index)).getJson<Record<string, Obj>>();
export const getMain = (index: 1 | 2 | 3 = 3) =>
  new Api(allUrl(API.characters.main, index)).getJson<Record<string, Obj>>();

export class Character extends Entity<CharacterInfo> {
  protected readonly infoUrl = fmt(API.characters.info, { id: this.id });
  protected readonly label = 'Character';
  protected override readonly commentCategory = 'CHARACTER_COMMENT';

  getIcon(): Promise<Uint8Array> {
    return new Api(fmt(RES.icon.png, { name: `chara_icon_${this.id}` })).getBytes();
  }

  /** 主视觉图 */
  getKvImage(): Promise<Uint8Array> {
    return new Api(fmt(ASSETS.characters.character_kv_image, { server: 'jp', id: this.id })).getBytes();
  }
}
