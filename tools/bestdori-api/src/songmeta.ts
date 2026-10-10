import { allUrl } from './entity.ts';
import { Api } from './network.ts';
import type { Obj } from './types.ts';
import { API } from './utils.ts';

export const getAll = (index: 2 | 5 = 5) => new Api(allUrl(API.all.meta, index)).getJson<Record<string, Obj>>();
