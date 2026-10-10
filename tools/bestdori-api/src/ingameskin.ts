import { Api } from './network.ts';
import { ASSETS, fmt, type ServerName } from './utils.ts';

export type NoteSkinAsset = keyof typeof ASSETS.noteskin;

export const getNoteskin = (type: number, name: NoteSkinAsset, server: ServerName) =>
  new Api(fmt(ASSETS.noteskin[name], { server, type })).getBytes();
