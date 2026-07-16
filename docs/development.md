# 开发环境

本文说明新开发者从获得仓库权限到完成本地运行所需的环境和操作。

## 1. 获取权限

forge 是 GitHub 私有仓库。项目负责人需要在仓库 Settings → Collaborators 中邀请开发者。开发者接受邀请后才能克隆仓库和参与 Issue、PR。

建议为每位开发者使用独立 GitHub 账号，不共享 Token、SSH Key 或本机账号。

## 2. 安装工具

必需环境：

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| Git | 当前稳定版 | 分支与版本协作 |
| Node.js | 22 LTS | Vite、测试和构建 |
| pnpm | 10 | 唯一包管理器 |
| Electron | 由项目依赖安装 | 真实桌面体验 |

推荐通过 Node 版本管理器读取根目录 `.nvmrc`：

```bash
nvm use
corepack enable
pnpm --version
```

不使用 npm 或 yarn安装依赖，不手动修改 lockfile。

## 3. 克隆与安装

```bash
git clone https://github.com/RexYoung000/editor.git
cd editor
pnpm install --frozen-lockfile
```

如果 `--frozen-lockfile` 失败，先判断 `package.json` 与 `pnpm-lock.yaml` 是否不一致，不要直接删除 lockfile 重装。

## 4. 启动开发环境

终端一启动 Vite：

```bash
pnpm dev
```

Vite 默认监听 `0.0.0.0:6688`，同时提供编辑器页面、预览资源、课件动态路由和 `/api/*` 开发接口。

终端二启动 Electron：

```bash
pnpm electron:dev
```

Electron 会要求输入 Vite 地址：

- 同一台电脑调试：`http://localhost:6688`
- 两台电脑调试：`http://<Vite 所在电脑 IP>:6688`

两台电脑模式下应先确认防火墙允许 6688 端口，并从 Electron 所在电脑的浏览器访问 Vite 地址验证连通性。

## 5. 本地素材与课件目录

以下内容不随 Git 仓库分发：

- `public/builtin/library/` 下的大型素材库。
- `public/uploads/` 开发上传内容。
- `preview-server/lessons/` 生成的预览课件。
- 用户本机课程目录、自定义模板目录和发布产物。
- 本地服务凭据、证书和运行缓存。

基础代码、内置 runtime 和自动测试不依赖完整素材库。涉及资源库、组合预设或真实课程验收时，需要从项目负责人获得约定版本的素材库，并放到 `public/builtin/library/`。

不要把本机绝对路径写入代码、Issue、提交或可导出的课程数据。远程 Vite 无法读取 Electron 所在电脑的本机路径。

## 6. AI 开发环境

仓库只维护根目录 `AGENTS.md` 作为统一 AI 规则入口，不针对 Cursor、Codex、Claude Code、Gemini 或 OpenCode 复制规则。

开始任务时应让所用 AI 确认已读取：

1. `AGENTS.md`
2. 当前 GitHub Issue
3. `CONTRIBUTING.md`
4. Issue 对应的专项文档

如果某个工具不能自动读取 `AGENTS.md`，优先在该工具的个人配置中引用它；只有确认团队成员普遍需要时，才在仓库加入只负责引用的薄适配文件。

## 7. 开发前自检

```bash
git status --short --branch
git fetch origin --prune
pnpm test
pnpm build
```

确认当前不在 `main`、工作区没有来源不明的改动，并已使用 Issue 对应分支后再开始实施。

## 8. 常见问题

### 浏览器正常但 Electron 功能不可用

浏览器没有 Electron preload 提供的本地文件 IPC。涉及打开课程、写回文件、复制资源和本地模板时必须用 Electron 测试。

### Electron 提示无法连接服务器

先确认 Vite 正在运行，再检查填写的协议、IP、端口和防火墙。远程设备不能使用 `localhost` 指向另一台电脑。

### 资源库为空

`public/builtin/library/` 默认被 Git 忽略。向项目负责人获取素材库，不要自行把整库提交进代码仓库。

### lint 失败但 test/build 通过

项目仍有已知 lint 存量问题。确认本次改动未新增错误，并在 PR 中如实记录；不要关闭规则或批量改无关文件。
