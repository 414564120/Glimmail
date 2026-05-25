# Glimmail Awwwards Design System

This document defines the visual direction for the Glimmail redesign. It is inspired by Awwwards-level web craft, but Glimmail remains a productivity tool. Visual energy must improve orientation and confidence, not block mail processing.

## Design Intent

Glimmail should feel like a modern aggregated mail cockpit:

- Chinese-first.
- Dark editorial shell.
- Bright content islands.
- High-contrast source colors.
- Independent work panes.
- Motion used for orientation.
- Email reading remains clear and fast.

The current visual reference is `design-preview-zh.html`.

## Core Layout

Desktop layout has four zones:

1. `.rail`: fixed left navigation dock.
2. `.split`: split inbox and message list with its own smooth scroll.
3. `.reader`: message reader with its own smooth scroll.
4. `.context`: fixed right context stack.

Rules:

- Left and right rails stay fixed in the viewport.
- `.split` and `.reader` scroll independently.
- `.reader` owns the reading experience and should receive the most horizontal space.
- `.context` provides metadata, account status, and sync activity without becoming the primary surface.
- Mobile falls back to message-list-first navigation.

## Color System

Use a bold but controlled palette:

- Deep ink: page shell and dark panels.
- Ivory paper: reader and mail content.
- Acid lime: primary accent and active states.
- Cyan blue: Outlook and informational accents.
- Coral red: delete, danger, and 163 accents.
- Mint green: Gmail or connected state.
- Muted text: secondary metadata and timestamps.

Do not reintroduce:

- Purple neon gradients.
- Decorative glassmorphism as the default surface.
- Large gradient text.
- Generic gray card grids.

## Typography

- Use strong display hierarchy for page titles and message titles.
- Keep message lists compact and scannable.
- Use monospace for timestamps, verification codes, and technical counters.
- Chinese text must fit buttons and badges without clipping.
- Do not use oversized hero treatment inside dense tool panels.

## Component Rules

### Rail

- Compact dock style.
- Active route is obvious but not noisy.
- Use short labels or icons in the prototype, then accessible labels in production.

### Split Inbox

- Show aggregate status such as `今日处理`, unread count, connected accounts, and last sync.
- Use chips for split views:
  - 全部
  - 重要
  - 验证码
  - 通知
  - 订阅
  - 未读
- Account filters must show provider source:
  - Gmail
  - Outlook
  - 163 邮箱

### Mail Item

Each item must show:

- sender
- subject
- preview
- received time
- provider/source
- category badge when useful
- quick actions on hover

Quick actions:

- 星标
- 归档
- 删除

Delete must be directly available. It may be visually quiet by default, but it cannot be hidden only in `更多`.

### Reader

Reader toolbar must include:

- 星标
- 标为未读 or 标为已读
- 归档
- 删除
- 更多

The message body must stay readable. Motion and decoration must not disturb long text reading.

### Verification Code

Verification code module must:

- Stand out from normal text.
- Use monospace digits.
- Include a clear copy action.
- Avoid logging or exposing raw message content outside the UI.

### Context Stack

Context cards show:

- current source account
- sync time
- category
- sender history placeholder
- connected accounts
- recent sync activity
- sync/test/re-authorize actions

## Motion Rules

Allowed:

- Page stagger reveal.
- Mail item reveal.
- Subtle hover translation.
- Active chip indicator.
- Sync breathing dot.
- Loading skeleton shimmer.
- Reader title scroll micro-scale.
- Verification module reveal.

Rules:

- Use Lenis for independent `.split` and `.reader` smooth scroll if the implementation task approves the dependency.
- Use GSAP for entry and scroll-linked effects if the implementation task approves the dependency.
- Respect `prefers-reduced-motion`.
- Disable or reduce smooth scrolling on small screens if it causes jank.
- Avoid heavy pinned scroll scenes and scroll hijacking.

Production dependency rule:

- `design-preview-zh.html` may use CDN scripts for exploration.
- Next.js production code must not use CDN scripts.
- Before using Lenis or GSAP in production code, check `package.json`, add dependencies deliberately, and isolate animated client components.

## Loading And Empty States

Loading:

- Use skeleton shimmer, not generic spinner.
- Skeleton must match the final layout size.
- Sync state may use a breathing dot.

Empty states:

- Be concrete and actionable.
- Example: `连接邮箱并同步后，邮件会出现在这里。`

Errors:

- Use safe user-facing messages.
- Never render raw provider error bodies.
- Never render tokens or secrets.

## Accessibility And Fallbacks

- Buttons must have clear text or accessible labels.
- Color cannot be the only state indicator.
- Focus states must remain visible.
- Reduced motion must be respected.
- Small screens must remain readable even if advanced motion is disabled.

