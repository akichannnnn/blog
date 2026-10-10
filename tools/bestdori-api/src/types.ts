import type { Order, PerServer } from './utils.ts';

export type Obj = Record<string, unknown>;

export interface PostListPost {
  id: number;
  title: string;
  categoryName: string;
  categoryId: string;
  [key: string]: unknown;
}
export interface PostList {
  result: boolean;
  count: number;
  posts: PostListPost[];
}
export interface PostListOptions {
  search?: string;
  following?: boolean;
  categoryName?: string;
  categoryId?: string;
  tags?: { type: string; data: string }[];
  username?: string;
  order: Order;
  limit?: number;
  offset?: number;
}

export interface CardInfo {
  characterId: number;
  rarity: 1 | 2 | 3 | 4 | 5;
  attribute: 'powerful' | 'pure' | 'cool' | 'happy';
  levelLimit: number;
  resourceSetName: string;
  sdResourceName: string;
  costumeId: number;
  gachaText: PerServer<string>;
  prefix: PerServer<string>;
  releasedAt: PerServer<string>;
  skillId: number;
  type: string;
  stat: Obj;
  [key: string]: unknown;
}
/** `all.5.json`: 卡牌 ID → 简要信息 */
export type CardAll5 = Record<string, Pick<CardInfo, 'characterId' | 'rarity' | 'attribute' | 'levelLimit' | 'resourceSetName' | 'prefix' | 'releasedAt' | 'skillId' | 'type'> & Obj>;
/** `all.3.json` */
export type CardAll3 = Record<string, Obj>;

export interface CharacterInfo extends Obj {
  characterName: PerServer<string>;
  nickname: PerServer<string> | null;
}
export interface EventInfo extends Obj {
  eventType: string;
  eventName: PerServer<string>;
  assetBundleName: string;
  startAt: PerServer<string>;
  endAt: PerServer<string>;
  pointRewards: (Obj[] | null)[];
}
export interface GachaInfo extends Obj {
  gachaName: PerServer<string>;
  bannerAssetBundleName?: string;
  publishedAt: PerServer<string>;
}
export interface SongInfo extends Obj {
  bandId: number;
  jacketImage: string[];
  musicTitle: PerServer<string>;
  publishedAt: PerServer<string>;
}
export interface CostumeInfo extends Obj {
  sdResourceName: string;
  assetBundleName: string;
  description: PerServer<string>;
  publishedAt: PerServer<string>;
}
export interface StampInfo extends Obj { imageName: string }
export interface ComicInfo extends Obj {
  assetBundleName: string;
  title: PerServer<string>;
  publicStartAt: PerServer<string>;
}
export interface LoginCampaignInfo extends Obj {
  assetBundleName: PerServer<string>;
  caption: PerServer<string>;
}
export interface MiracleTicketExchangeInfo extends Obj { ids: (number[] | null)[] }

export interface PlayerProfile extends Obj {}
