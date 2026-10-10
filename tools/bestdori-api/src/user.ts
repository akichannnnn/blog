import { getList } from './post.ts';
import { Api } from './network.ts';
import type { Obj, PostList } from './types.ts';
import { API, type Order } from './utils.ts';

export class User {
  readonly username: string;
  constructor(username: string) {
    this.username = username;
  }

  getInfo(): Promise<Obj> {
    return new Api(API.user.info).getJson({ username: this.username });
  }

  getPosts(limit = 20, offset = 0, order: Order = 'TIME_DESC'): Promise<PostList> {
    return getList({ username: this.username, limit, offset, order });
  }
}
