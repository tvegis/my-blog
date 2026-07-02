import { NextResponse } from "next/server";
import { parseFrontmatter, buildMDX } from "@/lib/frontmatter";

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const OWNER = "tvegis";
const REPO = "my-blog";
const POSTS_PATH = "content/posts";
const BRANCH = "main";
const API = "https://api.github.com";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function getHeaders() {
  if (!GITHUB_TOKEN) return null;
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "my-blog-admin",
  };
}

export async function GET(request: Request) {
  const pw = request.headers.get("x-admin-auth");
  if (pw !== process.env.ADMIN_PASSWORD) return unauthorized();

  const headers = getHeaders();
  if (!headers)
    return NextResponse.json(
      { error: "GitHub token not configured" },
      { status: 500 }
    );

  const url = `${API}/repos/${OWNER}/${REPO}/contents/${POSTS_PATH}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `GitHub API error: ${res.status}`, detail: text },
        { status: 502 }
      );
    }

    const files = await res.json();
    const posts = await Promise.all(
      files
        .filter((f: any) => f.name.endsWith(".mdx") && f.type === "file")
        .map(async (f: any) => {
          const contentRes = await fetch(f.url, { headers });
          if (!contentRes.ok) return null;
          const data = await contentRes.json();
          const decoded = Buffer.from(data.content, "base64").toString("utf-8");
          const post = parseFrontmatter(decoded);
          return {
            slug: f.name.replace(/\.mdx$/, ""),
            sha: data.sha,
            ...post,
          };
        })
    );

    const valid = posts.filter(Boolean).sort(
      (a: any, b: any) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

    return NextResponse.json({ posts: valid });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const pw = request.headers.get("x-admin-auth");
  if (pw !== process.env.ADMIN_PASSWORD) return unauthorized();

  const headers = getHeaders();
  if (!headers)
    return NextResponse.json(
      { error: "GitHub token not configured" },
      { status: 500 }
    );

  try {
    const body = await request.json();
    const { title, date, description, tags, draft, content, slug } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    const mdxContent = buildMDX({
      title,
      date: date || new Date().toISOString().split("T")[0],
      description: description || "",
      tags: tags || [],
      draft: draft ?? true,
      content: content || "",
    });

    const path = `${POSTS_PATH}/${slug}.mdx`;
    const url = `${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;

    // Check if file exists to get SHA
    const existRes = await fetch(url, { headers });
    let sha: string | undefined;
    if (existRes.ok) {
      const existData = await existRes.json();
      sha = existData.sha;
    }

    const putRes = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message || `Update ${slug}.mdx`,
        content: Buffer.from(mdxContent).toString("base64"),
        sha,
        branch: BRANCH,
      }),
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      return NextResponse.json(
        { error: `GitHub API error: ${putRes.status}`, detail: text },
        { status: 502 }
      );
    }

    const result = await putRes.json();
    return NextResponse.json({
      success: true,
      slug,
      sha: result.content?.sha,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save post" },
      { status: 500 }
    );
  }
}

