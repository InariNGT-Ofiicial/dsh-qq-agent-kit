# QQ 中控与群聊：Agent 执行手册

脚本由 Agent 执行、检查并向人类说明。用户操作界面是 DSH 的「插件 → dsh-qq-control」，不是让新手手改配置。适用 DSH 0.2.1-rc.2、Node 24；插件版本 0.1.3。其他版本先隔离验证。

## 必做：先明确范围

先读主执行手册，保证个人 QQ 私聊及模型已跑通。发现现有实例、端口及 SSH 配置，不重复建账号、复制 QQ 登录态或停止现有私聊。询问具体授权群、是否允许收消息落盘、是否允许自动回复；未授权默认关闭。不要把私聊配对当群授权。

本次实验群已在 2026-10-28 完成真实验收：普通消息只落盘、真正 @ 后回复、无需 @ 自主回复，均有服务事件和人类收件确认。不是分发后环境的验收替代品。

## 必做：独立群 worker

在既有账号主机建立独立源码目录，安装主目录与 vendor 两套锁定依赖。准备现有账号的 `.local/config.json` 路径，worker 通过 `QQ_ACCOUNT_CONFIG` 引用；不复制密钥和登录态。

Linux 示例（变量由 Agent 发现并替换，不能原样执行）：

```bash
node scripts/group-preflight.mjs "$ACCOUNT_CONFIG" "$AUTHORIZED_GROUP"
bash scripts/install-group-worker.sh "$ACCOUNT_CONFIG" "$NODE_PATH"
```

preflight 必须三个布尔值全真。安装脚本只安装 `dsh-qq-control-groups.service`，不启动、不覆盖已有同名服务；检查 unit 和路径后 `sudo systemctl start dsh-qq-control-groups`。验收后若用户要求开机运行，再 `sudo systemctl enable dsh-qq-control-groups`。停群 worker 不停止原 QQ、模型或私聊服务。

Windows 本地运行：在受管进程中设置 `QQ_ACCOUNT_CONFIG` 为既有账号配置，再执行 `node src/group-worker.mjs`，保留 PID/启动时间并写私有日志。停止时核对该 PID 的启动时间，不全局结束 node 或 QQ。

## 必做：安装本地 DSH 中控

源码主依赖及 vendor 均已 `npm ci --ignore-scripts` 后，Agent 写 `.local/control-connection.json`（私有、不入库）。同机示例：

```json
{"type":"local","directory":"D:/DSH-QQ"}
```

云端示例：

```json
{"type":"ssh","directory":"/home/USER/dsh-qq-groups","nodePath":"/absolute/path/to/node","sshArgs":["-o","BatchMode=yes","-o","StrictHostKeyChecking=yes","EXISTING_SSH_ALIAS"]}
```

仅复用用户授权的 SSH 别名/私钥，不把私钥塞进此 JSON。新主机应先验证 host key，不关闭主机校验。

```powershell
node scripts/prepare-control-host.mjs
npm.cmd pack ./plugins/qq-control --pack-destination .local
./scripts/control-host.ps1 -InstallPackage .local/dsh-qq-control-0.1.3.tgz
node scripts/probe-control-host.mjs
```

`prepare` 仅首次执行，已有覆盖配置时会拒绝重写。宿主在 loopback 23080，启动链接在私有 `.local/control-host.out.log`；由 Agent 安全打开，不贴出带 token 的 URL。本地管理宿主无需模型 key，不能把中控管理工具加入 QQ 对话预设。

打开真实 DSH 插件页，确认六项可见：群聊总开关、群消息落盘、对话模式、授权群号、冷却秒数、每小时回复上限。勾选/选项即时保存，输入框离开焦点保存。保存提示只代表宿主接受配置；用 `qq_control_status` 或远端 `group-control-cli.mjs` 再确认实际同步和 worker 状态。UI 不显示成功不应当作已保存。

兼容性踩坑：仅有 Config/volatile 字段会暴露 settings API，却不会自动生成此版本插件详情页。需要 `dsh.client` + `./client` 前端模块，并注册 keyed `plugins.bundle.config` 的 `key`。设置用 `configForms` 原生接口，不另造管理服务。更新 tgz 必须升版本，避免 pnpm 复用同版本缓存。

## 开关语义

| 开关 | 行为 |
|---|---|
| 总开关关闭 | 不处理新群消息；不退出 QQ，不影响既有私聊 |
| 落盘开启 | 授权群普通消息先记录，再判断是否回复 |
| off | 只记录（若落盘开启），不回复 |
| mention | 真正的 OneBot `at` 段指向本账号时回复；手打名字不是 @ |
| autonomous | 授权群新纯文本无需 @ 可回复；不是定时主动发起话题 |
| 冷却/每小时限制 | 每群限制；失败及不确定发送也计尝试，不重复补发 |

总开关与 DSH 的「启用插件」不是同一项：卸载/停用控制插件不会代替关闭远端 worker。停用前先关闭群聊总开关并核对远端。管理端断线时远端保留最后成功配置。

日志在 worker 的 `.local/group-messages/group-群号-UTC日期.jsonl`，权限为私有。记录文本、发送者、消息 ID、@ 标识、附件类型，不下载附件、不记录 URL/图片内容。单群每日约 10 MiB 上限，达到后停止该条处理并报错；不自动清除历史。Agent 按用户确定的保留期限归档/清理，不上传真实聊天正文。模型只接收当前符合条件的文本，没有历史群聊上下文。

## 必做：验收顺序

1. 先用 `npm test` 验证模拟事件：范围、去重、落盘先于 @ 门槛、冷却、自回声、附件、模型执行中关闭开关。
2. 真正界面关闭/开启开关，查远端 `get`，不能只做 API 调用后宣称 UI 通过。
3. 总开关及落盘开启、mode=mention。人类发普通消息再真正 @；日志应分别 record_only/replied，人类确认仅第二条收到回复。
4. 等冷却后切 autonomous，人类发新普通文本；查 group_round_trip 且收件确认。
5. 恢复用户选定模式；建议 mention、60 秒冷却、每小时 10 次。记录原私聊/模型/群 worker 状态。不把模拟结果或发送 API 返回当收件验收。

## 扫码确认与故障恢复

`running` 只代表容器运行，不等于 QQ 在线。先 `napcat-login-status.mjs` 与 `group-preflight.mjs`。登录态失效时不要循环重启 QQ；已有登录态可尝试一次 `--retry`，失败就由人类扫码。二维码易过期，优先通过本机 SSH 隧道打开实时 WebUI，管理 token 私下消费且不进入视频。

若 QQ 提示风险或限制，由人类在官方手机 QQ 按提示恢复；Agent 停止重复登录，不能绕过风控。恢复后重新扫码并检查账号匹配/online/群资格三项。确认在线后才 `systemctl reset-failed` 并启动本包的私聊和群桥接；不重放离线期间消息。

这次实测经历登录失效、桥接退避次数耗尽、官方手机恢复、实时扫码、重启专属桥接，最终两种模式收到回复。失败阶段保留在证据中，不隐去。

## 分发要求

只打包 Git 中源码、锁文件、说明和脱敏证据，插件 tgz 由本包源码构建。禁止 `.local`、node_modules、模型 key、QQ 登录态、二维码、真实群日志。分发默认开关关闭、名单为空，不能携带本次实例配置。
