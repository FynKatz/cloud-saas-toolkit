# Cloud SaaS Toolkit

个人工作台，把日常工具统一在一个前端里。Vue 3 + TypeScript + Vite + Tailwind 4 + Supabase。

📘 **需求文档**：[PRD](docs/PRD.md) · [账号与权限技术设计](docs/auth-permission-design.md) · [路线图](ROADMAP.md)

所有需求与产品决策以 `docs/PRD.md` 为唯一事实来源；技术实现细节见 `docs/auth-permission-design.md`。

## 项目约定

### 分支策略

```text
feature/2610 → dev → int → stg → prod
```

## 数据隔离约定（强制）

所有会落库的表，不管当前是共享还是私有，一律带 `user_id`：

```sql
-- 每个业务表都有这一列
user_id UUID NOT NULL REFERENCES auth.users(id)
```

隔离程度只改 RLS 策略，不改表结构：

```sql
-- 私有：每人只看自己的
CREATE POLICY "own_data" ON my_table
  USING (user_id = auth.uid());

-- 共享：所有已授权且已审批用户可看，user_id 仅做审计
CREATE POLICY "shared_data" ON my_table
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'approved')
    AND has_tool_permission('tool_id', 'view')
  );
```

**好处**：共享↔私有之间切换只改一行策略，不需要迁移存量数据。`user_id` 同时承担「谁创建的」这个审计职责。注意：shared 策略不能写成 `USING (true)`，否则未审批/未授权用户也能读到数据。

## 技术栈

| 层 | 选型 |
|---|------|
| 前端框架 | Vue 3 + TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS 4 |
| 图标 | lucide-vue-next |
| 路由 | vue-router |
| 状态 | Pinia |
| 后端 | Supabase Auth · Database · RLS |
| 部署 | Netlify |

## 工作台布局设计

已通过交互原型确认的 UI/UX 方案，原型在 `.codex/visualizations/`：

- 主题：C 方向，支持白天/暗夜切换（暗夜为黑色调）
- 侧边栏：可折叠抽屉式，四分类，图标 + 文字
- 首页：搜索框 + 最近使用 + Bento 网格卡片
- 分类：速查参考 / 数据应用 / 图形工具 / 文本工具

## 密钥管理

- 根目录 `.env.secrets`（git 跟踪）是全部密钥的唯一事实源。
- 前端 `frontend/.env` 只放 `VITE_` 前缀的公开变量（Supabase URL、anon key、AMap JS Key）。
- `frontend/.env` 不提交 Git，每次开发或构建前从 `.env.secrets` 派生。
- 服务端密钥（service role、Pixabay、TMDB、AMap Web Key）永不进前端源码或构建产物。
- 完整分级规则见 [PRD §8.1](docs/PRD.md)。

## 本地开发

```bash
# 从根目录的 .env.secrets 提取公开变量到前端本地环境文件
grep '^VITE_' .env.secrets > frontend/.env

cd frontend
npm install
npm run dev             # 默认 http://localhost:5173
```

生产构建时同样先执行上面的 `grep` 步骤，Vite 只内联 `VITE_` 变量进最终 JS bundle。

## 分支部署

| 分支 | 环境 | URL |
|------|------|-----|
| `prod` | 生产 | https://cloud-saas-toolkit.netlify.app |
| 其他 | Netlify 分支部署按需 |
