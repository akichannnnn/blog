---
title: "test"
description: "Payment test article"
date: 2026-06-05
categories: ["技术"]
tags: ["Hugo", "博客"]
comments: true
toc: false
sponsor: true
sponsor_message: "该文章需要コース１等级的赞助。"
---


<!--more-->

## 第一章：项目结构

一个典型的 Hugo 博客项目包含以下目录：

- `content/` — 所有文章内容
- `layouts/` — 自定义模板覆盖
- `assets/` — SCSS、JS 等需处理的资源
- `config/` — 站点配置
- `static/` — 直接复制的静态文件

## 第二章：布局系统

Hugo 的布局查找顺序是：项目 `layouts/` → 主题 `layouts/`。这意味着你可以在不修改主题源码的情况下，精确覆盖任意模板。

对于赞助内容，我们覆盖了 `content.html` 模板：当 `sponsor: true` 时，只渲染 `<!--more-->` 之前的试读内容，并在文末展示赞助墙。用户通过爱发电 OAuth 登录后，后端会查询 [query-sponsor API](https://guide.afdian.com/creator/developer) 验证订阅状态，验证通过后前端自动解锁全文。

## 第三章：安全注意事项

纯静态站点无法在构建时验证用户身份，因此采用「试读 + 爱发电 OAuth 验证 + 前端解锁」的方案：

1. 试读内容写在 `<!--more-->` 之前
2. 全文存放在 `<template>` 标签中，仅对通过验证的用户展示
3. RSS 和搜索索引已做保护，不会泄露全文

## 总结

通过 front matter 标记 + 爱发电 OAuth + 赞助墙 UI，你可以在 Hugo 博客中实现赞助内容解锁。配合 [爱发电开发者 API](https://guide.afdian.com/creator/developer) 和 [OAuth2 授权](https://guide.afdian.com/creator/oauth2)，即可验证用户是否有有效订阅。
