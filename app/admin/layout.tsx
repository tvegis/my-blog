"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const DARK_VARS = `--ed-bg:#08080d;--ed-surface:rgba(255,255,255,0.03);--ed-surface-hover:rgba(255,255,255,0.05);--ed-header-bg:rgba(8,8,13,0.9);--ed-border:rgba(255,255,255,0.05);--ed-border-mid:rgba(255,255,255,0.08);--ed-border-input:rgba(255,255,255,0.08);--ed-meta-bg:rgba(255,255,255,0.02);--ed-input-bg:rgba(255,255,255,0.04);--ed-hover-bg:rgba(255,255,255,0.06);--ed-btn-save-bg:rgba(255,255,255,0.06);--ed-text:#f0f0f0;--ed-text-secondary:#e0e0e0;--ed-text-muted:rgba(255,255,255,0.4);--ed-text-label:rgba(255,255,255,0.35);--ed-text-placeholder:rgba(255,255,255,0.2);--ed-text-slug:rgba(255,255,255,0.25);--ed-btn-save-text:rgba(255,255,255,0.7);--ed-accent:#7850ff;--ed-accent-glow:rgba(120,80,255,0.2);--ed-success:#50d080;--ed-warning:#e8b840;--ed-danger:#ff6b6b;--ed-toolbar-bg:rgba(255,255,255,0.02);--ed-toolbar-border:rgba(255,255,255,0.05);--ed-toolbar-btn:rgba(255,255,255,0.4);--ed-toolbar-btn-hover:#f0f0f0;--ed-toolbar-btn-active:rgba(180,150,255,0.9);--ed-card-radius:12px;--ed-input-radius:8px;--admin-bg:#08080d;--admin-header-bg:rgba(8,8,13,0.9);--admin-border:rgba(255,255,255,0.05);--admin-border-hover:rgba(255,255,255,0.1);--admin-card-bg:rgba(255,255,255,0.02);--admin-card-hover-bg:rgba(255,255,255,0.04);--admin-primary:#f0f0f0;--admin-secondary:rgba(255,255,255,0.5);--admin-muted:rgba(255,255,255,0.3);--admin-text:rgba(255,255,255,0.4)`;

const LIGHT_VARS = `--ed-bg:#f8f7f4;--ed-surface:rgba(0,0,0,0.02);--ed-surface-hover:rgba(0,0,0,0.04);--ed-header-bg:rgba(248,247,244,0.9);--ed-border:rgba(0,0,0,0.06);--ed-border-mid:rgba(0,0,0,0.1);--ed-border-input:rgba(0,0,0,0.08);--ed-meta-bg:rgba(0,0,0,0.02);--ed-input-bg:rgba(0,0,0,0.03);--ed-hover-bg:rgba(0,0,0,0.04);--ed-btn-save-bg:rgba(0,0,0,0.04);--ed-text:#1a1a1a;--ed-text-secondary:#2a2a2a;--ed-text-muted:rgba(0,0,0,0.45);--ed-text-label:rgba(0,0,0,0.4);--ed-text-placeholder:rgba(0,0,0,0.25);--ed-text-slug:rgba(0,0,0,0.3);--ed-btn-save-text:rgba(0,0,0,0.6);--ed-accent:#7850ff;--ed-accent-glow:rgba(120,80,255,0.15);--ed-success:#22a85a;--ed-warning:#c89820;--ed-danger:#d94040;--ed-toolbar-bg:rgba(0,0,0,0.02);--ed-toolbar-border:rgba(0,0,0,0.06);--ed-toolbar-btn:rgba(0,0,0,0.4);--ed-toolbar-btn-hover:#1a1a1a;--ed-toolbar-btn-active:rgba(100,60,220,0.9);--ed-card-radius:12px;--ed-input-radius:8px;--admin-bg:#f8f7f4;--admin-header-bg:rgba(248,247,244,0.9);--admin-border:rgba(0,0,0,0.06);--admin-border-hover:rgba(0,0,0,0.1);--admin-card-bg:rgba(0,0,0,0.02);--admin-card-hover-bg:rgba(0,0,0,0.04);--admin-primary:#1a1a1a;--admin-secondary:rgba(0,0,0,0.5);--admin-muted:rgba(0,0,0,0.3);--admin-text:rgba(0,0,0,0.4)`;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = resolvedTheme !== "light";

  return (
    <>
      {mounted && <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `:root{${isDark ? DARK_VARS : LIGHT_VARS}}`,
        }}
      />}
      <style jsx global>{`
        /* 1. Restore system cursor on admin pages */
        html[data-route="admin"] * {
          cursor: auto !important;
        }
        /* 2. Hide site header & footer on admin pages */
        html[data-route="admin"] body > header,
        html[data-route="admin"] body > footer {
          display: none !important;
        }
        /* 3. Remove top padding from main (normally pt-16 for the header) */
        html[data-route="admin"] main {
          padding-top: 0 !important;
        }
      `}</style>
      {children}
    </>
  );
}
