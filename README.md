# DSH–个人 QQ 私聊接入实验

这是指南 R1/R4 的可复现实验仓库。当前 Windows 小号登录、OneBot 接口、DSH 模型回复分别通过；真实私聊往返及云端验收以 `validation.json` 为准。它是最小文本桥接，没有人格、职务、群聊、主动发言、附件处理或模型工具执行。

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

仅 `friend` 私聊、纯文本、指定账号、已配对用户、显式 `/dsh ` 前缀会触发模型；每次独立会话，无长期聊天记忆。一次只处理一个请求，忙时不排队；不自动重发发送结果不明的消息。最大输入2000字符、回复截断到3000字符。失败只记录事件，不把内部错误回发QQ。

停止桥接用 Ctrl+C；停止实验 DSH 用 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-dsh.ps1`。该脚本核对 PID 与启动时间，不停止其他 DSH。协议端退出前先停桥接。当前未实现无人值守重连/轮转，不作为生产守护服务。

## 已遇到的问题

1. **重复登录**：退出原 QQ 的同一个小号，再请求 QuickLogin；不要杀掉所有 QQ 进程。
2. **DSH 插件互相冲突**：旧 API 客户端和新版 DSH 共用 node_modules，导致 scope 模块分裂、persona 重复注册。把旧客户端依赖移至 `vendor/`，根目录 `npm dedupe --ignore-scripts` 后正常。新环境优先用现有锁文件 `npm ci`。
3. **本地插件 never started**：Windows 文件路径转换成 `file:///` URL 后正常。生成脚本已修正。
4. **入口与端口**：DSH CLI 是 `lib/bin.js`；OneBot HTTP、WS、NapCat 管理页、DSH Web 是四个独立端口（13000、13001、16099、13080）。均绑定127.0.0.1。
5. **执行环境差异**：代理沙箱看不到宿主 QQ/端口时，不能断言未安装或服务未启动；本次在授权宿主上下文验证。

## R4 上云

已找回原服务器，SSH及只读预检通过；已有其他QQ的NapCat/AstrBot和官方Bot，未迁移本次小号。详见 [云端预检](docs/云端预检.md)。可在目标服务器执行只读 `bash scripts/cloud-preflight.sh`，确认 OS/架构、Node、磁盘、内存及端口，再选择匹配 Linux/Windows 的 QQ 与 NapCat 发行物。这里下载的是 Windows Shell 包，不能复制到 Linux 直接运行。

云端需同时运行 QQ/NapCat、DSH 与本桥接。不要迁移整台本机的 `.local/` 或整个 `.dsh/`；重新生成接口令牌，由账号持有人完成云端登录。通过 SSH 隧道访问管理页；不开放公网管理/API端口。容器间应使用受控私网地址，不能照抄同机127.0.0.1。云端登录、模型回复、私聊往返、服务重启、重新登录、停止回滚分别验收后，才能标记 R4 完成。

## 入库边界

仅代码、锁文件、脱敏证据、来源许可和文档入库。`.local/`、`.runtime/`、两处 node_modules、登录态、令牌、日志和聊天正文全部忽略。不可直接把整个实验目录压缩后发布；公开包应由 `git archive` 生成并再次检查。
