# forge

VIPThink 课件编辑器 - 基于 sdk_baiya + LayaAir 的所见即所得课件编辑器

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://gz-gitlab.vipthink.cn/wills/forge)
[![Status](https://img.shields.io/badge/status-production%20ready-green.svg)](https://gz-gitlab.vipthink.cn/wills/forge)

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 更新日期：2026-04-27

---

## 📋 项目概述

**forge** 是一个现代化的课件编辑器，用于制作 VIPThink 数学/编程互动课件。

### 核心特性

- ✅ **所见即所得**：编辑器里看到的 = 学生端运行的（Skeleton 动画、自定义皮肤）
- ✅ **40+ 组件支持**：文本、按钮、拖拽、选择、连线、迷宫等交互组件
- ✅ **完整事件系统**：7 种事件 + 8 种动作，支持复杂交互逻辑
- ✅ **资源管理**：自动打包 atlas、hash 版本控制、MD5 去重
- ✅ **三端同步预览**：教师/学生/观察者实时同步
- ✅ **现代开发体验**：React 19 + TypeScript + Vite 8

### 技术栈

- **前端框架**: React 19 + TypeScript 6
- **构建工具**: Vite 8
- **状态管理**: Zustand + Immer
- **样式方案**: Tailwind CSS 4
- **渲染引擎**: sdk_baiya_base.js + LayaAir
- **包管理器**: pnpm 10

---

## 🚀 快速开始

### 快速部署（新环境）

forge 项目已完全自包含，只需 3 步即可运行：

```bash
# 1. 克隆项目
git clone https://gz-gitlab.vipthink.cn/wills/forge.git
cd forge

# 2. 安装依赖
pnpm install

# 3. 启动（一键启动所有服务）
./start.sh
```

访问 http://localhost:6688 即可使用编辑器。

**注意**：
- 如需三端同步预览，需配置 `start.sh` 中的 `SOCKET_DIR` 指向你的 socket_baiya 路径
- 如不需要同步预览，可直接使用 `pnpm dev` 启动编辑器

---

### 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Java**: >= 8（仅同步预览需要）
- **浏览器**: Chrome/Edge >= 90

### 安装依赖

```bash
# 克隆项目
git clone https://gz-gitlab.vipthink.cn/wills/forge.git
cd forge

# 安装依赖
pnpm install
```

### 启动方式

#### 方式 1：使用启动脚本（推荐）

```bash
# 一键启动所有服务（编辑器 + 预览服务 + 同步服务器）
./start.sh

# 停止所有服务
./stop.sh
```

**start.sh 会自动启动**：
- 编辑器（端口 6688）
- 预览服务（端口 8080）
- 同步服务器（端口 9001）

**自定义 socket_baiya 路径**：
```bash
# 方式 1：环境变量
SOCKET_DIR=/path/to/socket_baiya ./start.sh

# 方式 2：修改 start.sh 顶部配置项
# SOCKET_DIR="${SOCKET_DIR:-/Users/wills/code/vipthink/socket_baiya}"
```

#### 方式 2：手动启动

```bash
# 1. 启动编辑器
pnpm dev

# 2. 启动预览服务（新终端）
npx serve preview-server -p 8080

# 3. 启动同步服务器（新终端，可选）
cd /Users/wills/code/vipthink/socket_baiya
java -jar teachingService.jar
```

### 构建生产版本

```bash
# 构建
pnpm build

# 预览构建结果
pnpm preview
```

---

## 🛠️ 脚本说明

### start.sh - 一键启动脚本

**功能**：自动启动编辑器、预览服务、同步服务器

**用法**：
```bash
# 默认启动（使用脚本内配置的 socket_baiya 路径）
./start.sh

# 自定义 socket_baiya 路径
SOCKET_DIR=/path/to/socket_baiya ./start.sh
```

**启动的服务**：
- 编辑器：http://localhost:6688（端口 6688）
- 预览服务：http://localhost:8080（端口 8080）
- 同步服务器：localhost:9001（端口 9001）

**配置项**：
编辑 `start.sh` 第 5 行可修改默认 socket_baiya 路径：
```bash
SOCKET_DIR="${SOCKET_DIR:-/Users/wills/code/vipthink/socket_baiya}"
```

**进程管理**：
- 编辑器 PID 保存在 `.pid`
- 预览服务 PID 保存在 `.preview-pid`
- 同步服务器 PID 保存在 `.socket-pid`

---

### stop.sh - 停止所有服务

**功能**：停止所有由 start.sh 启动的服务

**用法**：
```bash
./stop.sh
```

**停止的服务**：
- 编辑器进程（vite dev server）
- 预览服务进程（serve）
- 同步服务器进程（java）

**清理逻辑**：
1. 读取 PID 文件并 kill 进程
2. 删除 PID 文件
3. 清理残留进程（通过进程名匹配）

---

## 🔧 外部依赖项

### socket_baiya（同步服务器）- 唯一外部依赖

**用途**：三端同步预览（教师/学生/观察者）

**是否必需**：❌ 可选（仅同步预览功能需要）

**获取方式**：
- 内部路径：`/Users/wills/code/vipthink/socket_baiya/`
- 或从团队获取 `teachingService.jar`

**启动方式**：
```bash
cd /path/to/socket_baiya
java -jar teachingService.jar
```

**端口**：默认 9001

**配置方式**：
```bash
# 方式 1：环境变量
SOCKET_DIR=/path/to/socket_baiya ./start.sh

# 方式 2：修改 start.sh
# 编辑第 5 行：SOCKET_DIR="${SOCKET_DIR:-/path/to/socket_baiya}"
```

**说明**：
- start.sh 会自动启动同步服务器（如果路径配置正确）
- 如果不需要同步预览，可以不配置 socket_baiya
- 编辑器和发布预览功能不依赖同步服务器

---

### 内置资源（无需额外配置）

以下资源已包含在 forge 仓库中，**无需额外安装**：

#### 1. GameLoader（课件运行时）

**位置**：`preview-server/`（160MB）

**包含内容**：
- `libs/GameLoader.max.js`（3.0MB）
- `libs/sdk_baiya_base.js`（2.5MB）
- `libs/laya.core.js`、`laya.js` 等 LayaAir 库
- `share/sdk/`（sdk_baiya_math.js 等扩展组件）
- `share/ui/`、`share/fonts/`、`share/sound/` 等资源

**说明**：
- 编辑器导出的课件包自动保存到 `preview-server/lessons/`
- start.sh 会自动启动预览服务（端口 8080）

#### 2. sdk_baiya（组件库）

**位置**：`public/share/sdk/`

**文件**：
- `sdk_baiya_base.js`（2.5MB，基础组件库）
- `sdk_baiya_math.js`（数学专用组件）

**说明**：
- 编辑器通过 `<script>` 标签自动加载
- 组件通过 `window.com.klzz.*` 访问
- 支持 ISyncComp 同步接口

#### 3. 皮肤资源

**说明**：
- 皮肤资源随课件包导出，存放在 `lessons/{course}_LessonZK/game/image/`
- 每个课件包自带皮肤，无需共享皮肤目录
- 编辑器内的 data:image 皮肤会自动转换为文件

---

## 📁 项目结构

```
forge/
├── src/
│   ├── components/          # React 组件（13 个）
│   │   ├── Canvas.tsx       # 画布 + 统一同步 effect
│   │   ├── PropertyPanel.tsx # 属性面板
│   │   ├── ActionEditor.tsx  # 事件动作编辑器
│   │   ├── SkinEditor.tsx    # 皮肤编辑器弹窗
│   │   ├── ElementToolbar.tsx # 组件工具栏
│   │   ├── PageList.tsx      # 页面列表
│   │   ├── Toolbar.tsx       # 顶部工具栏
│   │   └── ...
│   ├── elements/
│   │   └── elementMeta.ts   # 40+ 组件定义
│   ├── store/
│   │   └── editorStore.ts   # Zustand + Immer 状态管理
│   ├── utils/
│   │   ├── laya/            # Laya 桥接层
│   │   │   ├── core.ts      # Laya 访问 + VipThink mock
│   │   │   ├── components.ts # 组件创建 + 皮肤生成
│   │   │   ├── selection.ts  # 选择框 + 拖拽
│   │   │   └── preview.ts    # 预览模式
│   │   ├── export.ts        # 序列化导出 + 发布
│   │   ├── skinGenerator.ts # Canvas API 皮肤生成
│   │   ├── atlasPacker.ts   # atlas 打包器
│   │   └── ...
│   └── types/index.ts       # 类型定义
├── docs/                    # forge 内部技术文档（10 篇 + research 目录）
│   ├── architecture.md      # 架构方案
│   ├── milestones.md        # 12 个里程碑记录
│   ├── review.md            # 完整 Review
│   ├── sdk-baiya-components.md # 50 个组件文档
│   ├── gameloader.md        # GameLoader 启动流程
│   ├── sync-mechanism.md    # 同步机制详解
│   ├── view-architecture.md # 视图架构
│   ├── resource-management.md # 资源管理
│   ├── user-audit.md        # 用户审计
│   ├── i18n-plan.md         # 国际化方案
│   └── research/            # 研究文档（已从上层目录同步）
│       ├── optimal-solution-modern-frontend-sdk.md
│       ├── forge-project-analysis.md
│       ├── ui-sync-export-analysis.md
│       ├── tasks/           # 任务拆解文档
│       └── final/           # 最终方案文档
├── RELEASE.md               # 发布文档

│   ├── index.html           # 入口页面
│   ├── libs/                # LayaAir 引擎（软链接）
│   ├── res/                 # 共享资源（软链接）
│   ├── share/               # sdk_baiya 组件（软链接）
│   ├── lessons/             # 导出的课件包
│   ├── sys_config.json      # 系统配置
│   └── module_config.json   # 模块配置
├── public/
│   ├── share/sdk/           # sdk_baiya 组件库
│   │   ├── sdk_baiya_base.js
│   │   └── sdk_baiya_math.js
│   └── uploads/             # 上传的资源文件
├── server.js                # 开发服务器（上传/发布 API）
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 🎯 核心功能

### 1. 文件管理
- 新建课件（JSON 校验 + 重复 ID 检测）
- 打开课件（从 localStorage）
- 保存课件（2 秒防抖自动保存）
- 导出课件包（finalConfig.json + LessonZK.js）

### 2. 页面管理
- 添加/删除/复制/重命名页面
- 页面排序（拖拽）
- 页面缩略图预览（高质量渲染）
- 删除确认弹窗

### 3. 组件编辑
- 9 个分类 Tab（基础UI/容器/选择/拖拽/连线/迷宫/特效/键盘/媒体）
- 40+ 个 sdk_baiya 组件
- 拖拽添加到画布
- 属性面板动态渲染（9 种字段类型）
- 元素嵌套（parentId + 递归渲染）

### 4. 画布交互
- 选择/多选（Shift+点击/框选）
- 拖拽/缩放/旋转
- 网格吸附（20px 细线 + 100px 粗线）
- 标尺（水平 + 垂直，百分比定位）
- 对齐（6 种）+ 等间距分布（2 种）

### 5. 编组管理
- 编组/取消编组（Ctrl+G / Ctrl+Shift+G）
- 选中整组
- 组删除
- 颜色边框视觉反馈

### 6. 复制粘贴
- 复制/粘贴（Ctrl+C/V）
- 快速复制（Ctrl+D）
- ID 映射 + 引用更新（targetId/parentId）

### 7. 撤销重做
- 50 步历史记录
- Ctrl+Z / Ctrl+Shift+Z

### 8. Action 事件系统
- 7 种事件：onClick/onLoad/onChange/onDrop/onAllRight/onWrong/onComplete
- 8 种动作：toggleVisible/setVisible/setProperty/changePage/playSound/stopSound/resetPage/animate
- 可视化编辑器
- 导出生成正确的 JS 事件绑定代码

### 9. 皮肤体系
- 9 种组件自动生成皮肤（Canvas API）
- 皮肤编辑器弹窗（颜色/圆角/边框 + 6 种预设）
- 实时预览
- 上传 PNG 优先于自动生成

### 10. 资源管理
- 文件上传（图片/音频/视频）
- MD5 去重
- 格式/大小校验
- atlas 打包（Canvas API shelf packing 算法）
- SHA-256 hash 版本控制
- version.json 映射

### 11. 预览模式
- 编辑器内预览（Laya 原生预览）
- 发布预览（导出完整课件包 + GameLoader 运行）
- 同步预览（三角色 WebSocket 同步）

### 12. 快捷键
- Ctrl+C/V/D：复制/粘贴/快速复制
- Ctrl+A：全选
- Ctrl+Z/Shift+Z：撤销/重做
- Ctrl+G/Shift+G：编组/取消编组
- Ctrl+S：保存
- Delete：删除
- 方向键：微调（1px / Shift+10px）

---

## 📖 使用指南

### 创建新课件

1. 点击顶部工具栏 **"文件"** → **"新建课件"**
2. 输入课件 ID（字母数字下划线）
3. 输入课件名称
4. 点击 **"创建"**

### 添加组件

1. 从左侧工具栏选择组件分类
2. 点击组件图标添加到画布
3. 在右侧属性面板编辑属性

### 设置事件动作

1. 选中元素
2. 在属性面板找到 **"事件动作"** 区域
3. 点击 **"添加动作"**
4. 选择事件类型（如 onClick）
5. 选择动作类型（如 changePage）
6. 配置动作参数

### 编辑皮肤

1. 选中按钮类组件
2. 在属性面板找到 **"外观样式"** 区域
3. 点击 **"编辑皮肤"**
4. 调整颜色/圆角/边框
5. 点击 **"应用"**

### 发布课件

1. 点击顶部工具栏 **"发布预览"**
2. 等待打包完成（< 5s）
3. 自动打开 GameLoader 预览窗口
4. 课件包保存在 `preview-server/lessons/` 目录

### 同步预览

1. 启动同步服务器（自动启动）
2. 点击顶部工具栏 **"教师"** 按钮
3. 在其他设备点击 **"学生"** 或 **"观察者"** 按钮
4. 教师端操作会实时同步到学生端

---

## 🔍 输出格式

编辑器导出的课件包结构：

```
LessonXXX/
├── finalConfig.json         # GameLoader 入口配置
├── config.json              # 页面配置（同 finalConfig.json）
├── version_XXX.json         # 资源 hash 映射
├── fileconfig.json          # atlas 映射
├── LessonXXX.js             # 课件主类
├── game/
│   ├── image/               # 图片资源
│   ├── sound/               # 音频资源
│   └── animation/           # 视频/Skeleton 资源
└── res/
    └── atlas/               # 打包的 sprite sheet
        └── game/
            ├── image.atlas  # atlas JSON
            └── image.png    # atlas 图片
```

### finalConfig.json 格式

```json
{
  "isFinalConfig": true,
  "autoRunMain": true,
  "pages": [
    {
      "name": "page0",
      "subviews": [
        {
          "view": "view/game/Page0.ts",
          "classType": "lt"
        }
      ],
      "res": [
        {
          "url": "res/atlas/game/image.atlas"
        },
        {
          "url": "game/image/bg.png",
          "type": "image"
        }
      ]
    }
  ]
}
```

### LessonXXX.js 格式

```javascript
(function () {
    'use strict';
    
    var KlView = com.klzz.ui.KlView;
    var REG = Laya.ClassUtils.regClass;
    
    // Page0UI（UI 类）
    var Page0UI = (function (_super) {
        __extends(Page0UI, _super);
        function Page0UI() { return _super.call(this) || this; }
        Page0UI.prototype.createChildren = function () {
            _super.prototype.createChildren.call(this);
            this.createView(Page0UI.uiView);
        };
        Page0UI.uiView = {
            "type": "KlView",
            "props": { "width": 1920, "height": 1080 },
            "child": [
                {
                    "type": "KlLabel",
                    "props": { "name": "title", "x": 100, "y": 50, "text": "你好" }
                }
            ]
        };
        return Page0UI;
    }(KlView));
    
    // Page0（逻辑类）
    var Page0 = (function (_super) {
        __extends(Page0, _super);
        function Page0() { return _super !== null && _super.apply(this, arguments) || this; }
        Page0.prototype.initView = function (byReset) {
            _super.prototype.initView.call(this, byReset);
            // 事件绑定代码
        };
        return Page0;
    }(ui.game.Page0UI));
    
    // Main
    var Main = function () {
        if (window['GameLoader'] !== undefined) {
            com.biz.VipThink.__init__();
        }
    };
    new Main();
}());
```

---

## 📚 文档索引

### 核心文档
- [架构方案](./docs/architecture.md) - 整体架构、输出格式、重构路径
- [里程碑记录](./docs/milestones.md) - 12 个里程碑详细记录
- [发布文档](./RELEASE.md) - 完整发布文档（功能清单/待验证/已知限制/后续计划）
- [完整 Review](./docs/review.md) - 16 个流程审查 + 问题清单

### 技术文档
- [sdk_baiya 组件文档](./docs/sdk-baiya-components.md) - 50 个组件的属性/方法/事件
- [GameLoader 启动流程](./docs/gameloader.md) - 13 步启动流程、finalConfig 格式
- [同步机制详解](./docs/sync-mechanism.md) - ISyncComp、xpath、TransManager
- [视图架构](./docs/view-architecture.md) - ViewManager/MainView/PageView
- [资源管理](./docs/resource-management.md) - 资源体系、打包方案、皮肤规范
- [用户审计](./docs/user-audit.md) - 用户视角审计（已全部修复）

### 研究文档
- [最优方案](./docs/research/optimal-solution-modern-frontend-sdk.md) - 核心架构方案
- [项目分析](./docs/research/forge-project-analysis.md) - 完整项目分析
- [同步与导出](./docs/research/ui-sync-export-analysis.md) - 同步机制和导出格式
- [tasks/](./docs/research/tasks/) - 任务拆解文档目录
- [final/](./docs/research/final/) - 最终方案文档目录

---

## 🐛 问题排查

### 编辑器无法启动

**问题**：`pnpm dev` 报错

**解决方案**：
1. 检查 Node.js 版本：`node -v`（需要 >= 18）
2. 清除缓存：`rm -rf node_modules && pnpm install`
3. 检查端口占用：`lsof -i :5173` 和 `lsof -i :3000`

### 组件无法添加

**问题**：点击组件图标没有反应

**解决方案**：
1. 检查浏览器控制台是否有错误
2. 确认 `public/share/sdk/sdk_baiya_base.js` 已加载
3. 刷新页面重试

### 皮肤不显示

**问题**：发布后按钮皮肤不显示

**解决方案**：
1. 检查 `game/image/` 目录是否有 `skin_*.png` 文件
2. 检查 `version_XXX.json` 是否包含皮肤路径映射
3. 查看浏览器控制台网络请求是否 404

### 同步预览不工作

**问题**：学生端看不到教师端操作

**解决方案**：
1. 检查同步服务器是否启动：`lsof -i :8081`
2. 查看 `socket_baiya/logs/` 日志文件
3. 确认教师端和学生端连接同一房间（roomid=forge01）

### 发布失败

**问题**：点击"发布预览"报错

**解决方案**：
1. 检查 `preview-server/` 目录是否存在
2. 确认 `preview-server/libs/`、`res/`、`share/` 软链接正确
3. 查看服务器日志：`tail -f server.log`

---

## 🤝 贡献指南

### 开发流程

1. 创建功能分支：`git checkout -b feature/xxx`
2. 开发并测试
3. 提交代码：`git commit -m "feat: xxx"`
4. 推送分支：`git push origin feature/xxx`
5. 创建 Merge Request

### 代码规范

- 使用 ESLint 检查：`pnpm lint`
- 使用 TypeScript 严格模式
- 组件命名：PascalCase
- 函数命名：camelCase
- 常量命名：UPPER_SNAKE_CASE

### 提交规范

遵循 Conventional Commits：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

---

## 📞 联系方式

- **项目地址**: https://gz-gitlab.vipthink.cn/wills/forge
- **问题反馈**: https://gz-gitlab.vipthink.cn/wills/forge/-/issues
- **开发团队**: VIPThink 课件研发组

---

## 📄 许可证

内部项目，仅供 VIPThink 使用。

---

**版本**: v1.0.0  
**发布日期**: 2026-04-27  
**状态**: ✅ 生产就绪
