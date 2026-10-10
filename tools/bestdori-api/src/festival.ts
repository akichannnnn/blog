import { Api } from './network.ts';
import type { Obj } from './types.ts';
import { API, fmt } from './utils.ts';

export const getRotationMusics = (id: number) =>
  new Api(fmt(API.festival.rotation_musics, { id })).getJson<Obj[]>();
export const getStages = (id: number) => new Api(fmt(API.festival.stages, { id })).getJson<Obj[]>();
