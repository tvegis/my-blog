"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";

/* ====== 类型 ====== */

interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  draft: boolean;
  body: string; // 用于估算阅读时间
}

/* ====== 工具函数 ====== */

/** 估算中文文章阅读时间 */
function estimateReadingTime(text: string | undefined): number {
  if (!text) return 1;
  return Math.max(1, Math.ceil(text.length / 500));
}

/* ====== 骨架屏 ====== */

function SkeletonRow() {
  return (
    <div className="admin-glass rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 pl-5 pr-4 py-4">
        <div className="flex-shrink-0 w-2 h-2 rounded-full admin-skeleton" />
        <div className="flex-1 space-y-2.5">
          <div className="h-5 w-1/3 admin-skeleton" />
          <div className="h-4 w-2/3 admin-skeleton" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 admin-skeleton" />
            <div className="h-3 w-16 admin-skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====== 确认删除内联组件 ====== */

function DeleteConfirm({
  title,
  onConfirm,
  onCancel,
  deleting,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className="px-5 py-3 flex items-center justify-between gap-4 text-sm"
        style={{ borderTop: "1px solid rgba(255,80,80,0.15)" }}
      >
        <span style={{ color: "rgba(255,100,100,0.8)" }}>
          确定删除「{title}」？此操作不可撤销。
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-3 py-1.5 rounded-[7px] text-xs font-medium border transition-all duration-150 disabled:opacity-40"
            style={{
              borderColor: "var(--admin-border)",
              color: "var(--admin-text)",
              background: "transparent",
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-3 py-1.5 rounded-[7px] text-xs font-medium transition-all duration-150 disabled:opacity-40"
            style={{
              background: "rgba(255,50,50,0.15)",
              border: "1px solid rgba(255,50,50,0.3)",
              color: "#ff6b6b",
            }}
          >
            {deleting ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ====== 主组件 ====== */

type FilterMode = "all" | "published" | "draft";

export default function AdminDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const router = useRouter();

  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("admin_token")
      : null;

  // 获取文章列表
  const fetchPosts = useCallback(async () => {
    if (!token) {
      router.push("/admin");
      return;
    }

    try {
      const res = await fetch("/api/admin/posts", {
        headers: { "x-admin-auth": token },
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_token");
        router.push("/admin");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        setError((data as Record<string, unknown>)?.error as string || "加载失败");
        return;
      }
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      setError("网络错误，请检查连接");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    void fetchPosts();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 组件挂载时获取数据是标准模式
  }, [fetchPosts]);

  // 筛选后的文章列表
  const filteredPosts = posts.filter((p) => {
    if (filter === "published") return !p.draft;
    if (filter === "draft") return p.draft;
    return true;
  });
  const draftCount = posts.filter((p) => p.draft).length;
  const publishedCount = posts.filter((p) => !p.draft).length;

  // 登出
  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    router.push("/admin");
  };

  // 删除文章
  const handleDelete = async (slug: string) => {
    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/admin/posts/${slug}`, {
        method: "DELETE",
        headers: { "x-admin-auth": token! },
      });
      if (!res.ok) throw new Error("删除失败");
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
      setConfirmSlug(null);
    } catch {
      alert("删除失败，请重试");
    } finally {
      setDeletingSlug(null);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div
        className="min-h-screen transition-colors duration-200"
        style={{
          background: "var(--admin-bg)",
          fontFamily: "var(--font-geist-sans), -apple-system, sans-serif",
        }}
      >
        {/* 头部骨架 */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: "var(--admin-header-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "var(--admin-border)",
          }}
        >
          <div className="flex items-baseline gap-3">
            <div className="h-6 w-24 admin-skeleton" />
            <div className="h-4 w-16 admin-skeleton" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 admin-skeleton rounded-[10px]" />
            <div className="h-9 w-9 admin-skeleton rounded-[10px]" />
          </div>
        </header>

        {/* 列表骨架 */}
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{
        background: "var(--admin-bg)",
        fontFamily: "var(--font-geist-sans), -apple-system, sans-serif",
      }}
    >
      {/* ===== 头部 ===== */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b transition-colors duration-200"
        style={{
          background: "var(--admin-header-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "var(--admin-border)",
        }}
      >
        <div className="flex items-baseline gap-3">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--admin-primary)" }}
          >
            文章管理
          </h1>
          <span
            className="text-sm font-mono"
            style={{
              color: "var(--admin-muted)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {posts.length} 篇
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 新建文章 */}
          <Link href="/admin/editor" className="admin-btn-primary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建文章
          </Link>

          {/* 返回博客 */}
          <Link href="/" className="admin-btn-ghost" title="返回博客">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>

          {/* 登出 */}
          <button onClick={handleLogout} className="admin-btn-ghost" title="登出">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ===== 主内容区 ===== */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 rounded-[10px] text-sm"
              style={{
                background: "rgba(255,50,50,0.08)",
                border: "1px solid rgba(255,50,50,0.15)",
                color: "#ff6b6b",
              }}
            >
              {error}
              <button
                onClick={() => { setError(""); fetchPosts(); }}
                className="ml-3 underline underline-offset-2 hover:opacity-80"
              >
                重试
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 筛选标签 ===== */}
        {posts.length > 0 && !loading && (
          <div className="flex items-center gap-1 mb-6">
            {([
              { key: "all" as const, label: "全部", count: posts.length },
              { key: "published" as const, label: "已发布", count: publishedCount },
              { key: "draft" as const, label: "草稿箱", count: draftCount },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className="px-3 py-1.5 text-xs rounded-[7px] font-medium border transition-all duration-150"
                style={{
                  background: filter === tab.key ? "var(--admin-card-hover-bg)" : "transparent",
                  borderColor: filter === tab.key ? "var(--admin-border-hover)" : "transparent",
                  color: filter === tab.key ? "var(--admin-primary)" : "var(--admin-muted)",
                }}
              >
                {tab.label}
                <span className="ml-1 opacity-50">{tab.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {filteredPosts.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <svg
              width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1" strokeLinecap="round"
              className="mx-auto mb-4"
              style={{ color: "rgba(255,255,255,0.1)" }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p className="mb-6" style={{ color: "var(--admin-muted)" }}>
              {filter === "draft"
                ? "草稿箱是空的"
                : filter === "published"
                  ? "还没有已发布的文章"
                  : "还没有文章，开始写第一篇吧"}
            </p>
            <Link href="/admin/editor" className="admin-btn-primary text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {posts.length === 0 ? "写第一篇文章" : "写新文章"}
            </Link>
          </motion.div>
        ) : (
          /* 文章列表 */
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.slug}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    delay: index * 0.03,
                  }}
                >
                  {/* 文章卡片 */}
                  <div
                    className="group relative rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      background: "var(--admin-card-bg)",
                      border: `1px solid ${confirmSlug === post.slug ? "rgba(255,80,80,0.15)" : "var(--admin-border)"}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--admin-border-hover)";
                      e.currentTarget.style.background = "var(--admin-card-hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = confirmSlug === post.slug ? "rgba(255,80,80,0.15)" : "var(--admin-border)";
                      e.currentTarget.style.background = "var(--admin-card-bg)";
                    }}
                  >
                    {/* 左侧状态色条 */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{
                        background: post.draft ? "#e8b840" : "#50d080",
                      }}
                    />

                    <div className="pl-5 pr-4 py-4 flex items-center gap-4">
                      {/* 状态指示点 */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${post.draft ? "admin-dot-draft" : "admin-dot-success"}`}
                        />
                        <span
                          className="text-[10px] uppercase tracking-wider font-mono"
                          style={{
                            color: post.draft ? "#e8b840" : "#50d080",
                            fontFamily: "var(--font-geist-mono), monospace",
                          }}
                        >
                          {post.draft ? "草稿" : "已发布"}
                        </span>
                      </div>

                      {/* 内容区 */}
                      <div className="flex-1 min-w-0">
                        {/* 标题 */}
                        <h2
                          className="text-base font-semibold truncate tracking-tight"
                          style={{ color: "var(--admin-primary)" }}
                        >
                          {post.title}
                        </h2>

                        {/* 描述 */}
                        {post.description && (
                          <p
                            className="text-sm mt-0.5 truncate"
                            style={{ color: "var(--admin-secondary)" }}
                          >
                            {post.description}
                          </p>
                        )}

                        {/* 元数据行 */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span
                            className="text-xs font-mono"
                            style={{
                              color: "var(--admin-muted)",
                              fontFamily: "var(--font-geist-mono), monospace",
                            }}
                          >
                            {formatDate(post.date)}
                          </span>
                          <span
                            className="text-xs font-mono"
                            style={{
                              color: "var(--admin-muted)",
                              fontFamily: "var(--font-geist-mono), monospace",
                            }}
                          >
                            {estimateReadingTime(post.body)} 分钟阅读
                          </span>
                          {post.tags?.length > 0 &&
                            post.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[11px] px-1.5 py-0.5 rounded-[5px] font-mono"
                                style={{
                                  background: "rgba(120,80,255,0.1)",
                                  color: "rgba(180,150,255,0.8)",
                                  border: "1px solid rgba(120,80,255,0.15)",
                                  fontFamily: "var(--font-geist-mono), monospace",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          {post.tags?.length > 3 && (
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--admin-muted)" }}
                            >
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 悬停编辑按钮 */}
                      <Link
                        href={`/admin/editor/${post.slug}`}
                        className="flex-shrink-0 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 rounded-lg p-2 border"
                        style={{
                          background: "var(--admin-card-bg)",
                          borderColor: "var(--admin-border)",
                          color: "var(--admin-text)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--admin-primary)";
                          e.currentTarget.style.borderColor = "var(--admin-border-hover)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--admin-text)";
                          e.currentTarget.style.borderColor = "var(--admin-border)";
                        }}
                        title="编辑文章"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Link>
                    </div>

                    {/* 删除操作区 */}
                    {confirmSlug !== post.slug && (
                      <div className="px-5 pb-3">
                        <button
                          onClick={() => setConfirmSlug(post.slug)}
                          className="text-xs font-medium transition-colors duration-150"
                          style={{ color: "var(--admin-muted)" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#ff6b6b";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--admin-muted)";
                          }}
                        >
                          删除
                        </button>
                      </div>
                    )}

                    {/* 确认删除内联面板 */}
                    <AnimatePresence>
                      {confirmSlug === post.slug && (
                        <DeleteConfirm
                          title={post.title}
                          deleting={deletingSlug === post.slug}
                          onConfirm={() => handleDelete(post.slug)}
                          onCancel={() => setConfirmSlug(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* 底部留白 */}
        <div className="h-16" />
      </main>
    </div>
  );
}
