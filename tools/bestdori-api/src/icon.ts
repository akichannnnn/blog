import { Api } from './network.ts';
import { RES, fmt, type ServerName } from './utils.ts';

export const getBand = (id: number) => new Api(fmt(RES.icon.svg, { name: `band_${id}` })).getBytes();
export const getServer = (server: ServerName) => new Api(fmt(RES.icon.svg, { name: server })).getBytes();
