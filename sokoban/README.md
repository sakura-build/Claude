# 推箱子 Sokoban + 销售数据看板 — 技术文档

---

## 目录

1. [项目概览](#1-项目概览)
2. [推箱子游戏](#2-推箱子游戏)
   - [架构设计](#21-架构设计)
   - [关卡编码规范](#22-关卡编码规范)
   - [数据模型](#23-数据模型)
   - [渲染管线](#24-渲染管线)
   - [移动与碰撞检测](#25-移动与碰撞检测)
   - [胜利判定](#26-胜利判定)
   - [UI 交互](#27-ui-交互)
   - [关卡列表](#28-关卡列表)
3. [销售数据看板](#3-销售数据看板)
   - [架构设计](#31-架构设计)
   - [数据流](#32-数据流)
   - [API 数据契约](#33-api-数据契约)
   - [数据获取层](#34-数据获取层)
   - [KPI 计算引擎](#35-kpi-计算引擎)
   - [图表渲染](#36-图表渲染)
   - [Y 轴自适应算法](#37-y-轴自适应算法)
   - [定时刷新机制](#38-定时刷新机制)
   - [错误与降级策略](#39-错误与降级策略)
   - [UI 组件清单](#310-ui-组件清单)
4. [本地测试环境](#4-本地测试环境)
5. [文件清单](#5-文件清单)

---

## 1. 项目概览

本项目包含两个独立模块，均为纯前端实现，无需构建工具，双击 HTML 即可运行：

| 模块 | 文件 | 功能 | 依赖 |
|------|------|------|------|
| 推箱子游戏 | `index.html` | 10 关 Sokoban 益智游戏 | 无 |
| 销售数据看板 | `sales-chart.html` | 动态销售折线图 + KPI 仪表盘 | Chart.js 4.4.0 (CDN) |

辅助文件：
- `server.js` — 简易 Node.js API 服务器（本地测试用）
- `api-data.json` — Mock 数据文件（被 server.js 读取）

---

## 2. 推箱子游戏

### 2.1 架构设计

```
┌────────────────────────────────┐
│  LEVELS 数组 (关卡数据)         │
│    ↓ parseLevel()              │
│  baseMap[][] + player + boxes  │
│  + targets                     │
│    ↓ 用户按键                  │
│  move(dr, dc) → 碰撞检测       │
│    ↓ render()                  │
│  CSS Grid 渲染 50px 格子       │
│    ↓ checkWin()                │
│  胜利弹窗                      │
└────────────────────────────────┘
```

**核心设计决策：**
- 地形与实体分离：静态 `baseMap`（墙、地板、目标）与动态实体（玩家坐标、箱子数组）分开存储
- 目标点双重身份：目标点既是 `baseMap` 上的 `'.'`，也记录在 `targets[]` 数组中
- Set 结构加速查找：渲染时用 `Set<string>` 做 O(1) 实体查找（key 格式：`"row,col"`）

### 2.2 关卡编码规范

关卡用字符串数组定义，每个字符代表一个格子：

| 字符 | 含义 | 渲染 |
|------|------|------|
| `#` | 墙壁（不可通行） | 🧱 |
| ` ` | 地板（可行走） | 白色空地 |
| `.` | 目标点 | ⭐ |
| `$` | 箱子 | 📦 |
| `@` | 玩家起始位置 | 😎 |
| `*` | 箱子已在目标上（预置） | ✅ |
| `+` | 玩家已在目标上（预置） | 😎 |

**约束：** 每个关卡箱子数 = 目标点数（B=T），否则无解。

### 2.3 数据模型

```javascript
// 全局状态
let baseMap = [];      // string[][] — 静态地形（值：'#' | ' ' | '.'）
let player = { r, c }; // 玩家坐标
let boxes = [];        // { r, c }[] — 箱子坐标数组
let targets = [];      // { r, c }[] — 目标点坐标数组
let steps = 0;         // 当前步数
let won = false;       // 是否已通关

// 关卡索引
let currentLevel = 0;  // 0-based
```

`parseLevel(raw)` 函数逐字符解析关卡字符串数组，填充以上状态。

### 2.4 渲染管线

```javascript
render() {
  1. 计算 cols × rows → 设置 CSS Grid 行列模板
  2. 构建 boxSet = Set("r,c"), targetSet = Set("r,c")
  3. 双重循环遍历每个 (r, c)：
     - 优先级：玩家 > 箱在目标 > 箱 > 墙 > 目标 > 地板
     - 设置对应 CSS class：.player / .box-on-target / .box / .wall / .target / .floor
  4. 更新步数显示
}
```

**Grid 规格：**
- 每格 50×50px
- gap: 0（无缝拼接）
- 每个格子带 `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08)` 微边框区分边界

**Emoji 渲染方案：**
- 墙体 🧱：`font-size: 3.4rem`（大于 50px 格子）+ `overflow: hidden`，无缝填充
- 其他 emoji（📦😎✅⭐）：`font-size: 2.8rem`

### 2.5 移动与碰撞检测

```javascript
move(dr, dc) {
  newPos = player + (dr, dc)

  ① 越界检查：newPos 在网格范围内
  ② 墙壁检查：baseMap[newR][newC] !== '#'
  ③ 箱子检测：boxes.findIndex(新位置是否有箱子)

  有箱子 → 推箱子：
    ④ 箱子目标位置越界检查
    ⑤ 箱子目标位置墙壁检查
    ⑥ 箱子目标位置不能有另一个箱子
    ⑦ 更新箱子坐标 + 玩家坐标 + 步数+1

  无箱子 → 直接移动：
    ⑧ 更新玩家坐标 + 步数+1
}
```

### 2.6 胜利判定

```javascript
checkWin() {
  — 所有箱子坐标 ∈ 目标点坐标集合
  — 满足则 won = true，弹出胜利弹窗
  — 最后一关隐藏「下一关」按钮
}
```

### 2.7 UI 交互

| 操作 | 触发方式 | 行为 |
|------|----------|------|
| 移动 | ↑↓←→ / WASD | 移动玩家，推箱子 |
| 重置 | R 键 / 🔄按钮 | 重新加载当前关卡 |
| 关卡选择 | 下拉框 | 跳转到指定关卡 |
| 下一关 | N 键 / 弹窗按钮 | 通关后进入下一关 |

**键盘事件过滤：** 当焦点在 `<select>`、`<input>`、`<button>` 上时，忽略方向键（避免操作控件时误触移动）。

### 2.8 关卡列表

| # | 名称 | 尺寸 | 箱子=目标 | 难度 |
|---|------|------|-----------|------|
| 1 | 入门 | 7×8 | 3=3 | ⭐ |
| 2 | 直推 | 6×8 | 2=2 | ⭐ |
| 3 | 并排 | 6×8 | 3=3 | ⭐⭐ |
| 4 | 分列 | 5×9 | 4=4 | ⭐⭐ |
| 5 | 绕路 | 7×8 | 3=3 | ⭐⭐⭐ |
| 6 | 岔路 | 8×8 | 4=4 | ⭐⭐⭐ |
| 7 | 密室 | 8×8 | 4=4 | ⭐⭐⭐ |
| 8 | 迷阵 | 7×9 | 5=5 | ⭐⭐⭐⭐ |
| 9 | 困斗 | 8×9 | 5=5 | ⭐⭐⭐⭐ |
| 10 | 大师 | 8×9 | 6=6 | ⭐⭐⭐⭐⭐ |

---

## 3. 销售数据看板

### 3.1 架构设计

```
┌─────────────────────────────────────────────────┐
│                  UI 控制层                       │
│  [端点输入] [间隔选择▼] [🔄刷新]                  │
│  [错误横幅] [KPI卡片×4] [趋势图] [状态指示]       │
├─────────────────────────────────────────────────┤
│                 逻辑层                           │
│  fetchData() → loadData() → updateDashboard()   │
│                  ├─ updateKPICards()             │
│                  │    └─ calcKPIs()             │
│                  └─ updateChart()                │
├─────────────────────────────────────────────────┤
│                 数据源                           │
│  本地 DEFAULT_DATA  ←→  远程 API (fetch)        │
│       (留空)              (输入端点)             │
└─────────────────────────────────────────────────┘
```

**技术栈：**
- Chart.js 4.4.0 — 折线图渲染（CDN 引入）
- Inter 字体 — Google Fonts
- 无其他框架依赖

### 3.2 数据流

```
启动
 ├─ URL 参数 ?api=xxx  → 预填端点输入框
 ├─ 端点为空 → 加载 DEFAULT_DATA → 渲染
 └─ 端点非空 → fetch(端点)
                 ├─ 成功 → 解析 JSON → 渲染
                 └─ 失败 → 显示错误 + 降级 DEFAULT_DATA

定时器触发
 └─ document.hidden? → 跳过
    └─ 否则 → fetch(端点) → 同上

标签页切回 (visibilitychange)
 └─ !document.hidden → 自动刷新一次

手动刷新
 └─ 点击 🔄 → 立即 fetch
```

### 3.3 API 数据契约

**请求：** `GET <endpoint>`

**响应格式：**
```json
{
  "labels": ["2022", "2023", "2024", "2025", "2026"],
  "values": [8, 10, 12, 15, 13],
  "unit": "亿"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `labels` | `string[]` | ✅ | X 轴标签 |
| `values` | `number[]` | ✅ | 对应数值 |
| `unit` | `string` | 否 | 单位，默认 `"亿"` |

**校验规则：**
- `labels` 和 `values` 必须为数组
- 两者长度必须一致
- 长度不足 2 时，CAGR 和 YoY 返回 0

**CORS 要求：** 后端需返回 `Access-Control-Allow-Origin: *`（或匹配的 Origin 白名单）。

### 3.4 数据获取层

```javascript
async function fetchData(apiUrl) {
  — AbortController 实现 5 秒超时
  — fetch() 请求
  — 检查 resp.ok（HTTP 非 2xx 抛错）
  — 验证 JSON 结构（labels/values 存在、数组、长度一致）
  — 返回 { labels, values, unit }
}
```

**超时处理：** 使用 `AbortController` + `setTimeout(5000)`，超时抛出 `'请求超时'` 错误。

### 3.5 KPI 计算引擎

```javascript
function calcKPIs(labels, values, unit) {
  累计销售额 = Σ values               → "58 亿"
  年均复合增长 CAGR = (Vn/V1)^(1/(n-1)) - 1
                  × 100               → "↑ 12.9%" 或 "↓ 3.2%"
  年度峰值 = max(values)               → "15 亿 (2025 年度)"
  同比变化 YoY = (Vn - Vn-1) / Vn-1
              × 100                   → "+18.2%" 或 "-13.3%"
}
```

**边界情况：**
- `n ≤ 1` 时 CAGR 和 YoY 返回 0（分别显示 `↑ 0.0%` 和 `+0.0%`）
- 负增长自动切换 CSS class：`.up`（绿色）/ `.down`（红色）
- `values` 中相同最大值的年份只取第一个

### 3.6 图表渲染

```javascript
updateChart(labels, values, unit) {
  1. 创建渐变填充 (rgba(74,144,217,...) 三层渐变)
  2. 计算 Y 轴范围 (yMin, yMax, stepSize) — 见 3.7
  3. 首次创建 → new Chart(ctx, config)
     已存在  → 更新 data/datasets/options + chart.update('none')
}
```

**Chart.js 配置要点：**

| 属性 | 值 | 说明 |
|------|-----|------|
| `type` | `'line'` | 折线图 |
| `tension` | `0.3` | 平滑曲线 |
| `pointRadius` | `7` | 数据点大小 |
| `fill` | `true` | 区域渐变填充 |
| `animation.duration` | `400` | 动画 400ms |
| `aspectRatio` | `2.1` | 宽高比 |
| `interaction.mode` | `'index'` | 按索引触发 tooltip |

**Tooltip 样式：** 深色半透明背景 `#161b2e`，圆角 10px，显示格式 `{parsed.y} {unit}`。

### 3.7 Y 轴自适应算法

```
输入：values = [v1, v2, ..., vn]

1. dataMin = min(values)
   dataMax = max(values)
   dataRange = dataMax - dataMin (至少为 1)

2. padding = dataRange × 0.4
   上下各留 40% 数据范围的空白

3. yMin = max(0, floor((dataMin - padding) / 5) × 5)
   yMax = ceil((dataMax + padding) / 5) × 5
   对齐到 5 的整数倍

4. yRange = yMax - yMin
   stepSize = yRange ≤ 10 ? 2
            : yRange ≤ 20 ? 5
            : ceil(yRange / 5)
   小范围用 2，中范围用 5，大范围自适应
```

**示例：**

| 数据范围 | yMin | yMax | stepSize | 刻度线 |
|----------|------|------|----------|--------|
| [8, 15] | 5 | 20 | 5 | 5, 10, 15, 20 |
| [92, 98] | 90 | 100 | 2 | 90, 92, 94, 96, 98, 100 |
| [10, 85] | 0 | 105 | 5 | 0, 20, 40, 60, 80, 100 |

### 3.8 定时刷新机制

```javascript
setupRefreshInterval() {
  读取 intervalSelect 的值（秒）
  → 值为 0 → 清除计时器
  → 值 > 0 且有 API 端点 → setInterval(loadData, seconds*1000)

  每次触发前检查 document.hidden → 标签页隐藏时跳过
```

**刷新间隔选项：** 关闭 / 10s / 30s（默认） / 60s / 5min

**标签页可见性：**
```javascript
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && 端点非空) → loadData()
});
```

### 3.9 错误与降级策略

```
            ┌── 端点为空 ──→ 使用 DEFAULT_DATA（本地模式）
启动/刷新 ──┤
            └── 端点非空 ──→ fetch(端点)
                              ├─ 成功 ──→ 渲染数据
                              └─ 失败 ──→ 显示错误横幅
                                          ├─ 显示具体错误信息
                                          ├─ 状态灯变红 🔴
                                          └─ 降级：首次失败用 DEFAULT_DATA
                                             已有旧数据则保留旧数据
```

**错误类型与提示：**

| 错误 | 提示信息 |
|------|----------|
| 网络断开 | `TypeError: Failed to fetch` |
| HTTP 错误 | `HTTP 404` / `HTTP 500` |
| 格式错误 | `数据格式错误：需要 { labels, values }` |
| 长度不一致 | `labels 与 values 长度不一致` |
| 超时 | `请求超时` |

**错误横幅组件：** 显示具体错误 + "已降级使用本地数据" + 重试链接。

### 3.10 UI 组件清单

| 组件 | CSS Class | 说明 |
|------|-----------|------|
| 顶栏 | `.topbar` | flex 两端对齐，标题 + 控件 |
| API 输入框 | `.api-input` | 等宽字体，220px 宽 |
| 间隔选择器 | `.interval-select` | 5 个选项，默认 30s |
| 刷新按钮 | `.btn-refresh` | 加载中 disabled + 半透明 |
| 错误横幅 | `.error-banner` | 红色调，`show` 时显示 |
| KPI 卡片 | `.kpi-card` | 4 列 Grid，顶部彩色渐变条，毛玻璃效果 |
| 图表卡片 | `.chart-card` | 含标题、图例、画布、状态行 |
| 状态指示灯 | `.status-dot` | 🟢 ok / 🔴 error / 🟡 loading |
| 加载态 | `.loading` | KPI 文案脉冲动画，图表半透明 |

**响应式：** `@media (max-width: 640px)` 下 KPI 卡片变为 2 列，顶栏纵向堆叠。

**KPI 卡片配色：**

| 卡片 | 顶部渐变 | 指标 |
|------|----------|------|
| 💰 累计销售额 | `#4a90d9 → #6db3f2` (蓝) | 总值 + 年份范围 |
| 📈 年均复合增长 | `#4ecf8b → #6de8a8` (绿) | CAGR 百分比 |
| 🏆 年度峰值 | `#f5a623 → #f7c56c` (金) | 最大值 + 年份 |
| 📉 同比变化 | `#7c5ce7 → #a78bfa` (紫) | YoY 百分比 + 方向 |

---

## 4. 本地测试环境

### 启动 API 服务器

```bash
node sokoban/server.js
# 输出：API 服务已启动: http://localhost:3456/api/sales
```

服务器特性：
- 纯 Node.js `http` 模块，零依赖
- 端口 3456
- 读取 `api-data.json` 文件返回
- 支持 CORS（`Access-Control-Allow-Origin: *`）
- 请求日志带时间戳
- 修改 JSON 文件后无需重启

### 测试流程

1. `node sokoban/server.js` 启动服务器
2. 双击打开 `sales-chart.html`
3. 在端点输入框输入 `http://localhost:3456/api/sales`
4. 按回车 → 看板从 API 拉取数据
5. 修改 `api-data.json` 中的 `values` → 等待 30 秒或手动刷新 → 图表自动更新
6. `Ctrl+C` 停止服务器 → 看板显示错误 + 降级本地数据

### URL 参数快捷测试

```
sales-chart.html?api=http://localhost:3456/api/sales
```

---

## 5. 文件清单

```
sokoban/
├── index.html          # 推箱子游戏（HTML + CSS + JS 单文件）
├── sales-chart.html    # 销售数据看板（HTML + CSS + JS 单文件）
├── server.js           # 本地 API 测试服务器（Node.js）
├── api-data.json       # Mock API 数据文件
├── CLAUDE.md           # Claude Code 项目指引
└── README.md           # 本技术文档
```
