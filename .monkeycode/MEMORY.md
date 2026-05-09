# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[UI 重设计偏好]
- Date: 2026-04-24
- Context: 用户要求基于 flux-panel 保持主要功能不变并重做界面
- Instructions:
  - 页面视觉风格优先参考 Claude 风格（温和中性色、清晰层次、简洁布局）
  - 在完成改造后同步修改项目名称

[项目结构快速认知]
- Date: 2026-04-24
- Context: Agent 在执行 UI 重设计任务时发现
- Category: 代码结构
- Instructions:
  - 前端位于 `vite-frontend/`，技术栈为 Vite + React + TypeScript + HeroUI + Tailwind
  - 主后台布局在 `vite-frontend/src/layouts/admin.tsx`，登录页在 `vite-frontend/src/pages/index.tsx`
  - 移动端布局分别使用 `vite-frontend/src/layouts/h5.tsx` 与 `vite-frontend/src/layouts/h5-simple.tsx`

[Claude 配色系统约束]
- Date: 2026-05-07
- Context: 用户明确规定界面配色规范
- Instructions:
  - 整套配色仅使用 Claude 设计系统 CSS 变量，不使用任何硬编码颜色
  - 结构色使用 `--color-background-primary`/`--color-background-secondary`/`--color-background-tertiary`、`--color-text-primary`/`--color-text-secondary`/`--color-text-tertiary`、`--color-border-tertiary`/`--color-border-secondary`
  - 语义色仅用于状态徽章和进度条：成功 `#EAF3DE/#27500A/#C0DD97`，警告 `#FAEEDA/#633806/#FAC775`，危险 `#FCEBEB/#791F1F/#F7C1C1`，信息 `#E6F1FB/#0C447C/#B5D4F4`
  - 进度条三档颜色使用 `#639922`、`#BA7517`、`#E24B4A`
  - 整体风格保持克制，中性色为主体，彩色仅用于表达状态语义

[默认使用 v4 部署]
- Date: 2026-05-07
- Context: 用户指定默认部署方式
- Instructions:
  - 后续部署默认优先使用 v4 方案（如 `docker-compose-v4.yml`）

[新增公告栏功能]
- Date: 2026-05-07
- Context: 用户要求添加公告栏
- Instructions:
  - 公告栏背景色使用 `#BA7517`
  - 公告内容从后端配置项 `announcement` 读取
  - 公告栏置于主内容区顶部，支持关闭按钮
  - 前端实现位于 `vite-frontend/src/layouts/admin.tsx`

[新增配置备份区]
- Date: 2026-05-07
- Context: 用户要求添加配置备份区
- Instructions:
  - 支持导出配置为 JSON 文件，接口为 `POST /api/v1/config/export`
  - 支持从 JSON 文件导入配置，接口为 `POST /api/v1/config/import`
  - 前端实现位于 `vite-frontend/src/pages/config.tsx`
