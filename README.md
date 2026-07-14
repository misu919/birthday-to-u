# 封存的花信

“封存的花信”是一个可交互的生日电子贺卡模板，支持手机和电脑访问。可以通过 GitHub Pages 免费部署。

制作自己的贺卡时，只需在线修改一个配置文件：[src/config/content.ts](src/config/content.ts)，不需要了解前端开发。

## 在线演示

演示地址：[https://takagiqueen.github.io/birthday-card/](https://takagiqueen.github.io/birthday-card/)


## 🎁 3 分钟制作自己的生日贺卡

下面的流程不需要安装任何软件，使用浏览器和 GitHub 网页即可完成：

1. 点击仓库右上角的 **Use this template**。
2. 选择 **Create a new repository**。
3. 填写自己的仓库名称，例如 `birthday-for-you`。
4. 将仓库设为 **Public**，这样可以方便地使用免费的 GitHub Pages。
5. 创建完成后，打开 [src/config/content.ts](src/config/content.ts)。
6. 点击文件页面右上角的铅笔按钮进入编辑。
7. 修改姓名、祝福、署名、日期和配色，注意保留原有引号、逗号和括号。
8. 点击 **Commit changes**，将修改提交到 `main` 分支。
9. 打开仓库的 **Settings → Pages**。
10. 在 **Build and deployment** 中将 **Source** 设置为 **GitHub Actions**。
11. 打开仓库的 **Actions** 页面，等待部署任务出现绿色对勾。
12. 访问你的贺卡：

   ```text
   https://你的用户名.github.io/你的仓库名/
   ```


## 修改文案与配色

普通定制只需要修改 [src/config/content.ts](src/config/content.ts)。姓名和日期会显示在多个位置，请按下面的字段逐项检查：

| 想修改的内容 | 配置位置 |
| --- | --- |
| 浏览器标签标题 | `cardContent.documentTitle` |
| 封面姓名 | `cardContent.cover` |
| 信纸称呼 | `cardContent.letter.salutation` |
| 信纸祝福 | `cardContent.letter.birthday`、`cardContent.letter.wishes` |
| 署名和日期 | `cardContent.letter.signature`、`cardContent.letter.date` |
| 终章标题和祝福 | `cardContent.finale.title`、`cardContent.finale.wishes` |
| 终章姓名和日期 | `cardContent.finale.footer` |
| 页面配色 | `theme` |

编辑时请注意：

- 只修改引号内的文字或 `#` 开头的颜色值，不要改动字段名。
- `wishes` 中每一对引号代表一行文字；增删内容时保留英文逗号。
- `theme` 中依次包含页面背景、封面、次要粉色、金色、信纸和正文颜色。
- `hints`、`controls` 和 `accessibility` 是提示与无障碍文案，通常不需要修改。
- `experience` 是显影和倾斜参数；制作普通贺卡时建议保持默认值。

## GitHub Pages 自动部署

仓库已经包含 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)。每次向 `main` 分支提交后，它会自动：

1. 执行 `npm ci` 安装锁定版本的依赖；
2. 执行 `npm run build` 完成 TypeScript 检查和生产构建；
3. 将 `dist` 目录上传并发布到 GitHub Pages。

不需要手动提交或上传 `dist`。


## 检查与构建

```bash
npm run typecheck
npm run build
npm run preview
```

- `npm run typecheck`：检查 TypeScript。
- `npm run build`：执行类型检查并生成生产版本。
- `npm run preview`：在本地预览生产构建。

生产构建位于 `dist` 目录。

## 部署到其他平台

GitHub Pages 是最推荐、最适合普通用户的方式。如需使用其他静态托管平台，可采用以下设置：

| 平台 | 构建设置 | 发布设置 |
| --- | --- | --- |
| Netlify | Build command：`npm run build` | Publish directory：`dist` |
| Cloudflare Pages | Build command：`npm run build` | Output directory：`dist` |
| Vercel | Framework Preset：`Vite`；Build command：`npm run build` | Output directory：`dist` |

相同构建产物也可以部署到自定义域名。

## 常见问题

### 部署后显示 404

请依次检查：

- 仓库是否为 **Public**；
- **Settings → Pages** 是否选择了 **GitHub Actions**；
- **Actions** 中的部署任务是否成功；
- 首次部署后是否已经等待一到两分钟；
- 访问地址中是否包含正确的仓库名。

### 页面只有背景或资源加载失败

- 确认 [vite.config.ts](vite.config.ts) 中的 `base` 仍为 `'./'`；
- 不要直接打开源码中的 `index.html`；
- 本地使用 `npm run dev` 或 `npm run preview`，线上使用部署完成后的网址访问。

## 项目说明

- 技术栈：Vite、TypeScript、GSAP、Canvas 2D、CSS 3D Transform、原生 HTML/CSS/SVG。
