# BridgeEd · Mirror 风格色卡（设计 Token）

在出图与实现前统一使用本表，避免各端「各画各的」。**Mirror 取向**在此定义为：冷色中性底、高可读正文、细线分割、**单一主强调色**、卡片/表面层级清晰（偏现代 SaaS，而非高饱和营销页）。

---

## 1. 设计意图（与产品对齐）

| 原则 | 色彩上的体现 |
|------|----------------|
| 行动优先（家长） | 主按钮与「今晚就做」区块用 **Primary**；背景保持安静，让行动区跳出来 |
| 老师减负 | 工具界面用 **Surface + Border**，少用大面积色块；告警用 **Semantic** 即可 |
| AI 可控 | AI 相关入口可用 **Accent Secondary**（克制），避免与主 CTA 抢视线 |
| 三端一致 | 三端共用 **同一套 Foundation + Semantic**；仅导航结构不同，不换色 |

---

## 2. 色板总览（Light · 默认）

家长端、学生端建议默认 **Light**；老师端可与 Light 一致，若需长时间盯屏可再单独做 Dark 变体（见 §5）。

### 2.1 Foundation（中性）

| Token | 用途 | Hex | 备注 |
|-------|------|-----|------|
| `bg-canvas` | 全局背景 | `#F4F6F8` | 冷灰，略偏蓝，避免「死白」刺眼 |
| `bg-surface` | 卡片/面板背景 | `#FFFFFF` | |
| `bg-surface-raised` | 浮层、下拉、模态 | `#FFFFFF` | 与 surface 同色即可，靠阴影/边框区分 |
| `bg-muted` | 次要条带、表头底 | `#EEF1F4` | |
| `bg-subtle` | 悬停、选中浅底 | `#E8ECF0` | |

### 2.2 Border & divider（Mirror：细线、低存在感）

| Token | Hex |
|-------|-----|
| `border-subtle` | `#E2E6EA` |
| `border-default` | `#D1D6DD` |
| `border-strong` | `#B8BFC8` |
| `divider` | `#E2E6EA`（与 subtle 同或略浅） |

### 2.3 Text

| Token | Hex | 用途 |
|-------|-----|------|
| `text-primary` | `#0D1117` | 标题、正文主色 |
| `text-secondary` | `#4A5563` | 副标题、说明 |
| `text-muted` | `#6B7280` | 辅助、元信息 |
| `text-disabled` | `#9CA3AF` | 禁用 |
| `text-inverse` | `#FFFFFF` | 深色按钮上的字 |

### 2.4 Brand（单一主色 + 一个次要强调）

**主色（Primary）**：偏冷的蓝青，传递「信任、清晰、桥梁」，与冷灰底协调。

| Token | Hex | 用途 |
|-------|-----|------|
| `primary` | `#2563EB` | 主按钮、关键链接、焦点环 |
| `primary-hover` | `#1D4ED8` | 主按钮悬停 |
| `primary-muted` | `#DBEAFE` | 选中条、轻量高亮背景 |
| `primary-foreground` | `#FFFFFF` | 主按钮文字 |

**次要强调（Accent Secondary）**：用于「AI / 智能」相关入口，面积小于 Primary。

| Token | Hex | 用途 |
|-------|-----|------|
| `accent-ai` | `#6366F1` | 「我没看懂」、AI 区主按钮（若与发布类主按钮同屏，则 AI 用此色区分） |
| `accent-ai-muted` | `#E0E7FF` | AI 区块浅底 |

> **落地规则**：单屏只有一个「最主」的 CTA 用 `primary`；同屏若有第二个重要操作（如「生成家长版」），仍用 `primary`；**解释类/辅助智能**用 `accent-ai`，避免两粒大蓝钮并排。

### 2.5 Semantic（状态）

| Token | 色 | Hex | 用途 |
|-------|----|-----|------|
| `success` | 绿 | `#059669` | 已发送、已反馈、完成 |
| `success-muted` | 浅绿底 | `#D1FAE5` | 成功条、标签底 |
| `warning` | 琥珀 | `#D97706` | 建议老师预览、需注意 |
| `warning-muted` | 浅琥珀底 | `#FEF3C7` | |
| `danger` | 红 | `#DC2626` | 错误、删除、阻断 |
| `danger-muted` | 浅红底 | `#FEE2E2` | |
| `info` | 蓝 | `#0284C7` | 提示条（与 primary 区分：info 偏青蓝、面积小） |

---

## 3. 关键界面映射（便于对照 UI-UX 文档）

| 界面元素 | Token 建议 |
|----------|------------|
| 老师仪表盘「新建学习卡」主按钮 | `primary` / `primary-foreground` |
| 步骤条当前步 | `primary` 或 `primary-muted` 底 + `primary` 字 |
| 家长「今晚就做」区块标题或左边线 | `primary` 左边框 3–4px 或 `primary-muted` 背景 |
| 「我没看懂」主按钮 | `accent-ai`（与全局主按钮区分时） |
| 未读角标 | `primary` 或 `danger`（二选一全局统一） |
| 已读/已反馈标签 | `success` + `success-muted` |
| 表单错误 | `danger` + `danger-muted` 底 |

---

## 4. 圆角与阴影（与 Mirror 一致）

Mirror 风格建议 **小圆角 + 轻阴影**，避免大圆胶囊堆叠。

| Token | 建议值 |
|-------|--------|
| `radius-sm` | 6px（输入框、小标签） |
| `radius-md` | 10px（卡片、按钮） |
| `radius-lg` | 14px（大面板、模态） |
| `shadow-card` | `0 1px 2px rgba(13, 17, 23, 0.06)` |
| `shadow-float` | `0 8px 24px rgba(13, 17, 23, 0.08)` |

---

## 5. Dark（可选 · 老师长时间使用）

若只做一版，可跳过；若做 Dark：**不要纯黑**，用冷蓝灰底，主色略提亮以保证对比度。

| Token | Hex |
|-------|-----|
| `bg-canvas-dark` | `#0B0F14` |
| `bg-surface-dark` | `#121826` |
| `text-primary-dark` | `#F3F4F6` |
| `text-secondary-dark` | `#9CA3AF` |
| `border-subtle-dark` | `#1F2937` |
| `primary-dark` | `#3B82F6`（或保持 `#2563EB` 视对比度调整） |

Semantic 在 Dark 上保持色相一致，仅调整 **muted 底**透明度或略降饱和。

---

## 6. 无障碍（建议）

- 正文与背景对比度：**正文 `text-primary` on `bg-surface` ≥ WCAG AA**（本组为深字浅底，一般可满足）。
- `primary` 按钮：若觉 `#2563EB` 上白字偏紧，可改为 `#1D4ED8` 作填充色（表中 `primary-hover` 可作 pressed，主色仍以品牌为准微调一次即可）。

---

## 7. Pencil / CSS 命名对应

- 在 Pencil 中可用 **变量** 与上表 `Token` 列同名或短名（如 `primary`, `bg-canvas`）。
- 在代码中（如 Tailwind）可映射为 CSS 变量：`--color-primary`, `--color-bg-canvas` 等。

---

*版本：v0.1 · 与 `UI-UX-Flows-BridgeEd.md` 配套，生成 Mirror 风界面前请先锁定本表。*
