# DSH–个人 QQ 私聊接入实验

## 分发入口

这是由 Agent 执行、人类配合确认的分发包，脚本不是面向新手的命令教程。

- 人类用户：[用户开始这里](docs/用户开始这里.md)，包含可直接交给 Agent 的启动说明。
- 执行 Agent：先读 [AGENTS.md](AGENTS.md)，再按 [Agent执行手册](docs/Agent执行手册.md) 完成必做步骤、扫码交接和故障恢复。
- 下文保留早期实验记录；部署顺序以新的 Agent 执行手册为准。已有部署先检查和恢复，不重复初始化。

这是指南 R1/R4 的可复现实验仓库。本地和云端的配对用户普通文本私聊自动回复均已通过，用户确认收到；云端验收时本机实验已停止。恢复登录可能要求手机验证，不承诺免干预长期在线。它没有人格、职务、群聊、主动发言、附件处理或模型工具执行。

## 固定环境

- Windows x64；Node 24.21.0；QQ 9.9.36-53644。
- NapCat Shell v4.18.41，来源和 SHA-256 在 `provenance.json`。运行时由使用者下载，不随仓库分发。
- DSH 0.2.1-rc.2。MIT DSH 客户端复用 `qq-bridge` 固定提交，见 `vendor/LICENSE.qq-bridge`。
- 主目录与 `vendor/` 各有独立锁文件；旧 API 客户端必须隔离安装。不要把它加回根依赖。

## Windows 复现顺序

在本仓库运行。下面账号和路径自行替换。PowerShell 的 `-ExecutionPolicy Bypass` 只作用于此子进程，不修改系统策略。

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd ci --prefix vendor --ignore-scripts --no-audit --no-fund
npm.cmd test
node scripts/init-local.mjs <小号QQ号>
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/fetch-napcat.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-napcat.ps1 -QQPath 'D:\你的目录\QQ.exe'
node scripts/napcat-login-status.mjs
```

如果返回“当前账号已登录，无法重复登录”，只退出原客户端的小号，再运行 `node scripts/napcat-login-status.mjs --retry`。本次利用本机已有登录缓存成功进入 ready，没有重新扫码；新机器不能据此保证免扫码。脚本不关闭其他 QQ，也不导出缓存给第三方。

准备独立 DSH：

```powershell
node scripts/setup-dsh.mjs
# 可选：复用自己已有的 DeepSeek 账号登录；仅在实验 DSH 停止时执行
node scripts/import-account.mjs 'C:\Users\你的用户\.dsh'
node scripts/select-account.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-dsh.ps1
node scripts/inspect-dsh.mjs
node scripts/smoke-dsh.mjs
node scripts/probe.mjs
```

没有现成账号登录时，在隔离 DSH 的本机 Web 页中自行登录。启动链接位于 `.local/dsh-home/logs/server-lab.out.log`，含凭据，不分享、不提交。API Key 用户应自行配置隔离 home 的模型凭据并把 `.local/config.json` 的 provider/model 改为实际可调用值。`import-account.mjs` 只复制账号与设备记录，不复制整个 DSH home；隔离副本失效时需重新登录。

确认 `qq-lab-chat` 没有 broken，`no-tools-proof.json` 中 visibleTools=0，固定测试实际收到“DSH本机测试通过”后，再启动桥接：

```powershell
node src/bridge.mjs
```

读取自己 `.local/config.json` 中的一次性 pairingNonce，在主号与小号的好友私聊中发送 `/dsh-pair <nonce>`。口令创建后一小时失效；不要发到群里。配对仅在允许名单为空时有效，成功后写入唯一允许者并删除口令。然后发送 `/dsh 请只回复：QQ私聊接入通过`，确认收到一次回复。

仅 `friend` 私聊、纯文本、指定账号、已配对用户会触发模型；`/dsh ` 为可选前缀，`requirePrefix:true` 可恢复严格命令模式；每次独立会话，无长期聊天记忆。一次只处理一个请求，忙时不排队；不自动重发发送结果不明的消息。最大输入2000字符、回复截断到3000字符。失败只记录事件，不把内部错误回发QQ。

停止桥接用 Ctrl+C；停止实验 DSH 用 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-dsh.ps1`。该脚本核对 PID 与启动时间，不停止其他 DSH。协议端退出前先停桥接。当前未实现无人值守重连/轮转，不作为生产守护服务。

## 已遇到的问题

1. **重复登录**：退出原 QQ 的同一个小号，再请求 QuickLogin；不要杀掉所有 QQ 进程。
2. **DSH 插件互相冲突**：旧 API 客户端和新版 DSH 共用 node_modules，导致 scope 模块分裂、persona 重复注册。把旧客户端依赖移至 `vendor/`，根目录 `npm dedupe --ignore-scripts` 后正常。新环境优先用现有锁文件 `npm ci`。
3. **本地插件 never started**：Windows 文件路径转换成 `file:///` URL 后正常。生成脚本已修正。
4. **入口与端口**：DSH CLI 是 `lib/bin.js`；OneBot HTTP、WS、NapCat 管理页、DSH Web 是四个独立端口（13000、13001、16099、13080）。均绑定127.0.0.1。
5. **执行环境差异**：代理沙箱看不到宿主 QQ/端口时，不能断言未安装或服务未启动；本次在授权宿主上下文验证。

## R4 上云

已找回原服务器，SSH及只读预检通过；已有其他QQ的NapCat/AstrBot和官方Bot，本次小号已在独立容器上线并通过真实私聊验收。详见 [云端预检](docs/云端预检.md)。可在目标服务器执行只读 `bash scripts/cloud-preflight.sh`，确认 OS/架构、Node、磁盘、内存及端口，再选择匹配 Linux/Windows 的 QQ 与 NapCat 发行物。这里下载的是 Windows Shell 包，不能复制到 Linux 直接运行。

云端需同时运行 QQ/NapCat、DSH 与本桥接。不要迁移整台本机的 `.local/` 或整个 `.dsh/`；重新生成接口令牌，由账号持有人完成云端登录。通过 SSH 隧道访问管理页；不开放公网管理/API端口。容器间应使用受控私网地址，不能照抄同机127.0.0.1。云端登录、模型回复、私聊往返、服务重启、重新登录、停止回滚分别验收后，才能标记 R4 完成。

## 入库边界

仅代码、锁文件、脱敏证据、来源许可和文档入库。`.local/`、`.runtime/`、两处 node_modules、登录态、令牌、日志和聊天正文全部忽略。不可直接把整个实验目录压缩后发布；公开包应由 `git archive` 生成并再次检查。

## 实测结论与恢复边界（2026-10-28）

| 路线 | 已通过的范围 | 证据 |
|---|---|---|
| R1 个人号本地 | 配对用户普通文本私聊 → DSH → 原会话自动回复 | 10月27日23:14，链路约1.28秒，用户确认收到 |
| R4 个人号云端 | 本机实验实例已停止，云端独立完成相同私聊链路 | 10月28日00:17:11.138收事件，00:17:13.956发送成功，约2.82秒，用户确认收到 |

两条路线的最小私聊闭环均已跑通。云端模型、桥接为独立systemd服务，QQ为独立容器；原官方Bot和其他QQ/AstrBot保持运行。八项策略/配置回归测试通过，模型实际可见工具数为0。消息内容不写入公开证据。

实际修复包括：同号重复登录、DSH依赖作用域分裂、Windows插件file URL、普通私聊被前缀忽略、配对回写旧模型配置、PowerShell管道CRLF、systemd日志属主及容器重启后的X11锁残留。脚本和固定版本锁文件随源码交付。

**恢复限制**：云端重启曾触发QQ“登录需要手Q验证”。显示锁问题已修复；经用户再次手机确认、核对身份并恢复桥接后，真实私聊通过。尚不能承诺免手机验证自动重登或长期无人值守。开机启动已配置，但服务启动不等于QQ登录就绪。故障时先查登录状态，必要时刷新二维码由账号持有人确认，再通过probe核对账号在线后启动桥接；不重放停机期间的旧消息。

上述耗时仅是这两次短文本的事件至发送回执耗时，不代表安装、扫码耗时或性能保证。群聊、附件、多用户并发与工具执行不在本轮验收范围。
