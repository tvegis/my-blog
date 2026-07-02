"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from "@uiw/react-md-editor";

/* ====== 工具 ====== */

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s一-鿿-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "untitled";
}

function estimateReadingTime(text: string): number {
  return Math.max(1, Math.ceil(text.length / 500));
}

/* ====== 类型 ====== */

export interface EditorData {
  title: string;
  slug: string;
  date: string;
  description: string;
  tags: string[];
  draft: boolean;
  body: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: EditorData;
  onSave: (data: EditorData & { publish: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

/* ====== 组件 ====== */

export function EditorWrapper({ mode, initialData, onSave, onDelete }: Props) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 确保从 sessionStorage 读 token（客户端才可用）
  const getToken = useCallback(() => {
    return typeof window !== "undefined" ? sessionStorage.getItem("admin_token") : null;
  }, []);

  // 表单
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split("T")[0]);
  const [desc, setDesc] = useState(initialData?.description || "");
  const [tagsStr, setTagsStr] = useState(initialData?.tags?.join(", ") || "");
  const [draft, setDraft] = useState(initialData?.draft ?? true);
  const [body, setBody] = useState(
    initialData?.body || (mode === "create" ? "# 新文章\n\n在这里开始写作..." : "")
  );

  // UI
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [metaOpen, setMetaOpen] = useState(mode === "create");
  const slugTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDark = mounted ? resolvedTheme !== "light" : true;
  const readingTime = estimateReadingTime(body);

  // mount
  useEffect(() => { setMounted(true); }, []);

  // 认证
  useEffect(() => {
    if (mounted && !getToken()) router.push("/admin");
  }, [mounted, getToken, router]);

  // 中文命令
  const [cnCmds, setCnCmds] = useState<{ getCommands: () => unknown[]; getExtraCommands: () => unknown[] } | null>(null);
  useEffect(() => {
    import("@uiw/react-md-editor/commands-cn").then(setCnCmds).catch(() => {});
  }, []);

  // 保存
  const handleSave = useCallback(
    async (publish: boolean) => {
      const tok = getToken();
      if (!tok) { setError("登录已过期"); return; }
      if (!title.trim()) { setError("请输入标题"); return; }
      if (!slug.trim()) { setError("请输入 slug"); return; }

      const tags = tagsStr.split(/[,，、\s]+/).filter(Boolean);
      setSaving(true);
      setError("");

      try {
        await onSave({ title: title.trim(), slug: slug.trim(), date, description: desc.trim(), tags, draft, body, publish });
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存失败");
      } finally {
        setSaving(false);
      }
    },
    [getToken, title, slug, date, desc, tagsStr, draft, body, onSave]
  );

  // 删除
  const doDelete = useCallback(async () => {
    if (!onDelete) return;
    const tok = getToken();
    if (!tok) { setError("登录已过期"); return; }
    if (!confirm(`确定删除「${title || "这篇文章"}」？此操作不可撤销。`)) return;
    setDeleting(true);
    setError("");
    try { await onDelete(); } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
      setDeleting(false);
    }
  }, [getToken, title, onDelete]);

  // Cmd+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(draft); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleSave, draft]);

  // slug auto
  const onTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited) {
      clearTimeout(slugTimer.current);
      slugTimer.current = setTimeout(() => setSlug(generateSlug(val)), 300);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen font-sans" style={{ background: "var(--ed-bg)" }}>
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b gap-4"
        style={{ background: "var(--ed-header-bg)", backdropFilter: "blur(16px)", borderColor: "var(--ed-border)" }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link href="/admin/dashboard" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg flex-shrink-0" style={{ color: "var(--ed-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            <span className="text-sm hidden sm:inline">返回</span>
          </Link>
          <div className="flex-1 min-w-0">
            <input type="text" value={title} onChange={e => onTitleChange(e.target.value)} placeholder="文章标题"
              className="w-full bg-transparent border-none outline-none font-semibold text-lg tracking-tight"
              style={{ color: "var(--ed-text)" }} />
            {slug && <span className="block text-xs mt-0.5 font-mono" style={{ color: "var(--ed-text-slug)" }}>/posts/{slug} · {readingTime} 分钟阅读</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--ed-border-mid)", color: "var(--ed-text-muted)" }}
            title={isDark ? "切换亮色模式" : "切换暗色模式"}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          {mode === "edit" && (
            <button type="button" onClick={doDelete} disabled={deleting || saving}
              className="px-4 py-2 rounded-[9px] text-sm font-medium border disabled:opacity-40"
              style={{ background: "transparent", borderColor: "rgba(255,80,80,0.2)", color: "rgba(255,100,100,0.6)" }}>
              {deleting ? "删除中..." : "删除"}
            </button>
          )}
          <button type="button" onClick={() => handleSave(false)} disabled={saving}
            className="px-4 py-2 rounded-[9px] text-sm font-medium border disabled:opacity-40"
            style={{ background: "var(--ed-btn-save-bg)", borderColor: "var(--ed-border-mid)", color: "var(--ed-btn-save-text)" }}>
            {saving ? "保存中..." : "保存草稿"}
          </button>
          <button type="button" onClick={() => handleSave(true)} disabled={saving}
            className="admin-btn-primary text-sm px-4 py-2 rounded-[9px]">
            {saving ? "发布中..." : "发布"}
          </button>
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="max-w-[1000px] mx-auto px-6 py-6">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 rounded-[10px] text-sm"
              style={{ background: "rgba(255,50,50,0.08)", border: "1px solid rgba(255,50,50,0.15)", color: "#ff6b6b" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Meta Panel ===== */}
        <div className="mb-6 rounded-[12px] overflow-hidden" style={{ background: "var(--ed-meta-bg)", border: `1px solid ${metaOpen ? "var(--ed-border)" : "transparent"}` }}>
          <button type="button" onClick={() => setMetaOpen(!metaOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm" style={{ color: "var(--ed-text-label)" }}>
            <span className="font-mono text-xs uppercase tracking-[0.05em]">文章元数据</span>
            <motion.svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              animate={{ rotate: metaOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <polyline points="6 9 12 15 18 9"/>
            </motion.svg>
          </button>
          <AnimatePresence initial={false}>
            {metaOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="px-5 pb-4 space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-mono uppercase tracking-[0.05em] mb-1.5" style={{ color: "var(--ed-text-label)" }}>Slug</label>
                      <input type="text" value={slug} onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
                        placeholder="article-slug" className="w-full px-3 py-2 rounded-[8px] text-sm outline-none border font-mono"
                        style={{ background: "var(--ed-input-bg)", borderColor: "var(--ed-border-input)", color: "var(--ed-text-secondary)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-mono uppercase tracking-[0.05em] mb-1.5" style={{ color: "var(--ed-text-label)" }}>日期</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-[8px] text-sm outline-none border"
                        style={{ background: "var(--ed-input-bg)", borderColor: "var(--ed-border-input)", color: "var(--ed-text-secondary)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-mono uppercase tracking-[0.05em] mb-1.5" style={{ color: "var(--ed-text-label)" }}>状态</label>
                      <div className="flex rounded-[8px] overflow-hidden border" style={{ borderColor: "var(--ed-border-input)" }}>
                        <button type="button" onClick={() => setDraft(true)} className="flex-1 py-2 text-xs font-medium"
                          style={{ background: draft ? "rgba(232,184,64,0.15)" : "transparent", color: draft ? "#e8b840" : "var(--ed-text-muted)", border: "none", cursor: "pointer" }}>草稿</button>
                        <button type="button" onClick={() => setDraft(false)} className="flex-1 py-2 text-xs font-medium"
                          style={{ background: !draft ? "rgba(80,208,128,0.15)" : "transparent", color: !draft ? "#50d080" : "var(--ed-text-muted)", border: "none", cursor: "pointer" }}>已发布</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.05em] mb-1.5" style={{ color: "var(--ed-text-label)" }}>描述</label>
                    <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="文章摘要..."
                      className="w-full px-3 py-2 rounded-[8px] text-sm outline-none border"
                      style={{ background: "var(--ed-input-bg)", borderColor: "var(--ed-border-input)", color: "var(--ed-text-secondary)" }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.05em] mb-1.5" style={{ color: "var(--ed-text-label)" }}>标签（逗号分隔）</label>
                    <input type="text" value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="nextjs, react, web"
                      className="w-full px-3 py-2 rounded-[8px] text-sm outline-none border font-mono"
                      style={{ background: "var(--ed-input-bg)", borderColor: "var(--ed-border-input)", color: "var(--ed-text-secondary)" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== Editor ===== */}
        <div className="rounded-[12px] overflow-hidden border" style={{ borderColor: "var(--ed-border)" }} data-color-mode={resolvedTheme ?? "dark"}>
          <MDEditor value={body} onChange={val => setBody(val || "")} height={mode === "create" ? 600 : 650}
            visibleDragbar={false} preview="live"
            commands={cnCmds?.getCommands() as []} extraCommands={cnCmds?.getExtraCommands() as []} />
        </div>
      </div>

      {/* ===== MDEditor CSS ===== */}
      <style jsx global>{`
        .w-md-editor-toolbar{background:var(--ed-toolbar-bg)!important;border-bottom:1px solid var(--ed-toolbar-border)!important;padding:4px 8px!important;border-radius:0!important;height:auto!important;min-height:38px!important}
        .w-md-editor-toolbar li>button{color:var(--ed-toolbar-btn)!important;transition:all .15s!important;border-radius:6px!important;padding:4px 6px!important;min-width:30px!important;height:28px!important;background:transparent!important;border:none!important;cursor:pointer!important}
        .w-md-editor-toolbar li>button:hover{color:var(--ed-toolbar-btn-hover)!important;background:var(--ed-hover-bg)!important}
        .w-md-editor-toolbar li>button.active{color:var(--ed-toolbar-btn-active)!important;background:rgba(120,80,255,.15)!important}
        .w-md-editor-toolbar-divider{background:var(--ed-toolbar-border)!important;margin:2px 4px!important;height:20px!important;width:1px!important}
        .w-md-editor-text{background:transparent!important;padding:0!important}
        .w-md-editor-text-pre{background:rgba(255,255,255,.01)!important;border-right:1px solid var(--ed-border)!important;border-radius:0!important}
        :root:not(.dark) .w-md-editor-text-pre{background:rgba(0,0,0,.01)!important}
        .w-md-editor-text-pre>code,.w-md-editor-text-input{font-family:var(--font-geist-mono),monospace!important;font-size:14px!important;line-height:1.7!important;color:var(--ed-text)!important;-webkit-text-fill-color:var(--ed-text)!important}
        .w-md-editor-preview{background:var(--ed-surface)!important;box-shadow:inset 0 0 0 1px var(--ed-border)!important;padding:2rem!important}
        .w-md-editor-preview .wmde-markdown{background:transparent!important;color:var(--ed-text)!important;font-size:15px!important;line-height:1.8!important}
        .w-md-editor-preview h1,.w-md-editor-preview h2,.w-md-editor-preview h3{color:var(--ed-text)!important;border-bottom:none!important;font-weight:600!important}
        .w-md-editor-preview p{color:var(--ed-text-secondary)!important}
        .w-md-editor-preview a{color:#a78bfa!important}
        .w-md-editor-preview pre{background:rgba(0,0,0,.35)!important;border:1px solid rgba(120,80,255,.15)!important;border-radius:8px!important;padding:1rem!important}
        .w-md-editor-preview code{font-family:var(--font-geist-mono),monospace!important;font-size:13px!important}
        .w-md-editor-preview blockquote{border-left:3px solid #8b5cf6!important;color:var(--ed-text-muted)!important;padding-left:1rem!important}
        .w-md-editor{background:transparent!important}
        .w-md-editor-content{background:transparent!important}
      `}</style>
    </div>
  );
}
