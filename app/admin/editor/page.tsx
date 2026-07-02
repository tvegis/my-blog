"use client";

import { useRouter } from "next/navigation";
import { EditorWrapper } from "@/components/admin/editor-wrapper";
import type { EditorData } from "@/components/admin/editor-wrapper";

export default function NewPost() {
  const router = useRouter();

  const handleSave = async (data: EditorData & { publish: boolean }) => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("admin_token") : null;
    if (!token) {
      alert("登录已过期，请重新登录");
      router.push("/admin");
      throw new Error("未登录");
    }

    const body = JSON.stringify({
      title: data.title,
      slug: data.slug,
      date: data.date,
      description: data.description,
      tags: data.tags,
      draft: data.draft,
      content: data.body,
      message: data.publish ? `发布: ${data.title}` : `草稿: ${data.title}`,
    });

    console.log("[保存] 发送请求:", { slug: data.slug, title: data.title, draft: data.draft });

    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-auth": token,
      },
      body,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: `${res.status} ${res.statusText}` }));
      const msg = (errData as Record<string, unknown>)?.error as string || "保存失败";
      console.error("[保存] 失败:", msg);
      throw new Error(msg);
    }

    const result = await res.json();
    console.log("[保存] 成功:", result);
    router.push("/admin/dashboard");
  };

  return <EditorWrapper mode="create" onSave={handleSave} />;
}
