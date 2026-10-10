import { Entity, allUrl } from './entity.ts';
import { HTTPStatusError, NotExistException } from './exceptions.ts';
import { getChart, type Difficulty } from './charts.ts';
import { Api } from './network.ts';
import type { Obj, SongInfo } from './types.ts';
import { API, ASSETS, firstServer, fmt, type ServerName } from './utils.ts';

export const getAll = (index: 0 | 1 | 5 | 7 | 8 = 5) =>
  new Api(allUrl(API.songs.all, index)).getJson<Record<string, Obj>>();

export class Jacket {
  readonly #index: number;
  readonly #image: string;
  readonly #server: ServerName;
  constructor(index: number, jacketImage: string, server: ServerName) {
    this.#index = index;
    this.#image = jacketImage;
    this.#server = server;
  }
  get url(): string {
    return new Api(
      fmt(ASSETS.songs.musicjacket, { server: this.#server, index: this.#index, jacket_image: this.#image }),
    ).url;
  }
  getBytes(): Promise<Uint8Array> {
    return new Api(this.url).getBytes();
  }
}

export class Song extends Entity<SongInfo> {
  protected readonly infoUrl = fmt(API.songs.info, { id: this.id });
  protected readonly label = 'Song';
  protected override readonly commentCategory = 'SONG_COMMENT';

  async getServer(): Promise<ServerName> {
    return firstServer((await this.ensureInfo()).publishedAt, 'song server');
  }

  /** 歌曲封面（数据包序号为大于等于 id 的最小 10 的倍数） */
  async getJacket(): Promise<Jacket[]> {
    const info = await this.ensureInfo();
    const index = Math.ceil(this.id / 10) * 10;
    const server = await this.getServer();
    return info.jacketImage.map((image) => new Jacket(index, image, server));
  }

  async getChart(diff: Difficulty = 'expert') {
    try {
      return await getChart(this.id, diff);
    } catch (e) {
      if (e instanceof HTTPStatusError && e.statusCode === 404) throw new NotExistException(`Difficulty '${diff}'`);
      throw e;
    }
  }

  async getBgm(): Promise<Uint8Array> {
    const server = await this.getServer();
    return new Api(fmt(ASSETS.songs.sound, { server, id: this.id })).getBytes();
  }
}
