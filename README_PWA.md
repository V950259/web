# PWA 配置说明

## ✅ 已完成的配置

1. ✅ 创建了 `public/manifest.json` - PWA 清单文件
2. ✅ 创建了 `public/sw.js` - Service Worker 离线缓存
3. ✅ 更新了 `index.html` - 添加了 PWA meta 标签和 manifest 链接
4. ✅ 更新了 `src/main.jsx` - 注册 Service Worker
5. ✅ 更新了 `vite.config.js` - 配置 public 目录

## 📱 需要完成的步骤

### 1. 添加图标文件

将您的应用图标（蓝色纸飞机图标）转换为以下格式，并放置在 `public/` 目录：

- **icon-192.png** (192x192 像素)
- **icon-512.png** (512x512 像素)

### 2. 图标生成方法

#### 方法一：使用在线工具
1. 访问 https://realfavicongenerator.net/
2. 上传您的图标图片
3. 下载生成的图标包
4. 将 `android-chrome-192x192.png` 重命名为 `icon-192.png`
5. 将 `android-chrome-512x512.png` 重命名为 `icon-512.png`
6. 放置到 `public/` 目录

#### 方法二：使用图片编辑软件
1. 打开您的图标图片
2. 调整尺寸为 192x192，保存为 `icon-192.png`
3. 调整尺寸为 512x512，保存为 `icon-512.png`
4. 放置到 `public/` 目录

### 3. 部署到 Netlify

确保以下文件被正确部署：
- `public/manifest.json`
- `public/sw.js`
- `public/icon-192.png`
- `public/icon-512.png`

### 4. 测试 PWA

1. **在 Chrome/Edge 浏览器中**：
   - 访问 https://illustrious-duckanoo-ea887d.netlify.app/
   - 打开开发者工具 (F12)
   - 切换到 "Application" 标签
   - 检查 "Manifest" 和 "Service Workers" 是否正常

2. **安装到主屏幕**：
   - Chrome/Edge：地址栏右侧会出现"安装"图标，点击即可安装
   - 或通过菜单：菜单 → "安装应用"

3. **移动端测试**：
   - 在手机浏览器中访问网站
   - iOS Safari：分享 → "添加到主屏幕"
   - Android Chrome：菜单 → "添加到主屏幕" 或 "安装应用"

## 🔍 验证清单

- [ ] 图标文件已添加到 `public/` 目录
- [ ] 网站已部署到 Netlify
- [ ] 在浏览器中访问网站，检查控制台无错误
- [ ] Service Worker 已注册（Application → Service Workers）
- [ ] Manifest 已加载（Application → Manifest）
- [ ] 可以成功安装到主屏幕
- [ ] 离线访问测试（断网后仍可访问已缓存的页面）

## 📝 注意事项

1. **HTTPS 要求**：PWA 必须在 HTTPS 环境下运行（Netlify 已提供）
2. **Service Worker 更新**：修改 `sw.js` 后需要更新版本号（CACHE_NAME）
3. **缓存策略**：高德地图 API 和 AI API 不缓存，确保实时数据
4. **图标格式**：必须是 PNG 格式，建议使用透明背景

## 🐛 常见问题

**Q: Service Worker 没有注册？**
A: 检查浏览器控制台错误，确保 `sw.js` 文件路径正确，且网站使用 HTTPS

**Q: 图标不显示？**
A: 检查图标文件路径和文件名是否正确，确保文件存在于 `public/` 目录

**Q: 无法安装到主屏幕？**
A: 确保 manifest.json 格式正确，且所有必需字段都已填写

