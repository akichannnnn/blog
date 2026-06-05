# afdian-auth (Cloudflare Worker)

爱发电 OAuth 登录 + 赞助订阅验证，部署在 Cloudflare Workers，绑定 `api.akich.io`。

与 `comment.akich.io`（Waline 评论）无关；博客本体仍是 GitHub Pages 静态站。

## 路由

| 路径 | 方法 | 说明 |
|------|------|------|
| `/login` | GET | 跳转爱发电 OAuth 授权页 |
| `/callback` | GET | OAuth 回调，验证订阅，写入会话 Cookie |
| `/verify` | GET | 前端检查登录与赞助状态 |
| `/logout` | POST | 退出登录 |
| `/health` | GET | 健康检查 |

## 部署

```bash
cd workers/afdian-auth
npm install
npx wrangler login

# 设置敏感凭证（不要写进 wrangler.toml）
npx wrangler secret put AFDIAN_CLIENT_ID
npx wrangler secret put AFDIAN_CLIENT_SECRET
npx wrangler secret put AFDIAN_API_USER_ID
npx wrangler secret put AFDIAN_API_TOKEN
npx wrangler secret put JWT_SECRET

npm run deploy
```

非敏感配置在 `wrangler.toml` 的 `[vars]`：`PUBLIC_BASE_URL`、`ALLOWED_ORIGINS`、`COOKIE_DOMAIN`、`AFDIAN_PLAN_ID`。

## 爱发电 OAuth 配置

在 [OAuth 应用](https://afdian.com/p/9c65d9cc617011ed81c352540025c377)：

- 回调地址：`https://api.akich.io/callback`
- 可信域名：`api.akich.io`

## 本地开发

```bash
cp .dev.vars.example .dev.vars   # 填写凭证
npm run dev
```

## Cookie 跨子域

`COOKIE_DOMAIN=.akich.io` 让 `akich.io` 能读取 `api.akich.io` 写入的登录 Cookie。
两者同属 `akich.io`，`SameSite=Lax` 下跨子域 fetch 会携带 Cookie。
