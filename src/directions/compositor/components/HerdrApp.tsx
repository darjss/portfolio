// herdr-orchestrate — a tiling-WM workspace window with four agent terminals
// typing in parallel, like a run board of visible Herdr worker sessions.

import { createSignal, For, onCleanup, onMount } from "solid-js"

const SCRIPTS: Array<{ name: string; color: string; lines: string[] }> = [
  {
    name: "worker-1 · otp-login",
    color: "#f43f5e",
    lines: [
      "$ pi \"implement otp login\"",
      "reading src/auth/…",
      "worktree: wt/otp-2 (isolated)",
      "edit: routes/otp.tsx +84 −12",
      "bun run check ✓",
      "awaiting review…",
    ],
  },
  {
    name: "worker-2 · qpay-tests",
    color: "#34d399",
    lines: [
      "$ pi \"cover qpay webhook\"",
      "vitest --run payments/",
      "✓ callback verifies signature",
      "✓ replay rejected",
      "12 passed · 0 failed",
      "run board: green",
    ],
  },
  {
    name: "worker-3 · review",
    color: "#60a5fa",
    lines: [
      "$ pi \"review wt/otp-2\"",
      "diff: 3 files",
      "note: throttle resend endpoint",
      "note: typed errors, nice",
      "approve with comments",
      "handoff → worker-1",
    ],
  },
  {
    name: "worker-4 · docs",
    color: "#e8a0b4",
    lines: [
      "$ pi \"document sotp flow\"",
      "reading khaan-client/",
      "3-step auth diagram drafted",
      "remember-device cli noted",
      "docs/sotp.md +62",
      "done · idling",
    ],
  },
]

const TICK_MS = 34

export default function HerdrApp() {
  const [typed, setTyped] = createSignal<string[]>(SCRIPTS.map(() => ""))

  onMount(() => {
    // per-terminal cursor state
    const state = SCRIPTS.map(() => ({ line: 0, char: 0, rest: 0 }))
    let acc = 0
    let last = performance.now()
    let raf = 0
    let destroyed = false

    const frame = (now: number) => {
      if (destroyed) return
      acc += now - last
      last = now
      let changed = false
      while (acc >= TICK_MS) {
        acc -= TICK_MS
        for (let i = 0; i < state.length; i++) {
          const s = state[i]
          if (s.rest > 0) {
            s.rest -= 1
            continue
          }
          const script = SCRIPTS[i]
          const line = script.lines[s.line]
          if (s.char < line.length) {
            s.char += 1
            changed = true
          } else {
            s.line += 1
            s.char = 0
            if (s.line >= script.lines.length) {
              s.line = 0
              s.rest = 140 // pause before replaying the loop
            } else {
              s.rest = line.startsWith("$") ? 10 : 26
            }
          }
        }
      }
      if (changed) {
        setTyped(
          state.map((s, i) => {
            const script = SCRIPTS[i]
            const done = script.lines.slice(0, s.line).join("\n")
            const current = script.lines[s.line].slice(0, s.char)
            return done ? `${done}\n${current}` : current
          }),
        )
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    onCleanup(() => {
      destroyed = true
      cancelAnimationFrame(raf)
    })
  })

  return (
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] tracking-widest text-neutral-600 uppercase">
          herdr · workspace 3 · tiling
        </span>
        <span class="text-[10px] text-emerald-400">run board: green</span>
      </div>
      <div class="grid grid-cols-2 gap-1.5">
        <For each={SCRIPTS}>
          {(script, i) => (
            <div class="overflow-hidden rounded-md border border-neutral-800 bg-black/50">
              <div
                class="border-b border-neutral-800 px-2 py-1 text-[9px] font-bold tracking-wider"
                style={{ color: script.color }}
              >
                {script.name}
              </div>
              <pre class="h-[104px] overflow-hidden p-2 font-mono text-[9px] leading-[1.45] whitespace-pre-wrap text-neutral-400">
                {typed()[i()]}
                <span class="animate-pulse text-neutral-500">▌</span>
              </pre>
            </div>
          )}
        </For>
      </div>
      <div class="text-[10px] text-neutral-600">
        4 agents · isolated git worktrees · durable run state · preview-first cleanup
      </div>
    </div>
  )
}
