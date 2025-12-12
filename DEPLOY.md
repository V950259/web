# Netlify 部署指南

## 方法一：通过网站拖拽部署（最简单）

1. 打开 https://app.netlify.com/
2. 登录账号
3. 找到您的站点，或创建新站点
4. 将 `dist` 目录直接拖拽到 Netlify 部署页面
5. 等待部署完成

## 方法二：安装 Netlify CLI

### 安装 CLI：
```bash
npm install -g netlify-cli
```

### 首次部署：
```bash
# 登录
netlify login

# 部署
netlify deploy --prod --dir=dist
```

### 后续更新：
```bash
# 构建
npm run build

# 部署
netlify deploy --prod --dir=dist
```

## 方法三：连接 Git 自动部署（推荐）

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 Netlify 中连接仓库
3. 配置构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
4. 每次推送代码后自动部署

## 验证 PWA 功能

部署完成后，访问您的网站：
1. 打开 https://illustrious-duckanoo-ea887d.netlify.app/
2. 按 F12 打开开发者工具
3. 检查 "Application" → "Service Workers" 是否激活
4. 检查 "Application" → "Manifest" 是否正确加载
5. 尝试安装到主屏幕

