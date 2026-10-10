import { Entity, allUrl } from './entity.ts';
import { NotExistException, ServerNotAvailableError } from './exceptions.ts';
import { Api } from './network.ts';
import type { MiracleTicketExchangeInfo } from './types.ts';
import { API, SERVERS, type ServerName } from './utils.ts';

export const getAll = (index = 5) =>
  new Api(allUrl(API.all.miracleTicketExchanges, index)).getJson<Record<string, MiracleTicketExchangeInfo>>();

export class MiracleTicketExchange extends Entity<MiracleTicketExchangeInfo> {
  protected readonly infoUrl = '';
  protected readonly label = 'Miracle ticket';

  protected override async fetchInfo(): Promise<MiracleTicketExchangeInfo> {
    const info = (await getAll(5))[String(this.id)];
    if (!info) throw new NotExistException(`Miracle ticket ${this.id}`);
    return info;
  }

  async getIds(server: ServerName): Promise<number[]> {
    const ids = (await this.ensureInfo()).ids[SERVERS.indexOf(server)];
    if (!ids) throw new ServerNotAvailableError(`Miracle ticket ${this.id}`, server);
    return ids;
  }
}
