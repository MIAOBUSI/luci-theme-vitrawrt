# Stage 1.41A - Deprecated CSS Rule Extraction

## 1. 审计对象
- `htdocs/luci-static/vitrawrt/css/luci-visual.css`
- `htdocs/luci-static/vitrawrt/css/luci-native.css`
- `htdocs/luci-static/vitrawrt/css/luci-reset.css`
- `htdocs/luci-static/vitrawrt/css/luci-safe.css`
- `htdocs/luci-static/vitrawrt/css/luci-overrides.css`
- `htdocs/luci-static/vitrawrt/css/glass.css`

## 2. 文件审计记录

### 2.1 luci-visual.css
- **是否被 cascade.css 导入**: 否
- **是否被其他模块引用**: 被 README.md、ARCHITECTURE.md、历史脚本注释等引用，不被模板实际加载。
- **主要 selector group 状态**:
  - `h1, h2, h3, legend`, `p`: duplicated by `base.css` and `luci-components-visual.css`.
  - `.cbi-map, .cbi-section, fieldset`: duplicated by `luci-components-visual.css`.
  - `table, .table, .cbi-section-table, th, td`: duplicated by `luci-components-visual.css`.
  - `input, select, textarea`: duplicated by `luci-components-visual.css`.
  - `button, .btn, .cbi-button*`: duplicated by `luci-components-visual.css`.
  - `.alert-message, .alert*`: duplicated by `luci-components-visual.css`.
- **迁移判定**: 无需迁移。所有规则均在当前 Stage 1.40R 的 `luci-components-visual.css` 中有更好、更准确的等价实现。
- **最终决策**: Archive after useful rules checked. (无遗漏，安全归档)

### 2.2 luci-native.css
- **状态**: 仅含注释声明 Deprecated。
- **最终决策**: Archive as historical reference only。

### 2.3 luci-reset.css
- **状态**: 仅含注释声明 Deprecated。
- **最终决策**: Archive as historical reference only。

### 2.4 luci-safe.css
- **状态**: 仅含注释声明 Deprecated。
- **最终决策**: Archive as historical reference only。

### 2.5 luci-overrides.css
- **状态**: 仅含注释声明 Deprecated。
- **最终决策**: Archive as historical reference only。

### 2.6 glass.css
- **状态**: 仅含注释声明 Deprecated。
- **最终决策**: Archive as historical reference only。

## 3. 验证与结论
- `luci-visual.css` 中的所有功能性/视觉样式已被完全接管（由 `luci-components-visual.css`、`base.css` 等），且变量使用符合当前规范。
- 无任何功能丢失。这些文件已经准备好被移动到 `docs/archive/css-deprecated/` 以避免继续污染 `live CSS` 目录。
