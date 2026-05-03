# InkIsle Documents

InkIsle, 中文名“墨屿”，是一个 AI-native Markdown publishing system。

当前文档用于沉淀产品背景、需求边界、技术方案和第一阶段路线。项目已经整理为“产品 CLI + 轻量内容项目默认 starter + 内部 Astro renderer”的结构，后续文档继续服务于真实迁移、拆任务和技术选型。

## 文档

- [Product Brief](product-brief.md)：项目背景、定位、价值判断、MVP 范围和命名。
- [Technical Plan](technical-plan.md)：内容结构、多语言、主题、CLI、AI 友好输出和部署策略。
- [Theme System](theme-system.md)：starter/theme 边界、内置多主题契约、配置方式和后续扩展路径。

## 当前结论

- 产品名：墨屿 / InkIsle。
- CLI/package 优先名：`inkisle`。
- 定位：AI-native Markdown publishing system。
- 底层优先基于 Astro + Vite。
- 默认静态输出，优先预渲染 HTML。
- 第一阶段服务单站点，目标是替换现有 Hexo 个人博客。
- 默认用户项目保留 `package.json`、npm scripts 和可安装的 `node_modules/`，但不暴露 Astro 源码。
- 默认用户项目主要编辑 `content/`，可按需增加 `public/` 和 `inkisle.config.*`。
- `starters/content-only` 是默认 starter，`starters/default` 是完整 Astro 工程和内部 renderer。
- `inkisle init` 默认创建 content-only 项目，`inkisle init --full` 才复制完整 Astro 工程。
- 当前 renderer 已覆盖站点项目内 `content/` 读取、多语言静态路由、默认语言无 URL 前缀、内置 `personal` / `business-blog` 主题、RSS、sitemap、搜索索引、JSON Feed、posts JSON、`llms.txt` 和 CLI 骨架。
