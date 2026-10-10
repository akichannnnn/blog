import { Api } from './network.ts';
import type { Obj } from './types.ts';
import { API, fmt } from './utils.ts';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'special';

/** 获取官方谱面（原始 Bestdori 谱面 JSON，未做标准化） */
export const getChart = (id: number, diff: Difficulty = 'expert') =>
  new Api(fmt(API.charts.info, { id, diff })).getJson<Obj[]>();
