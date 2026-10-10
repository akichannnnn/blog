import { Api } from './network.ts';
import { ASSETS, fmt, type ServerName } from './utils.ts';

/** 卡牌缩略图 */
export const getChara = (
  id: number,
  resourceSetName: string,
  type: 'normal' | 'after_training',
  server: ServerName,
) =>
  new Api(
    fmt(ASSETS.thumb.chara, { server, id: Math.floor(id / 50), resource_set_name: resourceSetName, type }),
  ).getBytes();

/** 称号资源 */
export const getDegree = (degreeName: string, server: ServerName) =>
  new Api(fmt(ASSETS.thumb.degree, { server, degree_name: degreeName })).getBytes();

/** 服装图标 */
export const getCostume = (id: number, assetBundleName: string, server: ServerName) =>
  new Api(
    fmt(ASSETS.thumb.costume, { server, id: Math.floor(id / 50), asset_bundle_name: assetBundleName }),
  ).getBytes();
