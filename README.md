# flux-panel 转发面板 Beta 版（2.0.x）

> **当前分支为 beta 开发版**，包含转发链、负载均衡等新功能，默认使用 MySQL（也支持切换 SQLite）。  
> 稳定版（1.x）请切换到 [main 分支](https://github.com/chenzai666/flux-panel/tree/main)。

---

## 新功能（相比稳定版 1.x）

- **转发链（多跳中转）**：入口节点 → 中转节点（多跳）→ 出口节点，完整的链路诊断
- **负载均衡**：每一跳支持多个节点，策略可选 主备(fifo) / 轮询(round) / 随机(rand) / IP哈希(hash)
- **MySQL / SQLite 双模式**：默认 MySQL，也可切换 SQLite 轻量部署
- **随机端口分配**：创建转发时可一键随机填入可用端口
- **批量删除 / 强制删除**：隧道与转发均支持批量操作
- **拖拽排序**：转发和隧道卡片支持拖拽调整顺序
- **链路诊断**：逐跳 TCP Ping，直观展示每段链路连通状态

---

## 部署

### 快速部署（beta 版）

面板端：
```bash
curl -L https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/beta/panel_install.sh -o panel_install.sh && chmod +x panel_install.sh && ./panel_install.sh
```

节点端：
```bash
curl -L https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/beta/install.sh -o install.sh && chmod +x install.sh && ./install.sh
```

### 手动 Docker Compose 部署

1. 下载配置文件（IPv4 / IPv6 二选一）：
   ```bash
   # IPv4
   curl -LO https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/beta/docker-compose-v4.yml
   # IPv6
   curl -LO https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/beta/docker-compose-v6.yml
   ```

2. 创建 `.env` 文件：
   ```env
   MYSQL_ROOT_PASSWORD=你的MySQL密码
   JWT_SECRET=你的密钥（至少32位随机字符串）
   BACKEND_PORT=6365
   FRONTEND_PORT=80
   ```

3. 启动：
   ```bash
   docker compose -f docker-compose-v4.yml up -d
   ```

#### 默认管理员账号

- **账号**: admin_user  
- **密码**: admin_user  

> ⚠️ 首次登录后请立即修改默认密码！

---

## 从稳定版（1.x）升级到 Beta 版（2.x）

> 稳定版（1.x）与 Beta 版（2.x）数据库结构不同，**无法直接原地升级**，需手动迁移数据。

### 方式一：全新部署（推荐）

转发规则不多时，直接新部署 Beta 版，在面板中重新创建节点、隧道、用户和转发即可。

### 方式二：通过导出/导入迁移转发规则

1. 在**稳定版**面板 → 转发管理 → 点击「导出」，选择对应隧道，复制导出文本  
   （格式：`目标地址|转发名称|入口端口`，每行一个）

2. 在 **Beta 版**中重新创建对应的隧道和节点

3. 在 Beta 版面板 → 转发管理 → 点击「导入」，选择对应隧道，粘贴数据导入

> 用户账号、节点配置需在 Beta 版中重新创建，无法从稳定版直接迁移。  
> 隧道结构发生根本性变化（新增 chain_tunnel 表），数据库层面无法直接迁移隧道数据。

---

## 项目说明

本项目基于 [go-gost/gost](https://github.com/go-gost/gost) 和 [go-gost/x](https://github.com/go-gost/x) 两个开源库，实现了转发面板。

### 特性

- 支持按**隧道账号级别**管理流量转发数量，可用于用户/隧道配额控制
- 支持 **TCP** 和 **UDP** 协议的转发
- 支持**端口转发**与**隧道转发（多跳链路）**两种模式
- 可针对**指定用户的指定隧道**进行限速设置
- 支持配置**单向或双向流量计费**，灵活适配不同计费模型

---

## 免责声明

本项目仅供个人学习与研究使用，基于开源项目进行二次开发。

使用本项目所带来的任何风险均由使用者自行承担，包括但不限于：

- 配置不当或使用错误导致的服务异常或不可用；
- 使用本项目引发的网络攻击、封禁、滥用等行为；
- 服务器因使用本项目被入侵、渗透、滥用导致的数据泄露、资源消耗或损失；
- 因违反当地法律法规所产生的任何法律责任。

本项目为开源的流量转发工具，仅限合法、合规用途。使用者必须确保其使用行为符合所在国家或地区的法律法规。

**作者不对因使用本项目导致的任何法律责任、经济损失或其他后果承担责任。**

---

[![Star History Chart](https://api.star-history.com/svg?repos=chenzai666/flux-panel&type=Date)](https://www.star-history.com/#chenzai666/flux-panel&Date)
