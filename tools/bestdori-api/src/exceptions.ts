export class BestdoriException extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = new.target.name;
  }
}

function withKwargs(msg: string, kwargs?: Record<string, unknown>): string {
  return kwargs && Object.keys(kwargs).length > 0 ? `${msg}: ${JSON.stringify(kwargs)}` : `${msg}。`;
}

export class RequestException extends BestdoriException {
  readonly api: string;
  constructor(api: string, msg = 'No error code received.', kwargs?: Record<string, unknown>) {
    super(`An error occured while sending request to Bestdori '${api}': ${withKwargs(msg, kwargs)}`);
    this.api = api;
  }
}

export class NoContentTypeError extends RequestException {
  constructor(url: string) {
    super(url, `没有获取到 ${url} 的 ContentType`);
  }
}

export class AssetsException extends BestdoriException {
  constructor(msg: string, kwargs?: Record<string, unknown>) {
    super(`An error occured while requesting for assets: ${withKwargs(msg, kwargs)}`);
  }
}

export class AssetsNotExistError extends AssetsException {
  constructor(assetName: string) {
    super(`Assets ${assetName} may not exist.`);
  }
}

export class HTTPStatusError extends BestdoriException {
  readonly response: Response;
  constructor(response: Response) {
    super(`HTTP status code error: ${response.status} while requesting ${new URL(response.url).pathname}`);
    this.response = response;
  }
  get statusCode(): number {
    return this.response.status;
  }
}

export class RequestInvalidError extends RequestException {
  constructor(api: string, kwargs?: Record<string, unknown>) { super(api, 'Request Invalid.', kwargs); }
}
export class LoginRequiredError extends RequestException {
  constructor(api: string, kwargs?: Record<string, unknown>) { super(api, 'Login Required.', kwargs); }
}
export class CredentialsInvalidError extends RequestException {
  constructor(api: string, kwargs?: Record<string, unknown>) { super(api, 'Credentials Invalid.', kwargs); }
}
export class UserInvalidError extends RequestException {
  constructor(api: string, kwargs?: Record<string, unknown>) { super(api, 'User Invalid.', kwargs); }
}
export class AlreadyUploadedError extends RequestException {
  constructor(api: string, kwargs?: Record<string, unknown>) { super(api, 'Already Uploaded.', kwargs); }
}
export class PostInvalidError extends RequestException {
  constructor(api: string, kwargs?: Record<string, unknown>) { super(api, 'Post Invalid.', kwargs); }
}

/** 某 id 指定的资源不存在 */
export class NotExistException extends BestdoriException {
  constructor(src: string) { super(`${src} is not exist.`); }
}

export class PlayerNotExistError extends NotExistException {
  constructor(server: string, id: number) {
    super(`Player ${id} in server '${server}'`);
  }
}

export class ServerNotAvailableError extends BestdoriException {
  constructor(name: string, server: string) {
    super(`${name} is not available in server '${server}'.`);
  }
}

export class NoDataException extends BestdoriException {
  constructor(src: string) { super(`Cannot get ${src} data.`); }
}

export class SettingsException extends BestdoriException {}

export const REQUEST_EXCEPTION: Record<string, new (api: string, kwargs?: Record<string, unknown>) => RequestException> = {
  REQUEST_INVALID: RequestInvalidError,
  LOGIN_REQUIRED: LoginRequiredError,
  CREDENTIALS_INVALID: CredentialsInvalidError,
  USER_INVALID: UserInvalidError,
  ALREADY_UPLOADED: AlreadyUploadedError,
  POST_INVALID: PostInvalidError,
};
