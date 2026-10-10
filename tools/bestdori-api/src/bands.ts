import { allUrl } from './entity.ts';
import { Api } from './network.ts';
import type { Obj } from './types.ts';
import { API, ASSETS, fmt, type ServerName } from './utils.ts';

export const getAll = (index = 1) => new Api(allUrl(API.bands.all, index)).getJson<Record<string, Obj>>();
export const getMain = (index = 1) => new Api(allUrl(API.bands.main, index)).getJson<Record<string, Obj>>();

export const getLogo = (id: number, type: 'logoS' | 'logoL' | 'logoL_Mask', server: ServerName) =>
  new Api(fmt(ASSETS.band.logo, { server, id, type })).getBytes();
