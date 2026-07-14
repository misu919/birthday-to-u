import { defineConfig } from 'vite';

export default defineConfig({
  // 使用相对资源路径，模板复制到任意仓库名或静态托管平台后都无需改配置。
  base: './',

  build: {
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: false,
  },
});
