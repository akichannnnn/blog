# blog

Hugo 静态博客，部署在 **GitHub Pages**，主题 [Stack](https://github.com/CaiJimmy/hugo-theme-stack)。

## 构建与部署

```bash
hugo --minify
# 将 public/ 推送到 GitHub Pages
```

GitHub Pages 只能托管静态文件，赞助验证的后端逻辑跑在独立的 Cloudflare Worker 上。

## 赞助内容验证

```
akich.io          → GitHub Pages（静态页 + 赞助墙 UI）
api.akich.io      → Cloudflare Worker（爱发电 OAuth + 订阅验证）
comment.akich.io  → Waline 评论（与赞助无关）
```

验证服务代码与部署说明见 [`workers/afdian-auth/`](workers/afdian-auth/README.md)。

博客侧只需在 `config/_default/params.toml` 中配置：

```toml
[sponsor]
auth_api_url = "https://api.akich.io"
```

## 发布赞助文章

```yaml
---
title: "我的文章"
sponsor: true
---

试读内容……

<!--more-->

赞助全文……
```

> 注意：静态站无法在构建时验证身份，全文以 `<template>` 形式随页面下发、验证通过后由 JS 解锁。
> 这能挡住普通读者，但技术用户仍可从源码提取。需要强保护时，应让 Worker 在验证后再返回全文。
