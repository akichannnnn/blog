import { Entity, allUrl } from './entity.ts';
import { Api } from './network.ts';
import type { CardAll3, CardAll5, CardInfo, Obj } from './types.ts';
import { API, ASSETS, RES, fmt, firstName, firstServer, type ServerName } from './utils.ts';

type Variant = 'normal' | 'after_training';

export function getAll(index: 5): Promise<CardAll5>;
export function getAll(index: 3): Promise<CardAll3>;
export function getAll(index: 0 | 2): Promise<Record<string, Obj>>;
export function getAll(index: 0 | 2 | 3 | 5 = 5): Promise<unknown> {
  return new Api(allUrl(API.cards.all, index)).getJson();
}

export const getAttributeIcon = (attribute: 'powerful' | 'pure' | 'cool' | 'happy') =>
  new Api(fmt(RES.icon.svg, { name: attribute })).getBytes();

export const getStarIcon = (star: 'star' | 'star_trained') =>
  new Api(fmt(RES.icon.png, { name: star })).getBytes();

/** 卡牌完整边框 */
export const getFrame = (level: 1 | 2 | 3 | 4 | 5) =>
  new Api(fmt(RES.image.png, { name: `frame-${level}` })).getBytes();

/** 卡牌缩略图边框 */
export const getCardFrame = (level: 1 | 2 | 3 | 4 | 5) =>
  new Api(fmt(RES.image.png, { name: `card-${level}` })).getBytes();

export class Card extends Entity<CardInfo> {
  protected readonly infoUrl = fmt(API.cards.info, { id: this.id });
  protected readonly label = 'Card';
  protected override readonly commentCategory = 'CARD_COMMENT';

  async getName(): Promise<string> {
    return firstName((await this.ensureInfo()).prefix);
  }

  /** 卡牌所在默认服务器 */
  async getServer(): Promise<ServerName> {
    return firstServer((await this.ensureInfo()).releasedAt, 'card server');
  }

  private async resource(name: 'card' | 'trim', type: Variant): Promise<string> {
    const info = await this.ensureInfo();
    return fmt(ASSETS.characters.resourceset, {
      server: await this.getServer(),
      resource_set_name: info.resourceSetName,
      name,
      type,
    });
  }

  /** 卡牌完整图片 */
  async getCard(type: Variant): Promise<Uint8Array> {
    return new Api(await this.resource('card', type)).getBytes();
  }

  /** 卡牌无背景图片 */
  async getTrim(type: Variant): Promise<Uint8Array> {
    return new Api(await this.resource('trim', type)).getBytes();
  }

  /** 卡牌缩略图 */
  async getThumb(type: Variant): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    return new Api(
      fmt(ASSETS.thumb.chara, {
        server: await this.getServer(),
        id: Math.floor(this.id / 50),
        resource_set_name: info.resourceSetName,
        type,
      }),
    ).getBytes();
  }

  /** LIVE 服装图片 */
  async getLiveSd(): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    return new Api(
      fmt(ASSETS.characters.livesd, { server: await this.getServer(), sd_resource_name: info.sdResourceName }),
    ).getBytes();
  }
}
