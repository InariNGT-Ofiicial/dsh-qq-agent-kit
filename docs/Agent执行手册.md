# 个人 QQ → DSH：Agent 执行手册

阅读对象是执行部署的 Agent。人类只需读 [用户开始这里](用户开始这里.md)。本地 R1 与云端 R4 使用个人 QQ 小号；官方 QQ Bot 的本地/云端是另外两条路线，见 [四路线指南](指南.md)，不得混用 AppID/AppSecret。

## 执行约定与证据

标记含义：**必做·Agent** 由 Agent 执行并检查结果；**人类确认** 只请求必要信息或操作，等待实际答复；**故障恢复** 在对应失败发生后执行。命令都在源码根目录运行，每条检查退出码；占位参数必须从当前环境和用户授权中解析，不能原样执行。任一步失败，不继续启动其依赖组件。

实测版本：Windows QQ 9.9.36-53644、Node 24.21.0、NapCat 4.18.41、DSH 0.2.1-rc.2；云端 Linux QQ 3.2.34-53644、Linux x86_64、systemd、Docker。依赖由两个锁文件固定；不自行升级。安装源码和来源见根目录及 cloud 下的 provenance.json。

本地 2026-10-27、云端 2026-10-28 均有配对私聊自动回复及人类收件确认，云端验收时本地实例已停止。证据见 `validation.json` 与 `evidence/`。原云端使用既有基础镜像私有构建；本次新增 `Dockerfile.portable` 和构建入口只做静态/脚本检查，**尚未在全新服务器完成拉取、构建与私聊验收**。分发后的 Agent 必须完成这些检查再宣称目标部署通过。旧 Dockerfile.local-base/entrypoint-fix 仅用于复现历史构建，不作为新机器默认入口。

## 0. 必做·Agent：环境与范围

1. 检查操作系统、架构、Node、QQ 可执行文件、QQ 进程、本包 `.local/config.json` 和端口 13000/13001/13080/16099。Windows 可用 `Get-CimInstance Win32_Process -Filter "Name='QQ.exe'"` 只读取 PID、路径，不打印含令牌的完整命令行。沙箱看不到宿主时，使用可访问宿主的已授权执行入口，不据此重装。
2. 已存在配置则进入“恢复已有实例”，不重跑 init。端口冲突先定位进程归属；本包尚无统一改端口命令，禁止只改一处后继续。无法保留既有服务时应报告具体阻碍。
3. 若未知，问：“使用哪个个人 QQ 小号？允许自动回复哪个好友私聊？” 上云时先查已授权 SSH 配置，再询问缺失的连接信息，不要索要聊天中的私钥或密码。
4. 确认可用模型凭据来源：本地现有 DeepSeek 登录，或用户在私密入口输入 API Key。迁移只包含明确授权的模型凭据/配对信息；新端接口令牌重新生成。

## 1. 本地路线（Windows PowerShell）

### 1.1 必做·Agent：安装隔离依赖和配置

选固定目录，例如 `D:\DSH-QQ`。检查 Node 为固定测试版本或说明版本偏差，缺少运行时才安装。不要覆盖已有全局 Node。

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd ci --prefix vendor --ignore-scripts --no-audit --no-fund
npm.cmd test
node scripts/init-local.mjs $BotQQ
node scripts/setup-dsh.mjs
```

`$BotQQ` 是已确认的小号。仅全新目录运行 init。vendor 必须独立安装，否则旧 API 客户端可能与新版 DSH 发生作用域冲突。

### 1.2 必做·Agent：先验证模型

模型二选一。**已有账号登录**：在本包 DSH 停止时，执行下面两行；路径必须先确认归用户所有且获准复用。

```powershell
node scripts/import-account.mjs $ExistingDshHome
node scripts/select-account.mjs
```

**API Key**：在用户可交互的私有终端启动 `scripts/set-model-key.ps1`，让人类隐藏输入。自动执行环境不能输入时，安排真实终端输入，不把密钥放在命令参数或对话。也可将已授权秘密源的值经 stdin 交给 `configure-model-key.mjs`；不输出源文件。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/set-model-key.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-dsh.ps1
node scripts/inspect-dsh.mjs
node scripts/smoke-dsh.mjs
```

账号模式失效时，通过隔离 DSH 页面让用户重新登录；`access-info.mjs dsh` 能读取私密启动链接，只在用户私有终端展示。不要用默认全局 DSH 代替。验收：preset 为 qq-lab-chat、无 broken、实际 visibleTools=0、模型返回固定测试内容。未通过不启动桥接。

### 1.3 必做·Agent：启动 QQ 协议端

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/fetch-napcat.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-napcat.ps1 -QQPath $QQExe
node scripts/napcat-login-status.mjs
```

`$QQExe` 来自实际安装路径。fetch 下载固定版本并校验 SHA，不分发 QQ/NapCat 二进制。不要启动旧来源不明的一键包。

**人类确认·登录**：需要扫码时，打开 `http://127.0.0.1:16099/webui`，管理令牌由 `access-info.mjs napcat` 在私密终端提供。引导用户“用小号扫码，核对账号后在手机确认”。未过期就等待，不因人类尚未回复反复重启。已确认后执行 `napcat-login-status.mjs` 和 `probe.mjs`，核对账号匹配、在线、模型可达，不能只相信“已确认”。

### 1.4 必做·Agent + 人类确认：配对与真实验收

已配对则保留名单，跳过生成口令。首次配对在桥接停止时：

```powershell
node scripts/pair-code.mjs --renew --bridge-stopped
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-bridge.ps1
```

`--bridge-stopped` 是调用者声明，脚本不会代查进程；Agent 必须先查记录，必要时执行 stop-bridge.ps1。将生成的 `/dsh-pair …` 私下交给指定主号持有人，请他在好友私聊发给小号。收到配对确认后，请发送一条新的“你好”。普通文本可触发，不必加 `/dsh`。

运行 `node scripts/diagnose-private.mjs`、`node scripts/probe.mjs` 核对新事件及回复回执，并取得用户“收到回复”的确认。必须是本轮新事件，不能把旧累计回复数当作本轮成功。

### 1.5 必做·Agent：记录结果

记录脱敏版本、路由、事件时间、发送回执、人类收件确认、visibleTools=0。不要记录聊天正文或账号号码。遇到失败进入恢复表，不自行向其他联系人测试。

日常启动顺序为 DSH → NapCat 登录核验 → 桥接；停止顺序为 stop-bridge.ps1 → stop-napcat.ps1 → stop-dsh.ps1，统一使用上述 powershell -File 形式。这些停止脚本核验本包 PID/启动时间，不使用全局 taskkill QQ。

## 2. 云端路线（Linux SSH）

### 2.1 必做·Agent：先预检，再上传干净源码

目标为 Linux x86_64、systemd、可用 Docker 和 sudo 权限。执行 `bash scripts/cloud-preflight.sh` 检查资源、端口和现有服务；不要替换已有 Docker。缺少 Docker、curl、xz、unzip 时按目标系统官方文档安装所缺组件后再继续。既有 2GiB+交换空间环境仅证明低负载可用，不是容量保证。

通过已核实 SSH 主机连接信息，将公开源码 ZIP 上传并展开到新的 `~/dsh-qq-personal-lab`，不得上传本地 `.local/`、QQ 缓存或整个 `.dsh/`。首次主机指纹与可信来源核对，不禁用 SSH 主机校验。Windows 可用 `scp <源码ZIP> <SSH别名>:~/dsh-qq-source.zip`；远端先确认目录不存在，再 mkdir、unzip。重名目录先识别已有部署。

### 2.2 必做·Agent：私有运行时与模型

以下命令在远端源码目录，以普通服务用户执行；只有明确 sudo 行提权。

```bash
bash scripts/install-cloud-runtime.sh
export PATH="$PWD/.runtime/node-v24.21.0-linux-x64/bin:$PATH"
node scripts/init-local.mjs "$BOT_QQ"
node scripts/setup-dsh.mjs
bash scripts/set-model-key.sh
node scripts/setup-cloud-services.mjs
sudo install -m 644 .local/systemd/dsh-qq-personal-model.service /etc/systemd/system/
sudo install -m 644 .local/systemd/dsh-qq-personal-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dsh-qq-personal-model
node scripts/inspect-dsh.mjs
node scripts/smoke-dsh.mjs
```

先设置已确认的 BOT_QQ；首次才 init。每次新 SSH 会话需重新 export 私有 Node PATH。set-model-key.sh 在私有交互终端隐藏输入；Agent 无交互终端时使用经授权秘密源 + stdin，不要求人类在聊天发送密钥。已授权复用远端 env 可用 import-cloud-api-key.mjs，仅抽取模型 Key，并将新 `.env` 所有者设回服务用户、权限600。不要读取或导入 Bot AppSecret。

setup-cloud-services 将容器内部监听设为0.0.0.0，主机映射仍仅127.0.0.1；预建日志避免 systemd 以 root 创建日志。现有同名 unit 未核实前不能覆盖。模型验收通过才继续。

### 2.3 必做·Agent：构建和启动专用容器

```bash
sudo -v
bash scripts/build-cloud-image.sh --dry-run
bash scripts/build-cloud-image.sh
NAPCAT_IMAGE=dsh-qq-personal-napcat:4.18.41-stable bash scripts/create-cloud-napcat.sh
sudo docker start dsh-qq-personal-napcat
```

构建器固定官方 amd64 digest，并加入已修复的 X11 启动入口。默认从官方源拉取；只有连通失败时，才选可用镜像来源并设置 NAPCAT_BASE_IMAGE，且必须保留同一 `@sha256:…` 摘要，不能换 latest。记录实际镜像ID与构建结果。若缺文件/依赖或镜像拉取失败，停在此阶段定位，不回退到依赖原服务器镜像的历史 Dockerfile。这条通用构建路线需本次实际验收。

**切换必做**：云端登录前先停止本地本包桥接、NapCat 和 DSH，避免同号冲突；只停止已识别的本包实例。不会迁移登录缓存。

### 2.4 人类确认·云端扫码

由 Agent 在本机建立隧道（专用终端保持运行）：

```text
ssh -N -L 26099:127.0.0.1:16099 <已核实的SSH别名>
```

远端 `node scripts/access-info.mjs napcat --port 26099` 在私密终端给出本机访问地址及令牌；由 Agent 安全填入管理页或引导用户在自己的终端复制。浏览器访问本机26099，不开放服务器16099公网。展示当前二维码，请持有人用小号扫码确认。过期就在管理页刷新后重扫；二维码与登录链接不进入公开材料。

```bash
node scripts/napcat-login-status.mjs
node scripts/probe.mjs
```

仅在身份匹配、QQ在线、模型可达后继续。已有配对可通过 `import-pairing.mjs` 导入仅含 selfId/allowedPeers 的私有授权文件；否则按下面新配对。

### 2.5 必做·Agent + 人类确认：云端闭环

```bash
# 首次未配对且已确认桥接停止时才生成
node scripts/pair-code.mjs --renew --bridge-stopped
sudo systemctl enable --now dsh-qq-personal-bridge
```

让指定主号发送配对口令，成功后发送新的“云端测试”。查 `node scripts/cloud-evidence.mjs` 和 `node scripts/probe.mjs`，核对本轮事件时间、发送回执及人类收件确认，同时核实本机实例确已停止。服务 active 或旧 replies>0 均不足以替代这项验收。

检查原有服务仍健康，记录新服务名、容器名、脱敏结果和实际版本。结束隧道不影响云端自动回复。不要把源码包里历史 validation.json 当成当前用户的验收报告。

## 3. 故障恢复（Agent 按症状处理）

| 现象 | Agent 检查与处理 | 何时需要人类 |
|---|---|---|
| 当前账号已登录 | 先停本包桥接，定位同号实例；只让同号退出，再运行 napcat-login-status.mjs --retry | 退出原客户端的小号；不退出其他账号 |
| 二维码过期 | 保持服务，刷新管理页当前二维码；不要重装或清空数据 | 扫新码并确认 |
| 手机确认后仍离线 | 查 login-status、probe，确认账号和当前实例；看到手Q验证按扫码流程恢复 | QQ要求时再次确认；一次“已确认”不保证在线 |
| 普通私聊没回复 | diagnose-private / cloud-evidence 检查是否friend、已配对、纯文本、新事件；再分别测模型和登录 | 仅在修复后请指定主号发新消息验收 |
| 配对口令过期 | 停桥接 → pair-code --renew --bridge-stopped → 启动桥接；已配对不更新名单 | 在唯一授权私聊发新口令 |
| 模型失败 | inspect-dsh、smoke-dsh；核实隔离home和provider；修复凭据后仅重启本包模型 | 私密输入Key或在隔离页面重新登录 |
| 401/403 | DSH根路径无令牌401、OneBot无令牌403本来就可能正常；使用带认证的probe判断 | 通常不需要 |
| Windows插件启动失败 | setup-dsh生成file URL；确认两个锁文件分别npm ci，勿合并vendor依赖 | 通常不需要 |
| 云端日志权限失败 | 核对本包专用日志属主；仅修正该文件给服务用户，不递归修改其他目录 | 无sudo权限时请管理员执行具体修复 |
| X11锁残留/QQ未启动 | 使用含入口修复的本包镜像；检查容器状态和过滤日志，禁止删除宿主X11目录 | 修复后QQ可能要求再扫码 |
| bash出现CRLF错误 | 包内sh固定LF；跨PowerShell传输用invoke-cloud-preflight.ps1的换行规范化方式或传文件执行 | 通常不需要 |
| 端口/容器名占用 | 核实归属；已有本包走恢复，其他应用不替换、不停止 | 只有确实需要改变部署范围时解释冲突再确认 |

**云端登录失效后的恢复顺序**（远端源码根目录、先设置私有Node PATH）：

```bash
sudo systemctl stop dsh-qq-personal-bridge
node scripts/napcat-login-status.mjs
# 若模型已停止才启动；若QQ容器已停止才启动。不要无故重建容器。
# 需要快速重登时运行 login-status --retry；需要手机验证则建立隧道并引导扫码。
node scripts/probe.mjs
# 仅在probe确认账号在线、模型可达后执行
sudo systemctl reset-failed dsh-qq-personal-bridge
sudo systemctl start dsh-qq-personal-bridge
```

再请人类发一条新消息验收。不重放停机旧消息；recover-latest-private.mjs 是人工诊断入口，可能发送消息，不作为日常恢复自动执行。restart-cloud-test.sh 会中断实例，只在明确安排恢复演练时使用；重启后可能必须手机验证，不承诺无人值守。

**停止/回退本地**：仅停 `dsh-qq-personal-bridge`、`dsh-qq-personal-model` 和 `dsh-qq-personal-napcat`；需要取消开机启动时 disable 专用units，并把专用容器restart策略改为no。保留 `.local`。确认云端同号停用后才恢复本地，禁止同时抢登录。

## 4. 分发与交付

运行 npm test；发布者运行 verify-public.mjs 检查已知本地私密值未进入候选文件（它依赖发布者本地配置，不是接收者安装必做步骤）。只将审核后的 Git 提交通过 git archive 打包。不可压缩整个工作目录。NapCat/QQ运行时按来源下载，不随公开包分发；来源许可见provenance。

交付给人类的话应类似：“本地/云端已通过本轮私聊收发，你已确认收到；当前仅该好友纯文本可触发。再次需要手机验证时我会引导扫码。恢复入口为本手册第3节。” 未收到确认时明确写“待验收”，附具体缺项，不替人类确认。
