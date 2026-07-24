// Frosted-glass dock — canvasui Frost falls back to CSS backdrop blur when
// html-in-canvas is unavailable, which is what almost every browser gets:
// a static frozen pane. Slides up after the boot dust settles.

import type { JSX } from "solid-js"

export interface DockItem {
  id: string
  glyph: string
  label: string
  active?: boolean
}

export default function Dock(props: {
  shown: boolean
  workspaces: DockItem[]
  apps: DockItem[]
  onWorkspace: (id: string) => void
  onApp: (id: string) => void
}) {
  const button = (item: DockItem, onClick: () => void): JSX.Element => (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      onClick={onClick}
      class={`flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-xs transition-colors ${
        item.active
          ? "border-rose-accent/60 bg-rose-accent/15 text-rose-accent"
          : "border-transparent bg-white/[0.03] text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
      }`}
    >
      {item.glyph}
    </button>
  )

  return (
    <div class="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
      <nav
        class="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-neutral-950/55 px-2.5 py-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
        style={{
          transform: props.shown ? "translateY(0)" : "translateY(140%)",
          opacity: props.shown ? 1 : 0,
          transition: "transform 0.7s cubic-bezier(0.2, 1.2, 0.3, 1), opacity 0.5s",
        }}
        aria-label="dock"
      >
        {props.workspaces.map((ws) => button(ws, () => props.onWorkspace(ws.id)))}
        <span class="mx-1 h-6 w-px bg-white/10" />
        {props.apps.map((app) => button(app, () => props.onApp(app.id)))}
      </nav>
    </div>
  )
}
