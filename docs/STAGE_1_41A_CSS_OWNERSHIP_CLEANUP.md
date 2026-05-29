# Stage 1.41A - CSS Ownership Cleanup

## 1. 当前 Live Cascade Imports

Current live cascade imports:
1. `/luci-static/bootstrap/cascade.css?v=1.24P-base`
2. `./css/tokens.css?v=1.41A`
3. `./css/light.css?v=1.41A`
4. `./css/dark.css?v=1.41A`
5. `./css/base.css?v=1.41A`
6. `./css/sidebar.css?v=1.41A`
7. `./css/luci-components-visual.css?v=1.41A`
8. `./css/luci-layout-exceptions.css?v=1.41A`
9. `./css/responsive.css?v=1.41A`

## 2. CSS 文件 Ownership 表

| File | Current live imported | Responsibility | Keep/Delete/Archive | Reason |
| --- | --- | --- | --- | --- |
| `cascade.css` | Yes (entry) | 导入所有 live CSS | Keep | 入口文件 |
| `tokens.css` | Yes | 设计变量、颜色、圆角、阴影 token | Keep | Live CSS |
| `light.css` | Yes | Light mode token value | Keep | Live CSS |
| `dark.css` | Yes | Dark mode token value | Keep | Live CSS |
| `base.css` | Yes | 全局页面 shell、背景、基础排版 | Keep | Live CSS |
| `sidebar.css` | Yes | VitraWrt 自有 sidebar/menu/bottom controls | Keep | Live CSS |
| `luci-components-visual.css` | Yes | LuCI 原生组件视觉唯一 owner | Keep | Live CSS |
| `luci-layout-exceptions.css` | Yes | Page-scoped 特殊页面修复 | Keep | Live CSS |
| `responsive.css` | Yes | 响应式、移动端、折叠态布局 | Keep | Live CSS |
| `luci-visual.css` | No | 废弃的旧视觉 owner | Archive | 历史参考，规则已被迁移/覆盖 |
| `luci-native.css` | No | 废弃 | Archive | 历史参考 |
| `luci-reset.css` | No | 废弃 | Archive | 历史参考 |
| `luci-safe.css` | No | 废弃 | Archive | 历史参考 |
| `luci-overrides.css` | No | 废弃 | Archive | 历史参考 |
| `glass.css` | No | 废弃 | Archive | 历史参考 |

## 3. 全仓库引用搜索结果

- `luci-visual.css`: 在 README.md, ARCHITECTURE.md, 和一些旧审计报告中有引用，已被清理/标注为废弃。
- `@import`: 仅存在于 `cascade.css` 和 `mobile.css` 中。`mobile.css` 导入了 `responsive.css`。

## 4. 删除 / 归档 / 保留矩阵

- **Archive**: `luci-visual.css`, `luci-native.css`, `luci-reset.css`, `luci-safe.css`, `luci-overrides.css`, `glass.css` 移至 `docs/archive/css-deprecated/`。
- 原因：保留历史参考以防止误删，但不留在 `htdocs/` 中以免被误用或重新导入。

## 5. 回滚方案

- 出现视觉回退时，检查并修复 `luci-components-visual.css` 或 `luci-layout-exceptions.css`。
- 如果某脚本意外失败，修改脚本而不是恢复已废弃 CSS 文件。
- 绝不允许重新将 `luci-visual.css` 导入 `cascade.css` 来作为修复手段。
