/** 全局设置 */
export interface Settings {
  /** 代理服务器（需要安装 `undici`，未设置时使用 Node 默认行为） */
  proxy?: string;
  /** 超时时间（秒） */
  timeout: number;
}

export const settings: Settings = { timeout: 10 };
