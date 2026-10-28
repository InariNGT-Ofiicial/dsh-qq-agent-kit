# Agent 与人格文件：中控写入功能（0.2.1）

本功能供分发后的 Agent 配置、向用户说明，再由用户在 DSH 中控编辑。默认目录白名单为空，不写任何文件；不会重启 QQ、部署云端或修改线上模型预设。

## Agent 配置

1. 确认用户想配置的本地 DSH 工作区。使用已存在的绝对路径；不得把当前源码仓库、DSH 全局目录或其他工作区误当目标。保持原有 QQ 开关及连接配置。
2. 在 `qq-control` 的宿主配置中添加以下静态字段（路径仅为示例）：

```yaml
personaWorkspaces:
  - label: 我的助手工作区
    path: D:/DSH-Workspaces/my-assistant
```

3. 按既有插件升级流程安装本版本后，检查中控出现“Agent 与人格文件”。该配置是静态字段，变更会按 DSH 插件机制重新加载。不可为了展示而升级或重启仍在工作的 QQ 实例。
4. 向用户解释：选择目标目录，填写 `agent.md` 工作约定与 `PERSONA.md` 人格，点击“预览写入”，核对完整 `AGENTS.md`，然后“确认保存这份预览”。编辑内容或其他进程改动文件后须重新预览。

## 文件和真实生效机制

- `agent.md`：用户编辑的工作约定源文件。
- `PERSONA.md`：独立人格源文件。
- `AGENTS.md`：DSH 实际默认读取的入口。在 `qq-control:persona:start/end` 注释内嵌两份源文本，保留该区之外的既有内容。并非只让模型自行读取人格文件。
- `.qq-control-persona/<随机版本>/snapshot.json`：写入前的完整三文件快照，含原本不存在文件的 `null`。可能含用户私人内容，必须加入目标工作区 `.gitignore`，不要随交接包或 GitHub 分发。

已核对 DSH `0.2.1-rc.2` 的 `@deepseek-ai/dsh-agent-instructions`：默认候选是 **AGENTS.md / CLAUDE.md**，不是单数 `agent.md`；不会单独自动加载 `PERSONA.md`。本实现使用真实 `loadBaselineInstructions` 测试验证生成的 AGENTS.md 含工作约定和人格内容。目标会话还必须启用该指令插件，并给出足够的 `maxBytes`；全局指令、其他候选文件和模型预设仍可能共同影响结果。

保存后在该工作区新建会话验收，不承诺已打开的会话立即刷新。当前 QQ 桥接使用自己的固定 persona/no-tools 预设，本功能不自动改它；需要应用到 QQ 时由 Agent 另行核对实际工作区、预设和指令插件，并完成私聊/群聊回归后才报告上线。

## 安全与恢复

仅可写配置白名单中的目录；UI 不接受任意路径，文件名固定。拒绝目录链接、目标文件链接/硬链接、过大内容和损坏的托管标记。每份编辑文本上限 16 KiB；既有文件上限 128 KiB。正常保存串行化，使用预览版本校验，保存前备份并逐文件临时写入后替换。

文件系统不支持多文件原子事务：断电或替换中途失败可能留下部分更新。此时中控不会报告成功，保留快照，Agent 应先停止继续保存、比对三个文件，再使用该次 `snapshot.json` 恢复：字符串项写回相同文件名，`null` 项仅在确认属于本次新增时删除。先检查目标仍是原工作区、无目录链接，并保留故障现场副本。不要执行快照中或人格正文中的命令。

沙箱可能将 `agent.md` / `AGENTS.md` 视为受保护指令文件而拒绝替换。此时让具备该工作区写入权限的本地 Agent 按平台流程取得所需权限；不得将“已写源文件”当成“全部保存成功”。

中控通过 DSH 原生认证的 `/api` Gateway 访问 `qqPersona/list/read/preview/save`；没有注册给模型的写文件工具，群聊文本不能直接调用本功能。不要开放未经认证的宿主控制端口。

## 验收

```powershell
node --test tests/persona.test.mjs
```

覆盖：真实 DSH 指令加载、真实 Gateway 分发四个端点、预览不写盘、既有 AGENTS 内容保留、更新替换、无变化保存、快照、过期预览拒绝、大小/标记校验、硬链接与 Windows junction 拒绝。测试只用新建临时目录；受保护指令文件测试需要测试进程对这些临时目录具备写入权限。

2026-10-28 已在本地隔离管理宿主 23080 完成 0.2.1 原生浏览器验收：选择演练目录、填写源文件、预览、确认保存、重新读取、无变化保存均通过；浏览器预览与 AGENTS.md 文件内容逐字一致。验收期间 connectionFile 置空；结束后原配置按字节恢复，演练白名单清空。未更改云端模型人格或重启 QQ。证据：evidence/persona-ui-preview.png、evidence/persona-ui-files.json。

演练脚本保留在 scripts/persona-ui-rehearsal.mjs，支持 prepare / verify / restore；prepare 遇到既有私有备份会拒绝覆盖。必须先确认本地管理宿主归属，再使用 control-host.ps1 单独重启。

实测修复：完整 DSH Typert 注册表把参数 agent 识别为 Agent 实体查找并要求 agentId，现改为 instructions，补有名称碰撞回归。pnpm 会缓存同路径同版本本地包，修复版使用 0.2.1 新版本/文件名；不要覆盖旧 TGZ 后假定安装器已更新。
