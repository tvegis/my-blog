/**
 * Parse frontmatter from MDX content.
 * Supports both YAML list format (tags:\n  - tag1\n  - tag2)
 * and inline array format (tags: [tag1, tag2]).
 */
export function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { title: "Untitled", date: "", description: "", tags: [], draft: false, body: raw };

  const fm: Record<string, any> = {};
  const lines = match[1].split("\n");
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const line of lines) {
    // YAML list continuation (lines starting with "  - ")
    const listMatch = line.match(/^\s{2,}-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (currentList === null) {
        currentList = [];
        fm[currentKey] = currentList;
      }
      currentList.push(listMatch[1].trim());
      continue;
    }

    // Flush any accumulated list
    currentKey = null;
    currentList = null;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let val: any = line.slice(colonIdx + 1).trim();

    // Check if value is empty — might be a YAML list header
    if (val === "") {
      currentKey = key;
      currentList = null;
      continue;
    }

    if (val.startsWith("[") && val.endsWith("]")) {
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch { val = []; }
    } else if (val === "true") val = true;
    else if (val === "false") val = false;

    fm[key] = val;
  }

  return {
    title: fm.title || "Untitled",
    date: fm.date || "",
    description: fm.description || "",
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    draft: fm.draft ?? false,
    body: match[2].trim(),
  };
}

export function buildMDX(data: { title: string; date: string; description: string; tags: string[]; draft: boolean; content: string }) {
  const tagsStr = data.tags.length > 0
    ? `\n${data.tags.map((t) => `  - ${t}`).join("\n")}`
    : " []";
  return `---
title: "${data.title.replace(/"/g, '\\"')}"
date: ${data.date}
description: "${data.description.replace(/"/g, '\\"')}"
tags:${tagsStr}
draft: ${data.draft}
---

${data.content.trim()}`;
}
