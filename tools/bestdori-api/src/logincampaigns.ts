import { Entity, allUrl } from './entity.ts';
import { ServerNotAvailableError } from './exceptions.ts';
import { Api } from './network.ts';
import type { LoginCampaignInfo, Obj } from './types.ts';
import { API, ASSETS, SERVERS, firstName, fmt, type ServerName } from './utils.ts';

export const getAll = (index: 0 | 1 | 5 = 5) =>
  new Api(allUrl(API.loginCampaigns.all, index)).getJson<Record<string, Obj>>();

export class LoginCampaign extends Entity<LoginCampaignInfo> {
  protected readonly infoUrl = fmt(API.loginCampaigns.info, { id: this.id });
  protected readonly label = 'LoginCampaign';
  protected override readonly commentCategory = 'LOGINCAMPAIGN_COMMENT';

  async getBackground(server: ServerName): Promise<Uint8Array> {
    const info = await this.ensureInfo();
    const name = info.assetBundleName[SERVERS.indexOf(server)];
    if (name == null) throw new ServerNotAvailableError(`LoginCampaign '${firstName(info.caption)}'`, server);
    return new Api(fmt(ASSETS.event.loginbouns, { server, asset_bundle_name: name })).getBytes();
  }
}
