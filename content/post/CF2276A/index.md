---
title: "Codeforces 2276 A - Perfect Sandwiches"
date: 2026-10-15 5:00:00 +0900
description: "Codeforces 2276 A - Perfect Sandwiches 题解"
categories: ["CF"]
tags: ["Codeforces", "题解"]
cover: /covers/CF2276A.webp
coverCard: 2536
---

### 题目链接
[Codeforces 2276 A - Perfect Sandwiches](https://codeforces.com/contest/2276/problem/A)

## 题目描述

Monocarp 有 \(a\) 片奶酪和 \(b\) 片香肠。他想用它们为朋友制作尽可能多的三明治。

Monocarp 非常节俭，因此制作三明治时必须恰好用完全部 \(a\) 片奶酪和全部 \(b\) 片香肠，不能有剩余。此外，制作三明治需要满足以下规则：

- 每个三明治至少包含一片奶酪和一片香肠；
- 每一片奶酪和每一片香肠都必须恰好放入一个三明治中；
- 对于每个三明治，其中奶酪片的数量必须严格大于香肠片的数量。

请帮助 Monocarp 求出最多能制作多少个三明治；如果无法按照规则分配所有食材，输出无法完成。

### 输入

第一行包含一个整数 \(t\)（\(1 \le t \le 10^4\)），表示测试用例的数量。

每个测试用例只有一行，包含两个整数 \(a\) 和 \(b\)（\(1 \le a,b \le 100\)），分别表示奶酪片和香肠片的数量。

### 输出

对于每个测试用例，输出一个整数：能够制作的三明治的最大数量。若无法按规则分配所有食材，则输出 `-1`。

### 示例

输入：

```text
3
6 4
5 1
4 5
```

输出：

```text
2
1
-1
```

### 说明

第一个测试用例中，可以制作 2 个三明治。例如每个三明治都使用 3 片奶酪和 2 片香肠。

第二个测试用例中，可以用 5 片奶酪和 1 片香肠制作 1 个三明治。

第三个测试用例中，无法在用完所有奶酪和香肠的前提下制作三明治，因此输出 `-1`。


## 思路
纯数学题，学过数列的1普朗克时间就能解出来。

设做出 $k$ 个三明治。每个至少要有 1 片香肠，且奶酪数量一定大于香肠数量，香肠数量为 $sausage_i$，所以每个三明治至少需要 $sausage_i + 1$ 片奶酪。

对所有的三明治求和：
- 香肠总数： \(\sum_{i=1}^{k} sausage_i = b\)
- 奶酪总数： \(\sum_{i=1}^{k} cheese_i = a\)

并且 $cheese_i \geq sausage_i + 1$，所以：$ a \geq b + k$ 即为 $ k \leq a - b$

然后同时每个三明治至少有一片香肠，所以 \(k \leq b\)。

因此： 

如果 $a - b < 1$（即 $a \le b$），无法分配，输出 $-1$。否则答案是 $\min(a - b,\ b)$。

## 代码
```cpp
#include <iostream>
using namespace std;
 
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
 
    int t;
    cin >> t;
    while (t--) {
        int a, b;
        cin >> a >> b;
        if (a <= b) {
            cout << -1 << '\n';
        } else {
            cout << min(a - b, b) << '\n';
        }
    }
    return 0;
}
```
### 复杂度
时间复杂度：\(O(t)\)

空间复杂度：\(O(1)\)