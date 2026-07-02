# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**使用中文回答所有问题，所有回复、注释和文档均使用中文。**

## Commands

```bash
npm run dev        # Development server (port 3000, uses webpack)
npm run build      # Production build — runs Velite content gen first, then next build
npm start          # Production server
npm run lint       # ESLint (Next.js core-web-vitals + typescript configs)
npm run content    # Run Velite standalone to regenerate .velite from content/posts/
```

- Uses `--webpack` on both dev and build. The project targets `ES2017` with strict TypeScript.
- Path alias: `@/*` → `./*`; Velite content: `#site/content` → `./.velite`.

## Architecture

### Content Pipeline (Velite)

Posts live as `.mdx` files in `content/posts/`. Velite (`velite.config.ts`) processes them into `.velite/` at build time (or via `npm run content`). Each post has frontmatter: `title`, `date`, `description`, `tags[]`, `cover?`, `draft`, and the MDX body becomes `code` (a string containing compiled JSX). Velite also extracts `metadata` (word count, reading time) and `slug` from the file path.

### Data Access Layer (`lib/posts.ts`)

Central module that imports `posts` from `#site/content` (Velite output). All post queries go through this file:
- `getPosts()` — published posts, sorted by date desc, filters out drafts
- `getPostBySlug(slug)` — single post by slug
- `getPostsByTag(tag)` — filter by tag
- `getAllTags()` — returns `{tag, count}[]` sorted by count
- `getRelatedPosts(slug, limit)` — posts sharing tags with the given post

### Public Site (Server Components + Client Islands)

- **Pages** (`app/`): Home (`/`), About (`/about`), Tags (`/tags`, `/tags/[tag]`), Posts (`/posts/[slug]`), plus `sitemap.ts`, `robots.ts`, `rss.xml/route.ts`.
- **Layout** (`app/layout.tsx`): Root layout wraps everything in `ThemeProvider` (next-themes, `class` strategy, default dark), includes `ScrollProgress`, `EffectsController`, `Header`, and `Footer`.
- `EffectsController` checks `usePathname()` — on `/admin/*` routes it returns null (no particle bg or custom cursor), and sets `data-route="admin"` on `<html>`.
- **MDX Rendering** (`components/mdx/index.tsx`): Client component that evaluates MDX code via `new Function(code)` to produce a React component. Custom component overrides for `h2`/`h3` (adds `id`), `a` (internal vs external links), `img` (→ `ImageViewer` with lightbox), `pre` (→ `CodeBlock` with copy button and syntax highlighting), and inline `code`.
- **Code blocks** (`components/posts/code-block.tsx`): Styled with gradient border, macOS dots, language label, copy-to-clipboard. Uses `rehype-pretty-code` + `shiki` for syntax highlighting.
- **TOC** (`components/posts/toc.tsx`): Client-side — extracts h2/h3 from `.prose` after render, uses `useScrollSpy` (IntersectionObserver) to highlight active heading.
- **Search** (`components/search/search-dialog.tsx`): ⌘K-triggered modal, fetches posts from `/api/search` on first open, client-side filtering by title/description/tags.

### Admin Panel (Fully Client-Side)

Routes under `/admin/*`:
- `/admin` — Login page. Validates password against `ADMIN_PASSWORD` env var via `POST /api/admin/auth`. Stores token in `sessionStorage`.
- `/admin/dashboard` — Lists all posts from GitHub API (including drafts). Delete button calls `DELETE /api/admin/posts/[slug]`.
- `/admin/editor` — New post editor. Uses `@uiw/react-md-editor` (dynamically imported, no SSR). Slugs are auto-generated from title.
- `/admin/editor/[slug]` — Edit existing post. Fetches post content via `GET /api/admin/posts/[slug]`, then same editor UI.

**Shared utilities** (`lib/frontmatter.ts`): `parseFrontmatter()` and `buildMDX()` — handles both YAML list and inline array tag formats.

**Admin theme**: `app/admin/layout.tsx` injects CSS variables via `<style>` for dark/light mode based on `resolvedTheme`. Also hides site header/footer and removes custom cursor via CSS scoped to `html[data-route="admin"]`.

**Admin API routes** (all require `x-admin-auth` header matching `ADMIN_PASSWORD`):
- `POST /api/admin/auth` — validate password
- `GET /api/admin/posts` — list all posts from GitHub content API
- `POST /api/admin/posts` — create/update a post via GitHub API (PUT to `content/posts/{slug}.mdx`)
- `GET /api/admin/posts/[slug]` — get single post with decoded content
- `DELETE /api/admin/posts/[slug]` — delete post from GitHub

### Environment Variables

| Variable | Required For |
|---|---|
| `ADMIN_PASSWORD` | Admin login and all admin API routes |
| `GITHUB_ACCESS_TOKEN` | Admin CRUD operations (read/write/delete posts on GitHub) |

The blog is deployed to `https://tvegis-blog.vercel.app`. The GitHub repo is `tvegis/my-blog` on the `main` branch.

### CSS / Styling

- Tailwind CSS 4 with `@tailwindcss/postcss`. CSS variables in `globals.css` for light/dark themes.
- Utility classes: `.glass` (glassmorphism), `.gradient-text`, `.glow`, `.prose` (article content).
- Translation blocking (`translate="no"`) throughout to prevent browser translation plugins from breaking DOM (relevant because site content is Chinese).
- `contain: layout style` on `[data-motion]`, `canvas`, and `.glass` elements for layout stability.
- Custom cursor (`mix-blend-difference`) disabled on mobile and admin routes.

### Key Dependencies

- **framer-motion** — animations throughout (header, hero, page transitions, code blocks)

## Maintenance

每次处理该项目时，执行以下清理检查：

1. **扫描无用文件**: 检查 `hooks/`、`lib/`、`components/` 下是否有未使用的文件（定义后未被任何地方 import）
2. **扫描空目录**: 检查 `app/`、`public/`、`components/` 下是否有空目录
3. **检查未使用的 npm 依赖**: 运行 `npm ls` 确认是否有未在源码中 import 的包
4. **检查 git 追踪问题**: 确认 `.env*`、`*.tsbuildinfo`、`next-env.d.ts` 等生成文件未被 git 追踪
5. **检查 CSS 变量兼容性**: 确认所有 admin 页面的颜色使用 CSS 变量（`var(--admin-*)` / `var(--ed-*)`），而非硬编码的 `rgba(255,255,255,...)`
6. **检查重复代码**: 确认没有重复的 `parseFrontmatter`、`estimateReadingTime` 等函数
