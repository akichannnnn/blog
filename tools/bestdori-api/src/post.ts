import { Api } from './network.ts';
import type { Obj, PostList, PostListOptions } from './types.ts';
import { API } from './utils.ts';

/** 搜索帖子 / 评论 / 社区谱面 */
export async function getList(options: PostListOptions): Promise<PostList> {
  const body = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined));
  return (await new Api(API.post.list).post(body)).json() as Promise<PostList>;
}

export interface PostTagResult {
  type: string;
  data: string;
  count: number;
}

/** 搜索标签 */
export async function searchTags(type: string, data = '', fuzzy = true): Promise<PostTagResult[]> {
  const res = await new Api(API.post.tag).getJson<{ tags: PostTagResult[] }>({ type, data, fuzzy });
  return res.tags;
}

/** 查询帖子在画廊中的时间顺序 */
export async function findPost(categoryName: string, categoryId: string, id: number): Promise<number> {
  const res = await new Api(API.post.find).getJson<{ position?: number }>({ categoryName, categoryId, id });
  if (res.position === undefined) throw new Error('Unknown error occurred while finding post.');
  return res.position;
}

export class Post {
  readonly id: number;
  constructor(id: number) {
    this.id = id;
  }

  /** 获取帖子基础信息 */
  getBasic(): Promise<Obj> {
    return new Api(API.post.basic).getJson({ id: this.id });
  }

  /** 获取帖子详细信息 */
  async getDetails(): Promise<Obj> {
    const res = await new Api(API.post.details).getJson<{ post: Obj }>({ id: this.id });
    return res.post;
  }
}
