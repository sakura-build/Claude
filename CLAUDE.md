# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

推箱子 (Sokoban) 小游戏，纯前端实现。10 个关卡，难度递增。

## Run

直接双击 `sokoban/index.html` 在浏览器中打开即可运行，无需构建或安装依赖。

## Architecture

- 单文件架构：`sokoban/index.html` 包含 HTML + 内嵌 CSS + 内嵌 JS，自包含独立运行
- 地图用 2D 字符数组存储，运行时分离静态地形 (`baseMap`) 和动态实体 (`player`, `boxes`, `targets`)
- CSS Grid 渲染游戏面板，Set 结构做 O(1) 实体查找
- 关卡数据存储在 `LEVELS` 数组中，每项含 `name` 和 `map`（字符串数组）

## Level Format

关卡字符编码：
- `#` = 墙壁（不可通行）
- ` ` = 地板（可行走）
- `.` = 目标点（箱子需推到此处）
- `$` = 箱子（玩家可推动）
- `@` = 玩家起始位置
- `*` = 箱子已在目标上（预置，可选）
- `+` = 玩家已在目标上（预置，可选）

添加新关卡：在 `LEVELS` 数组中追加 `{ name, map }` 对象，确保箱子数 = 目标点数。

## Key Bindings

| 按键 | 操作 |
|------|------|
| ↑↓←→ / WASD | 移动玩家 |
| R | 重置当前关卡 |
| N | 通关后进入下一关 |

## Level List

| 关卡 | 名称 | 箱子数 | 难度 |
|------|------|--------|------|
| 1 | 入门 | 3 | ⭐ |
| 2 | 直推 | 2 | ⭐ |
| 3 | 并排 | 3 | ⭐⭐ |
| 4 | 分列 | 4 | ⭐⭐ |
| 5 | 绕路 | 3 | ⭐⭐⭐ |
| 6 | 岔路 | 4 | ⭐⭐⭐ |
| 7 | 密室 | 4 | ⭐⭐⭐ |
| 8 | 迷阵 | 5 | ⭐⭐⭐⭐ |
| 9 | 困斗 | 5 | ⭐⭐⭐⭐ |
| 10 | 大师 | 6 | ⭐⭐⭐⭐⭐ |
