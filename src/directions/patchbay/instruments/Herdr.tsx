// herdr — a run board with start/stop over fake agent runs, ticking live.

import { createSignal, For, onCleanup, onMount } from "solid-js"
import { card, label } from "./shell"

interface Run {
  id: string
  model: string
  task: string
  worktree: string
  running: boolean
  secs: number
  out: string
}

const SEED: Run[] = [
  { id: "r41", model: "claude-opus", task: "vit-store: qpay webhook retries", worktree: "wt/qpay-retry", running: true, secs: 37, out: "tests: 41 passed" },
  { id: "r42", model: "gpt-5", task: "plugged: vectorize index backfill", worktree: "wt/vec-backfill", running: false, secs: 0, out: "idle" },
  { id: "r43", model: "gemini-3", task: "khaan-client: sotp edge cases", worktree: "wt/sotp-edge", running: true, secs: 12, out: "valibot schemas ok" },
  { id: "r44", model: "claude-opus", task: "darjs.dev: patchbay direction", worktree: "wt/patchbay", running: false, secs: 0, out: "idle" },
]

const OUT_LINES = [
  "diff looks clean, opening preview",
  "running vitest --run",
  "typecheck passed",
  "waiting on background task",
  "worktree clean, ready for review",
]

export default function HerdrInstrument() {
  const [runs, setRuns] = createSignal<Run[]>(SEED.map((r) => ({ ...r })))

  onMount(() => {
    const id = window.setInterval(() => {
      setRuns((rs) =>
        rs.map((r) =>
          r.running
            ? {
                ...r,
                secs: r.secs + 1,
                out:
                  r.secs % 9 === 0
                    ? OUT_LINES[Math.floor(r.secs / 9) % OUT_LINES.length]
                    : r.out,
              }
            : r,
        ),
      )
    }, 1000)
    onCleanup(() => window.clearInterval(id))
  })

  const toggle = (id: string) =>
    setRuns((rs) =>
      rs.map((r) =>
        r.id === id
          ? { ...r, running: !r.running, out: r.running ? "stopped by operator" : "resumed" }
          : r,
      ),
    )

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  return (
    <div class="flex flex-col gap-4">
      <p class={label}>run board · pi-native orchestration · isolated git worktrees</p>
      <div class={`${card} divide-y divide-neutral-800/80`}>
        <For each={runs()}>
          {(r) => (
            <div class="flex items-center gap-3 px-3 py-2.5 text-[12px]">
              <span
                class={r.running ? "animate-pulse text-purple-300" : "text-neutral-600"}
                aria-hidden="true"
              >
                ●
              </span>
              <span class="w-10 text-neutral-500">{r.id}</span>
              <span class="w-24 text-neutral-400">{r.model}</span>
              <span class="min-w-0 flex-1 truncate text-neutral-200">{r.task}</span>
              <span class="hidden w-28 truncate text-neutral-600 md:inline">{r.worktree}</span>
              <span class="w-12 text-right text-neutral-400">{r.running ? fmt(r.secs) : "—"}</span>
              <button
                type="button"
                onClick={() => toggle(r.id)}
                class={`border px-2 py-0.5 text-[10px] ${
                  r.running
                    ? "border-pink-400/50 text-pink-300 hover:bg-pink-400/10"
                    : "border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/10"
                }`}
              >
                {r.running ? "stop" : "start"}
              </button>
            </div>
          )}
        </For>
      </div>

      <div class={`${card} px-3 py-2`}>
        <p class={label}>latest output</p>
        <div class="mt-1 flex flex-col gap-0.5 text-[11px] text-neutral-400">
          <For each={runs().filter((r) => r.running)}>
            {(r) => (
              <span>
                <span class="text-purple-300/80">{r.id}</span> · {r.out}
              </span>
            )}
          </For>
        </div>
      </div>

      <p class="text-[10px] text-neutral-600">
        durable run state · background waiting · preview-first cleanup — nothing is
        deleted before you see the diff
      </p>
    </div>
  )
}
