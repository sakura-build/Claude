# 家庭菜谱小程序

一个专为家庭设计的菜谱管理和点餐微信小程序。

## 功能

- 📖 **菜谱管理**：录入菜谱（名称、分类、封面图、食材、步骤、标签）
- 📝 **家庭点餐**：家人可选择早/中/晚餐点菜，指定日期
- 🛒 **采购清单**：按日期自动聚合所需食材，支持勾选和复制
- 👨‍🍳 **订单管理**：厨师可确认、制作、完成订单

## 开始使用

### 1. 环境准备
- 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号（个人主体即可）
- 在开发者工具中开通云开发

### 2. 配置
1. 用微信开发者工具打开本项目
2. 在 `project.config.json` 中填入你的 AppID
3. 在 `miniprogram/app.js` 中将 `env: 'your-env-id'` 替换为你的云开发环境 ID
4. 在云开发控制台创建以下数据库集合：
   - `recipes`（权限：所有用户可读写）
   - `orders`（权限：所有用户可读写）
5. 右键点击 `cloudfunctions/` 下的每个云函数，选择「上传并部署」

### 3. 运行
- 点击开发者工具的「编译」按钮即可预览
- 点击「预览」生成二维码，手机扫码体验

## 项目结构

```
recipe-miniapp/
├── miniprogram/          # 小程序源码
│   ├── pages/            # 页面（8个）
│   ├── components/       # 组件（3个）
│   └── utils/            # 工具函数
├── cloudfunctions/       # 云函数（3个）
└── project.config.json   # 项目配置
```

## 技术栈

- 微信原生框架（WXML + WXSS + JS）
- 微信云开发（云数据库 + 云函数 + 云存储）
