"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * ThemeSwitcher — sets data-theme on <html> and remembers the choice.
 * Drop anywhere in the app (mounted globally in layout.tsx). Remove it and
 * hard-code one theme via <html data-theme="lacquer"> for a single look.
 *
 * The selected theme is treated as an external store (localStorage), read
 * with useSyncExternalStore so there is no setState-inside-effect and it
 * stays in sync across tabs.
 */
const THEMES = [
  { id: "lacquer", label: "Sơn Son", swatch: ["#9e1b1b", "#c69a3e", "#f7efe0"] },
  { id: "paper", label: "Giấy Dó", swatch: ["#b23a25", "#9c7a3c", "#ece2cd"] },
  { id: "bronze", label: "Trống Đồng", swatch: ["#1f6f5c", "#c9a227", "#e6ece6"] },
] as const;

const KEY = "giapha-theme";
const DEFAULT = "lacquer";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function getSnapshot() {
  return localStorage.getItem(KEY) || DEFAULT;
}
function getServerSnapshot() {
  return DEFAULT;
}
function setTheme(id: string) {
  localStorage.setItem(KEY, id);
  listeners.forEach((l) => l());
}

export default function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mirror the chosen theme onto <html> (DOM side effect, no React state).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("gp-themed");
  }, [theme]);

  return (
    <div
      style={{
        position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", zIndex: 200,
        display: "flex", gap: 4, padding: 6, borderRadius: 9999, background: "rgba(28,20,16,.88)",
        backdropFilter: "blur(8px)", boxShadow: "0 12px 30px rgba(0,0,0,.3)",
        border: "1px solid rgba(255,255,255,.12)",
      }}
    >
      {THEMES.map((t) => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 9, border: 0, cursor: "pointer",
              borderRadius: 9999, padding: "8px 16px", fontSize: 13, fontWeight: 600,
              color: active ? "#1c1410" : "rgba(255,255,255,.72)",
              background: active ? "#f3ead9" : "transparent", transition: "all .25s",
            }}
          >
            <span style={{ display: "flex", gap: 2 }}>
              {t.swatch.map((c, i) => (
                <span key={i} style={{ width: 9, height: 9, borderRadius: 9999, background: c }} />
              ))}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
