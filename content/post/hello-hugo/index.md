---
title: "你好，Hugo！"
date: 2026-06-04
description: "PureSuck 主题的 Hugo 重制版演示文章。"
categories: ["随笔"]
tags: ["Hugo", "CSS"]
cover: /covers/hello-hugo.webp
coverCard: 2204
---


## 短代码

{{< alert type="green" >}}这是一个绿色提示。{{< /alert >}}

{{< window type="yellow" title="警告窗口" >}}这是一个信息窗口。{{< /window >}}

{{< collapse "点击展开" >}}折叠内容{{< /collapse >}}

## 代码

```js
const greet = (name) => `Hello, ${name}`;
console.log(greet('Hugo'));
```

### 表格

| 特性 | 实现 |
| --- | --- |
| 页面切换 | View Transitions |
| 进度条 | scroll-driven animations |

> 引用块的样子。

---

结尾。
