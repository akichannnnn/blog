import { HTTPStatusError, NotExistException } from './exceptions.ts';
import { Api } from './network.ts';
import { getList } from './post.ts';
import type { PostList } from './types.ts';
import type { Order } from './utils.ts';

/**
 * 带有 `id`、可懒加载 `info` 的资源基类（卡牌、活动、歌曲……）。
 */
export abstract class Entity<Info extends object> {
  readonly id: number;
  #info?: Info;

  protected abstract readonly infoUrl: string;
  protected abstract readonly label: string;
  /** 评论画廊名称，`undefined` 表示没有评论 */
  protected readonly commentCategory?: string;

  constructor(id: number) {
    this.id = id;
  }

  /** 已获取的信息，未获取时抛出异常 */
  get info(): Info {
    if (!this.#info) throw new Error(`${this.label} ${this.id} info were not retrieved.`);
    return this.#info;
  }

  /** 获取（并缓存）信息 */
  async getInfo(): Promise<Info> {
    try {
      this.#info = await this.fetchInfo();
    } catch (e) {
      if (e instanceof HTTPStatusError && e.statusCode === 404) {
        throw new NotExistException(`${this.label} ${this.id}`);
      }
      throw e;
    }
    return this.#info;
  }

  protected fetchInfo(): Promise<Info> {
    return new Api(this.infoUrl).getJson<Info>();
  }

  /** 若未获取过信息则先获取 */
  protected async ensureInfo(): Promise<Info> {
    return this.#info ?? (await this.getInfo());
  }

  async getComment(limit = 20, offset = 0, order: Order = 'TIME_ASC'): Promise<PostList> {
    if (!this.commentCategory) throw new Error(`${this.label} has no comments.`);
    return getList({ categoryName: this.commentCategory, categoryId: String(this.id), order, limit, offset });
  }
}

export function allUrl(template: string, index: number): string {
  return template.replace('{index}', String(index));
}
