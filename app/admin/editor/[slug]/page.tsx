"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditorWrapper } from "@/components/admin/editor-wrapper";
import type { EditorData } from "@/components/admin/editor-wrapper";

export default function EditPost() {
  const params = useParams();
  const slugFromUrl = params?.slug as string;
  const router = useRouter();
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("admin_token")
      : null;

  const [initialData, setInitialData] = useState<EditorData | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 加载已有文章数据
  useEffect(() => {
    if (!token) {
      router.push("/admin");
      return;
    }
    if (!slugFromUrl) return;

    (async () => {
      try {
        const res = await fetch(`/api/admin/posts/${slugFromUrl}`, {
          headers: { "x-admin-auth": token },
        });
        if (res.status === 401) {
          sessionStorage.removeItem("admin_token");
          router.push("/admin");
          return;
        }
        if (!res.ok) {
          setLoadError(res.status === 404 ? "文章不存在" : "加载失败");
          return;
        }
        const data = await res.json();
        setInitialData({
          title: data.title || "",
          slug: data.slug || slugFromUrl,
          date: data.date || new Date().toISOString().split("T")[0],
          description: data.description || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          draft: data.draft ?? true,
          body: data.body || "",
        });
      } catch {
        setLoadError("网络错误");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, slugFromUrl, router]);

  const handleSave = async (data: EditorData & { publish: boolean }) => {
    if (!token) throw new Error("未登录");

    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-auth": token,
      },
      body: JSON.stringify({
        title: data.title,
        slug: data.slug,
        date: data.date,
        description: data.description,
        tags: data.tags,
        draft: data.draft,
        content: data.body,
        message: data.publish
          ? `发布: ${data.title}`
          : `更新: ${data.title}`,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({} as Record<string, unknown>));
      throw new Error((errData as Record<string, unknown>)?.error as string || "保存失败");
    }

    router.push("/admin/dashboard");
  };

  const handleDelete = async () => {
    if (!token) throw new Error("未登录");

    const res = await fetch(`/api/admin/posts/${slugFromUrl}`, {
      method: "DELETE",
      headers: { "x-admin-auth": token },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({} as Record<string, unknown>));
      throw new Error((errData as Record<string, unknown>)?.error as string || "删除失败");
    }

    router.push("/admin/dashboard");
  };

  // 加载状态
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-mono"
        style={{ background: "var(--admin-bg)" }}
      >
        <div className="text-center" style={{ color: "var(--admin-muted)" }}>
          <div
            className="mx-auto mb-4 w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              borderTopColor: "rgba(120,80,255,0.8)",
            }}
          />
          <p className="text-sm">加载文章中...</p>
        </div>
      </div>
    );
  }

  // 加载错误
  if (loadError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-mono"
        style={{ background: "var(--admin-bg)" }}
      >
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{loadError}</p>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="admin-btn-primary text-sm"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <EditorWrapper
      mode="edit"
      initialData={initialData}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
}
