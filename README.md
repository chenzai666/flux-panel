# flux-panel 转发面板（稳定版 1.x）

> **当前分支为稳定版（main）**，使用 MySQL 数据库。  
> Beta 版（2.x SQLite，含转发链/负载均衡等新功能）请切换到 [beta 分支](https://github.com/chenzai666/flux-panel/tree/beta)。

---

## 功能特性

- 支持按**隧道账号级别**管理流量转发数量，可用于用户/隧道配额控制
- 支持 **TCP** 和 **UDP** 协议的转发
- 支持**端口转发**与**隧道转发（双节点中转）**两种模式
- 可针对**指定用户的指定隧道**进行限速设置
- 支持配置**单向或双向流量计费**，灵活适配不同计费模型
- **批量删除**：隧道与转发均支持批量操作
- **链路诊断**：TCP Ping 检测节点连通状态

---

## 部署

### 快速部署（推荐）

面板端：
```bash
curl -L https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/main/panel_install.sh -o panel_install.sh && chmod +x panel_install.sh && ./panel_install.sh
```

节点端：
```bash
curl -L https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/main/install.sh -o install.sh && chmod +x install.sh && ./install.sh
```

### 手动 Docker Compose 部署

1. 下载配置文件（IPv4 / IPv6 二选一）：
   ```bash
   # IPv4
   curl -LO https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/main/docker-compose-v4.yml
   # IPv6
   curl -LO https://raw.githubusercontent.com/chenzai666/flux-panel/refs/heads/main/docker-compose-v6.yml
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

## Beta 版部署（2.x）

> Beta 版使用 **SQLite**，无需 MySQL，含转发链、负载均衡等新功能。  
> 详见 [beta 分支](https://github.com/chenzai666/flux-panel/tree/beta)。

### 快速部署

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
   JWT_SECRET=你的密钥（至少32位随机字符串）
   BACKEND_PORT=6365
   FRONTEND_PORT=80
   ```

3. 启动：
   ```bash
   docker compose -f docker-compose-v4.yml up -d
   ```

---

## 从稳定版升级到 Beta 版（2.x）

> 稳定版使用 **MySQL**，Beta 版使用 **SQLite**，数据库类型不同，**无法直接原地升级**。

### 方式一：全新部署（推荐）

转发规则不多时，直接新部署 Beta 版，在面板中重新创建节点、隧道、用户和转发即可。

### 方式二：备份导入迁移

1. 在**稳定版**面板 → 系统设置 → 点击「导出备份」，保存备份文件
2. 新部署 Beta 版后，在面板 → 系统设置 → 点击「导入备份」，选择稳定版备份文件自动迁移

---

## 项目说明

本项目基于 [go-gost/gost](https://github.com/go-gost/gost) 和 [go-gost/x](https://github.com/go-gost/x) 两个开源库，实现了转发面板。

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
