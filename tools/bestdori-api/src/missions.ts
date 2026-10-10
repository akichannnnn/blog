import { Entity, allUrl } from './entity.ts';
import { Api } from './network.ts';
import type { Obj } from './types.ts';
import { API, fmt } from './utils.ts';

export const getAll = (index: 0 | 5 = 5) => new Api(allUrl(API.missions.all, index)).getJson<Record<string, Obj>>();

export class Mission extends Entity<Obj> {
  protected readonly infoUrl = fmt(API.missions.info, { id: this.id });
  protected readonly label = 'Mission';
  protected override readonly commentCategory = 'MISSION_COMMENT';
}
