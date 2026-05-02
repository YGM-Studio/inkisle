# InkIsle Documents

InkIsle, 中文名“墨屿”，是一个 AI-native Markdown publishing system。

当前文档用于沉淀产品背景、需求边界、技术方案和第一阶段路线。项目已经有一个最小 Astro 原型，后续文档继续服务于真实迁移、拆任务和技术选型。

## 文档

- [Product Brief](product-brief.md)：项目背景、定位、价值判断、MVP 范围和命名。
- [Technical Plan](technical-plan.md)：内容结构、多语言、主题、CLI、AI 友好输出和部署策略。

## 当前结论

- 产品名：墨屿 / InkIsle。
- CLI/package 优先名：`inkisle`。
- 定位：AI-native Markdown publishing system。
- 底层优先基于 Astro + Vite。
- 默认静态输出，优先预渲染 HTML。
- 第一阶段服务单站点，目标是替换现有 Hexo 个人博客。
- 当前代码已覆盖根目录 `content/` 读取、多语言静态路由、默认个人博客主题、RSS、sitemap、搜索索引、JSON Feed、posts JSON、`llms.txt` 和 CLI 骨架。
