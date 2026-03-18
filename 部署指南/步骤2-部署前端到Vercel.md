# SmartTour 部署指南 - 步骤 2：部署前端到 Vercel

## 目标
将 React 前端部署到 Vercel，获得全球 CDN 加速和自动 HTTPS。

---

## 准备工作

### 2.1 修改前端配置

在部署前，需要修改前端代码，使其能连接生产环境的后端。

**文件**: `smart-tour/frontend/src/hooks/useEventSource.ts`

找到第 18 行，修改为：

```typescript
// 开发环境用相对路径，生产环境用绝对路径
const API_URL = import.meta.env.PROD 
  ? 'https://your-backend-url.railway.app/api/v1/tour/generate_stream'
  : '/api/v1/tour/generate_stream';

export function useEventSource(apiUrl: string = API_URL): UseEventSourceReturn {
```

**注意**: `your-backend-url.railway.app` 先保留，等后端部署后再替换为真实地址。

---

## 部署步骤

### 2.2 注册 Vercel 账号

1. 打开 https://vercel.com/signup
2. 选择 **Continue with GitHub**
3. 授权 Vercel 访问您的 GitHub 仓库

### 2.3 导入项目

1. 登录 Vercel 后，点击 **Add New Project**
2. 在列表中找到您的仓库 `tour-agent`，点击 **Import**
3. 配置项目：
   - **Framework Preset**: 选择 `Vite`
   - **Root Directory**: 改为 `frontend`（因为前端代码在 frontend 文件夹）
   - 其他保持默认

### 2.4 部署

1. 点击 **Deploy**
2. 等待构建完成（约 1-2 分钟）
3. 部署成功后，会获得一个域名，如：`https://tour-agent-xxx.vercel.app`

---

## 验证部署

1. 打开 Vercel 提供的域名
2. 应该能看到 SmartTour 的搜索界面
3. 此时还不能生成行程（后端还没部署），但界面应该正常显示

---

## 下一步

完成此步骤后，请告诉我：
1. ✅ Vercel 部署成功
2. ✅ 前端域名（如 `https://tour-agent-xxx.vercel.app`）

然后我会给您 **步骤 3：部署后端到 Railway** 的文档。

---

## 常见问题

**Q: 构建失败，提示找不到模块？**
A: 检查 Root Directory 是否设置为 `frontend`

**Q: 页面空白，控制台报错？**
A: 可能是 API 地址配置问题，先确认界面能显示即可

**Q: 如何绑定自己的域名？**
A: 在 Vercel 项目设置中添加 Custom Domain（可选，后面再做）
