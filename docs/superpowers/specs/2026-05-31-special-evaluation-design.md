# 专题测评课件类型 设计文档

## 1. 背景

forge 当前支持两种课件类型：

| kind | 用途 | 关键产物 |
|---|---|---|
| `normal`（缺省） | 预习 / 正课 | `<cid>_LessonZK` + `LessonZK.js` |
| `homework` | 作业 | `<cid>_LessonHW` + `LessonHW.js` |

新增第三种课件类型「专题测评」（Special Evaluation），其编辑器内部行为跟作业完全一致（单关卡、无预习区、ChoiceBox / KlInputBox / DragViewBox 自动判定），仅在导出层有三处差异：

1. `config.json` 去掉 `newEva: 1`
2. `config.json` 的 `classify` 由 `'homeworkOnline'` 改为 `'sEvaluation'`
3. 导出的 `Game{N}.ts` 类声明追加 `implements com.biz.ui.ISevaluation`

此外，工程产物目录后缀 / 主入口 JS 文件名按线上 `sys_config.json` 的 sse 规则定为 `_LessonSSEVALUATION` / `LessonSSEVALUATION.js`。

---

## 2. 决策对齐

| 决策点 | 选定方案 |
|---|---|
| 工程后缀 / 主入口 JS | `_LessonSSEVALUATION` + `LessonSSEVALUATION.js`（与生产 sys_config 对齐） |
| `Course.kind` 字段 | 扩成 `'normal' \| 'homework' \| 'sEvaluation'` |
| 专题测评 ID 校验 | 强制必须包含 `_sse_` 子串 |
| ID 字符集 | 放宽为 `/^[a-zA-Z0-9_-]+$/`，对三类课件统一允许连字符 `-` |
| 编辑器中间产物目录 | 复用 `Game1_HW`，不引入新的 `Game1_SSE` 模板（模板内容 100% 相同，仅最终输出阶段改名） |
| 标题文案 | 三态：「关卡」/「作业关卡」/「专题测评关卡」 |
| sys_config.json | **无需修改**，已有 `common.sse` 配置和 `path_rules` 规则 |

---

## 3. 架构

### 3.1 关键洞察

「专题测评」与「作业」在编辑器内部模型层完全同构：

- 关卡结构都是单关卡（`stages[i].subPages[0]`），无预习区
- 元素行为、自动判定、game_hw 命名空间、`Game1_HW.zip` 工程模板全部共享
- 区别仅出现在**导出阶段最末三处**：config.json 的两个字段、scene ts 的类声明、最终输出目录名 / 主入口 JS 名

因此设计原则是：**复用作业的全部代码路径，仅在三处显式分流；魔法字符串 `_LessonHW` / `LessonHW` 抽到一对小工具函数，所有引用统一走它**。

### 3.2 新增工具模块

`src/utils/courseKind.ts`（新建）：

```ts
import type { Course } from '../types';

export type CourseKind = NonNullable<Course['kind']>;

/** 单关卡课件类型（无预习、无小关卡）—— 作业 + 专题测评 */
export function isFlatLesson(kind?: CourseKind): boolean {
  return kind === 'homework' || kind === 'sEvaluation';
}

/** 项目目录后缀，决定 esBuild / preview-server lessons/ 下的目录名 */
export function lessonSuffix(kind?: CourseKind): string {
  if (kind === 'homework') return '_LessonHW';
  if (kind === 'sEvaluation') return '_LessonSSEVALUATION';
  return '_LessonZK';
}

/** 主入口 JS 文件名（不含 .js）/ Main 类名 */
export function mainClassName(kind?: CourseKind): string {
  if (kind === 'homework') return 'LessonHW';
  if (kind === 'sEvaluation') return 'LessonSSEVALUATION';
  return 'LessonZK';
}
```

`electron/main.cjs` 是 CommonJS、不能 import TS。在 `main.cjs` 顶部本地复制等价的两个函数（4 行 / 函数）。
`vite.config.ts` 同理，在文件顶部本地定义 `lessonSuffix`，避免引入跨模块构建依赖。

### 3.3 数据流

```
Course.kind: 'normal' | 'homework' | 'sEvaluation'
            │
            ├── 编辑器 UI 层
            │   ├── CreateProjectDialog: 三选一 + 校验 + placeholder
            │   ├── PageList: isFlatLesson(kind) 控制结构（合并 homework/sEvaluation）
            │   ├── ElementToolbar: isFlatLesson(kind) 控制组件库可见性
            │   └── SaveAsDialog: 按 kind 校验 ID 后缀
            │
            └── 导出层
                ├── exportProject 入口: isFlat 走作业分支
                │   ├── generateHomeworkSceneTs(kind): kind==='sEvaluation' 时类声明追加 implements
                │   └── buildHomeworkConfigJson(kind): kind==='sEvaluation' 时 classify=sEvaluation 且去 newEva
                ├── compile-build IPC: kind 透传 → lessonSuffix / mainClassName 决定输出目录与主入口
                └── vite middleware: lessonSuffix 决定 preview-server lessons/ 目录命名
```

---

## 4. 详细变更点

### 4.1 类型 / 接口

| 文件 | 变更 |
|---|---|
| `src/types/index.ts` | `Course.kind` 类型加 `'sEvaluation'` |
| `src/types/electron.d.ts` | `compileBuild` 参数 `kind` 类型同步 |

### 4.2 编辑器 UI

| 文件 | 变更 |
|---|---|
| `src/components/CreateProjectDialog.tsx` | `kind` state 改三态；新增「专题测评」radio；placeholder 三态分流（normal=`s8_v8_01` / homework=`s8_v8_01_hw` / sEvaluation=`s8_sse_v8_1-4`）；ID 正则放宽为 `/^[a-zA-Z0-9_-]+$/`；homework 校验 `_hw` 结尾、sEvaluation 校验 `_sse_` 子串；`onConfirm` 类型扩展 |
| `src/components/StartPage.tsx` | `handleCreateConfirm` 签名同步 |
| `src/components/Toolbar.tsx` | `handleCreateConfirm` 签名同步；`isHomework` 替换为 `isFlatLesson`；preview 按钮可见性按 `isFlat` 判断；`<SaveAsDialog>` props 由 `isHomework=` 改为 `kind=` |
| `src/components/SaveAsDialog.tsx` | props 由 `isHomework: boolean` 改 `kind: CourseKind`；placeholder + 校验逻辑跟 CreateProjectDialog 对齐（含 `_sse_` 校验） |
| `src/components/PageList.tsx` | 11 处 `isHomework` 替换为 `isFlat = isFlatLesson(kind)`；标题文案三态：`kind==='homework' ? t('homeworkStages') : kind==='sEvaluation' ? t('sEvaluationStages') : t('pages')` |
| `src/components/ElementToolbar.tsx` | 5 处 `isHomework` 替换为 `isFlat` |
| `src/utils/electronFs.ts` | `createProjectInDirectory` 第三个参数 `kind` 类型扩展 |
| `src/utils/checkResourceReady.ts` | `stageKind` 取值加 `'sEvaluation'`；`RESOURCE_STAGE_KIND_LABEL` 加 `sEvaluation: '专题测评'`；`collectFrom` 内的 `course.kind === 'homework'` 三元改为按 kind 三态分流 |

### 4.3 i18n

`src/i18n/translations.ts` 中、英两份各加：

| key | zh-CN | en-US |
|---|---|---|
| `courseTypeSEvaluation` | `专题测评` | `Special Evaluation` |
| `courseIdMustContainSse` | `专题测评课件ID必须包含 _sse_` | `Special Evaluation course ID must contain _sse_` |
| `sEvaluationStages` | `专题测评关卡` | `Special Evaluation Stages` |

### 4.4 导出层

`src/utils/exportProject.ts`：

| 位置 | 变更 |
|---|---|
| [1694] `exportProject` 入口 | `const isHomework = course.kind === 'homework'` → `const isFlat = isFlatLesson(course.kind); const isSEvaluation = course.kind === 'sEvaluation';` |
| [1714] 主分支条件 | `if (isHomework)` → `if (isFlat)`，分支内部所有 `game_hw`、`Game1_HW.zip`、`Game1_HW` 路径**保持不变**（共用模板与命名空间） |
| [1726] | `buildHomeworkConfigJson(baked, resourceMap, imageSizes)` 增加第 4 参数 `course.kind` |
| [1742] | `generateHomeworkSceneTs(name, scenePage, resourceMap, varAssignment)` 增加第 5 参数 `course.kind` |
| [1923] preview 关卡导出条件 | `if (!isHomework && ...)` → `if (!isFlat && ...)` |
| [1145] `generateHomeworkSceneTs` 函数 | 加 `kind: CourseKind` 参数；`extends ui.game_hw.${sceneName}UI` 后按 `kind === 'sEvaluation'` 追加 `implements com.biz.ui.ISevaluation` |
| [1487] `buildHomeworkConfigJson` 函数 | 加 `kind: CourseKind` 参数；末尾 return 对象按 `kind === 'sEvaluation'` 分流：sEvaluation 删 `newEva`，`classify: 'sEvaluation'` |

`generateHomeworkSceneTs` 类声明示例：

```ts
// homework
export default class Game1 extends ui.game_hw.Game1UI {
// sEvaluation
export default class Game1 extends ui.game_hw.Game1UI implements com.biz.ui.ISevaluation {
```

`buildHomeworkConfigJson` 返回值差异：

```ts
// homework（保持不变）
{ pages, release: 'dev', newEva: 1, classify: 'homeworkOnline', isSound: false, feedback }
// sEvaluation
{ pages, release: 'dev', classify: 'sEvaluation', isSound: false, feedback }
```

### 4.5 dev 服务器 / Electron 主进程

`vite.config.ts`：

| 位置 | 变更 |
|---|---|
| 顶部 | 本地定义 `function lessonSuffix(kind)`（4 行） |
| [71] `serveCourseFile` | 正则扩展为 `/([^/]+_Lesson(?:ZK\|HW\|SSEVALUATION))/` |
| [74] | `_Lesson(ZK\|HW\|SSEVALUATION)$` |
| [169]、[231] | `kind === 'homework' ? '_LessonHW' : '_LessonZK'` 三元改为 `lessonSuffix(kind)` |

`electron/main.cjs`：

| 位置 | 变更 |
|---|---|
| 顶部 | 本地定义 `lessonSuffix`、`mainClassName` 两个函数 |
| [747] `jsName` | 三元改为 `mainClassName(kind)` |
| [950] `suffix` | 三元改为 `lessonSuffix(kind)` |
| Main.ts 模板 | `class ${jsName}` 调用处保持不变（`jsName` 已切换为 `LessonSSEVALUATION`） |

### 4.6 部署侧（preview-server/sys_config.json）

**无需修改**。`preview-server/sys_config.json` 已有完整配置：

1. **`common.sse` 兜底配置**（第 91-95 行）：
   ```json
   "sse": {
       "name": "阶段测评",
       "type": "sse",
       "proj_name_format": "${CID}_LessonSSEVALUATION"
   }
   ```

2. **`path_rules` 路径规则**（第 104、111 行）：
   ```json
   "^s${1}_sse${2}_${3}_": "lessons/Math/SPECIAL_EVALUATION/${3:uppercase}/S${1}/${PROJ_NAME}",
   "^L${1}_sse${2}_${3}_": "lessons/Math/SPECIAL_EVALUATION/${3:uppercase}/L${1}/${PROJ_NAME}"
   ```

3. **`test_` 万能兜底**（第 116 行）：
   ```json
   "test_": "lessons/${PROJ_NAME}"
   ```

这三项配置已能覆盖所有专题测评课件 ID 场景（包括 `test_<tid>_s8_sse_v8_1-4` 和裸 `s8_sse_v8_1-4`）。

### 4.7 GameLoader / sdk_baiya runtime

无需改动：
- `GameLoader.max.js` 解析 fullName 末尾 `_LessonXX` 得到 mainClsName，三种后缀均自然兼容
- `getSimpleCid(cid)` 仅对 `_hw` / `_preview` 后缀剥离，sEvaluation 的 cid 不带这些后缀，原值返回 ✓
- sdk_baiya 内部用 `classify === 'sEvaluation'` 选 sEvaluation 视图工厂、用 `Laya.__typeof(page, 'com.biz.ui.ISevaluation')` 校验场景类——这两点正好对应导出层加的两处差异

---

## 5. 校验规则汇总

| 课件类型 | ID 正则 | 额外校验 |
|---|---|---|
| normal | `/^[a-zA-Z0-9_-]+$/` | — |
| homework | `/^[a-zA-Z0-9_-]+$/` | 必须以 `_hw` 结尾 |
| sEvaluation | `/^[a-zA-Z0-9_-]+$/` | 必须包含 `_sse_` 子串 |

---

## 6. 风险盘点

| 风险 | 等级 | 处置 |
|---|---|---|
| sdk_baiya 除 classify / ISevaluation 外可能还有其他测评配置依赖（EvaModel.data、submitAnswerAPI 等） | 中 | 先按已知三处差异实现并实测预览；若实测发现额外字段需求再补 |
| 连字符 `-` 全链路放行 | 低 | 已扫查：路径合法、`var` 名生成会替换非法字符、不用 cid 做 JS 标识符，无副作用 |
| 现有 homework 课件向后兼容 | 低 | `Course.kind` 字段语义不变，`_LessonHW` / `LessonHW` 路径不变，仅新增 sEvaluation 取值 |

---

## 7. 不在本次范围

- 专题测评的特有元素（如倒计时、提交按钮、答题卡等）— 当前阶段仅打通基础发布链路，复用作业的元素集
- sdk_baiya 测评模式相关的 EvaModel.data 配置（如题目分值、submitAnswerAPI 等）—— 等实测确认是否需要再扩
- 模板 zip `Game1_SSE.zip`—— 不引入，复用 `Game1_HW.zip`
