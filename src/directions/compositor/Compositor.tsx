// Compositor — the browser tab boots into a riced Wayland desktop.
// Boot TTY -> dust dissolve -> cloth-draped windows -> liquid dye wallpaper ->
// callrelay overlay above everything. Workspaces hold the experience; the
// signature workspace switch shatters the windows layer (canvasui Shatter when
// html-in-canvas is available, a CSS tumble otherwise).

import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js"
import { prefersReducedMotion, supportsHtmlInCanvas } from "./canvas/support"
import BootSequence from "./components/BootSequence"
import Wallpaper, { type WallpaperHandle } from "./components/Wallpaper"
import BubbleLayer from "./components/BubbleLayer"
import ShatterLayer, { type BlastFn } from "./components/ShatterLayer"
import DesktopWindow from "./components/DesktopWindow"
import Dock from "./components/Dock"
import CallOverlay from "./components/CallOverlay"
import VitStoreApp from "./components/VitStoreApp"
import PluggedApp from "./components/PluggedApp"
import HerdrApp from "./components/HerdrApp"
import KhaanApp from "./components/KhaanApp"
import {
  AboutApp,
  NowPlayingApp,
  ProjectsApp,
  ExperienceApp,
  CallrelayApp,
  erxesJob,
  golomtJob,
} from "./components/apps"

type WinId =
  | "about"
  | "now"
  | "projects"
  | "erxes"
  | "golomt"
  | "vit-store"
  | "plugged"
  | "callrelay"
  | "herdr-orchestrate"
  | "khaan-client"

interface WinDef {
  id: WinId
  title: string
  x: number
  y: number
  width: number
  /** Fixed workspace for base windows; null for on-demand apps. */
  ws: number | null
  glyph: string
  introDelay: number
}

const DEFS: WinDef[] = [
  { id: "about", title: "about — darjs", x: 0.045, y: 0.06, width: 370, ws: 1, glyph: "me", introDelay: 350 },
  { id: "now", title: "cmus — now playing", x: 0.585, y: 0.07, width: 340, ws: 1, glyph: "♪", introDelay: 750 },
  { id: "projects", title: "applications", x: 0.28, y: 0.36, width: 430, ws: 1, glyph: "apps", introDelay: 1150 },
  { id: "erxes", title: "erxes — $WORK", x: 0.09, y: 0.09, width: 430, ws: 2, glyph: "erk", introDelay: 0 },
  { id: "golomt", title: "Golomt Bank — legacy · do not disturb", x: 0.11, y: 0.11, width: 430, ws: 0, glyph: "glmt", introDelay: 0 },
  { id: "vit-store", title: "vit-store — checkout", x: 0.3, y: 0.1, width: 410, ws: null, glyph: "store", introDelay: 0 },
  { id: "plugged", title: "plugged — iem shelf", x: 0.33, y: 0.06, width: 430, ws: null, glyph: "iem", introDelay: 0 },
  { id: "callrelay", title: "callrelay — overlay control", x: 0.37, y: 0.14, width: 410, ws: null, glyph: "☎", introDelay: 0 },
  { id: "herdr-orchestrate", title: "herdr — tiling agents", x: 0.24, y: 0.09, width: 500, ws: null, glyph: "hdr", introDelay: 0 },
  { id: "khaan-client", title: "Khan Bank — internet banking", x: 0.42, y: 0.11, width: 360, ws: null, glyph: "bank", introDelay: 0 },
]

const WORKSPACES = [
  { n: 0, glyph: "0", label: "legacy — do not disturb" },
  { n: 1, glyph: "1", label: "home" },
  { n: 2, glyph: "2", label: "$WORK — erxes" },
]

const BASE_WS: Partial<Record<WinId, number>> = {
  about: 1,
  now: 1,
  projects: 1,
  erxes: 2,
  golomt: 0,
}

function seedOf(id: string) {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
  return h
}

export default function Compositor() {
  const reduced = prefersReducedMotion()
  const capture = supportsHtmlInCanvas()
  const useShatter = capture && !reduced

  const [phase, setPhase] = createSignal<"boot" | "desktop">(
    reduced ? "desktop" : "boot",
  )
  const [workspace, setWorkspace] = createSignal(1)
  const [switching, setSwitching] = createSignal(false)
  const [tumbling, setTumbling] = createSignal(false)
  const [zOrder, setZOrder] = createSignal<WinId[]>([
    "golomt",
    "erxes",
    "about",
    "now",
    "projects",
  ])
  const [appWs, setAppWs] = createSignal<Partial<Record<WinId, number>>>({})
  const [dockShown, setDockShown] = createSignal(reduced)
  const [callShown, setCallShown] = createSignal(false)

  let wallpaper: WallpaperHandle | null = null
  let blast: BlastFn | null = null
  const timers: number[] = []
  const later = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms))
  }

  const wsOf = (id: WinId) => BASE_WS[id] ?? appWs()[id] ?? 1
  const opened = (id: WinId) => zOrder().includes(id)
  const onCurrentWs = (id: WinId) => wsOf(id) === workspace()
  const zOf = (id: WinId) => 10 + zOrder().indexOf(id)

  const focus = (id: WinId) => {
    if (!opened(id)) return
    setZOrder((order) => [...order.filter((w) => w !== id), id])
  }

  const open = (id: WinId) => {
    if (opened(id)) {
      focus(id)
      return
    }
    if (BASE_WS[id] === undefined) {
      setAppWs((m) => ({ ...m, [id]: workspace() }))
    }
    setZOrder((order) => [...order, id])
  }

  const close = (id: WinId) => {
    setZOrder((order) => order.filter((w) => w !== id))
  }

  const switchWorkspace = (n: number) => {
    if (switching() || n === workspace()) return
    setSwitching(true)
    const swap = () => setWorkspace(n)
    const finish = () => setSwitching(false)
    if (reduced) {
      swap()
      finish()
      return
    }
    if (useShatter && blast) {
      blast(swap, finish)
      return
    }
    // CSS fallback: the windows layer tumbles apart, swaps, slams back.
    setTumbling(true)
    later(() => {
      swap()
      setTumbling(false)
      finish()
    }, 580)
  }

  const openApp = (id: WinId) => {
    const targetWs = BASE_WS[id]
    if (targetWs !== undefined && targetWs !== workspace() && !opened(id)) {
      // base window on another workspace: go there
      open(id)
      switchWorkspace(targetWs)
      return
    }
    open(id)
    const ws = wsOf(id)
    if (ws !== workspace()) switchWorkspace(ws)
  }

  onMount(() => {
    if (reduced) {
      later(() => setCallShown(true), 1200)
    }
  })

  const onDesktopMount = () => {
    later(() => setDockShown(true), reduced ? 0 : 250)
    if (!reduced) later(() => setCallShown(true), 5200)
  }

  // Fluid dye pointer: feed the liquid wallpaper from the desktop root so the
  // trail keeps bleeding even when the cursor crosses windows.
  let lastSplat = 0
  const onRootMove = (event: PointerEvent) => {
    if (!wallpaper || reduced) return
    const now = performance.now()
    if (now - lastSplat < 36) return
    lastSplat = now
    wallpaper.splat(
      event.clientX / window.innerWidth,
      1 - event.clientY / window.innerHeight,
      event.movementX * 0.9,
      -event.movementY * 0.9,
      Math.random() < 0.3,
    )
  }
  const onRootDown = (event: PointerEvent) => {
    if (!wallpaper || reduced) return
    const angle = Math.random() * Math.PI * 2
    wallpaper.splat(
      event.clientX / window.innerWidth,
      1 - event.clientY / window.innerHeight,
      Math.cos(angle) * 280,
      Math.sin(angle) * 280,
      Math.random() < 0.5,
    )
  }

  onCleanup(() => {
    for (const t of timers) window.clearTimeout(t)
  })

  const contentFor = (id: WinId): JSX.Element => {
    switch (id) {
      case "about":
        return <AboutApp />
      case "now":
        return <NowPlayingApp />
      case "projects":
        return <ProjectsApp onLaunch={(slug) => openApp(slug as WinId)} />
      case "erxes":
        return <ExperienceApp job={erxesJob} note="workspace 2 · the open-source experience OS · $WORK" />
      case "golomt":
        return <ExperienceApp job={golomtJob} note="workspace 0 · legacy — do not disturb" />
      case "vit-store":
        return <VitStoreApp />
      case "plugged":
        return <PluggedApp reduced={reduced} />
      case "callrelay":
        return <CallrelayApp onSimulate={() => setCallShown(true)} />
      case "herdr-orchestrate":
        return <HerdrApp />
      case "khaan-client":
        return <KhaanApp />
    }
  }

  return (
    <main
      class="fixed inset-0 overflow-hidden bg-[#0a0a0a] font-mono text-neutral-200"
      onPointerMove={onRootMove}
      onPointerDown={onRootDown}
    >
      <Show when={phase() === "boot"}>
        <BootSequence onDone={() => setPhase("desktop")} />
      </Show>

      <Show when={phase() === "desktop"}>
        <div class="absolute inset-0" ref={() => onDesktopMount()}>
          <Wallpaper
            reduced={reduced}
            onReady={(handle) => {
              wallpaper = handle
            }}
          />

          <BubbleLayer capture={capture && !reduced} reduced={reduced}>
            <ShatterLayer
              capture={useShatter}
              onReady={(fn) => {
                blast = fn
              }}
            >
              <div class="absolute inset-0">
                <For each={DEFS}>
                  {(def) => (
                    <Show when={opened(def.id)}>
                      <div
                        style={{
                          visibility: onCurrentWs(def.id) ? "visible" : "hidden",
                          "pointer-events": onCurrentWs(def.id) ? "auto" : "none",
                        }}
                      >
                        <DesktopWindow
                          title={def.title}
                          x={def.x}
                          y={def.y}
                          width={def.width}
                          z={zOf(def.id)}
                          introDelay={def.introDelay}
                          reduced={reduced}
                          capture={capture && !reduced}
                          tumbling={tumbling() && onCurrentWs(def.id)}
                          tumbleSeed={seedOf(def.id)}
                          onFocus={() => focus(def.id)}
                          onClose={() => close(def.id)}
                        >
                          {contentFor(def.id)}
                        </DesktopWindow>
                      </div>
                    </Show>
                  )}
                </For>
              </div>
            </ShatterLayer>

            <Dock
              shown={dockShown()}
              workspaces={WORKSPACES.map((ws) => ({
                id: String(ws.n),
                glyph: ws.glyph,
                label: ws.label,
                active: workspace() === ws.n,
              }))}
              apps={DEFS.map((d) => ({
                id: d.id,
                glyph: d.glyph,
                label: d.title,
                active: opened(d.id),
              }))}
              onWorkspace={(id) => switchWorkspace(Number(id))}
              onApp={(id) => openApp(id as WinId)}
            />
          </BubbleLayer>
        </div>
      </Show>

      <CallOverlay
        shown={callShown()}
        reduced={reduced}
        onDismiss={() => setCallShown(false)}
      />
    </main>
  )
}
