// Miniature live instruments rendered inside each floating hex module. Every
// one is a working scale model of the system it represents — ticking, typing,
// searching while it floats.

import { createSignal, For, onCleanup, onMount, Show } from "solid-js"

const miniLabel = "text-[9px] uppercase tracking-[0.2em] text-neutral-500"
const miniBox = "border border-neutral-800/80 bg-black/40"

function useInterval(fn: () => void, ms: number) {
  onMount(() => {
    const id = window.setInterval(fn, ms)
    onCleanup(() => window.clearInterval(id))
  })
}

/* vit-store — a working checkout counter. */
const PRICE = 42000
export function MiniVitStore() {
  const [qty, setQty] = createSignal(2)
  return (
    <div class="flex flex-col gap-1.5 text-[10px]">
      <div class="flex items-center justify-between gap-2">
        <span class="text-neutral-400">Vit D3 5000IU</span>
        <span class="text-neutral-500">₮{PRICE.toLocaleString()}</span>
      </div>
      <div class="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max="99"
          value={qty()}
          onInput={(e) => setQty(Math.max(1, Number(e.currentTarget.value) || 1))}
          class={`w-12 px-1 py-0.5 ${miniBox} text-emerald-300 outline-none`}
          aria-label="quantity"
        />
        <span class="text-neutral-500">×</span>
        <span class="ml-auto text-emerald-300">
          ₮{(qty() * PRICE).toLocaleString()}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <svg viewBox="0 0 8 8" class={`h-8 w-8 ${miniBox}`} aria-hidden="true">
          <For each={[0, 1, 2, 3, 5, 6, 8, 10, 13, 15, 16, 19, 21, 22, 24, 27, 29, 30, 33, 34, 37, 40, 42, 45, 47, 48, 51, 53, 56, 58, 61, 63]}>
            {(i) => (
              <rect x={i % 8} y={Math.floor(i / 8)} width="1" height="1" fill="#4ade80" />
            )}
          </For>
        </svg>
        <span class="leading-tight text-neutral-500">
          qpay invoice
          <br />
          <span class="text-emerald-400/80">agent: added to cart ✓</span>
        </span>
      </div>
    </div>
  )
}

/* plugged — a live search box over a tiny IEM catalog. */
const CATALOG = [
  "Moondrop Aria 2",
  "Truthear Hexa",
  "7Hz Salnotes Zero 2",
  "Simgot EW200",
  "Kiwi Ears Cadenza",
]
export function MiniPlugged() {
  const [q, setQ] = createSignal("")
  const hits = () =>
    CATALOG.filter((n) => n.toLowerCase().includes(q().toLowerCase()))
  return (
    <div class="flex flex-col gap-1.5 text-[10px]">
      <input
        type="text"
        value={q()}
        onInput={(e) => setQ(e.currentTarget.value)}
        placeholder="search iems…"
        class={`w-full px-1.5 py-1 ${miniBox} text-sky-300 outline-none placeholder:text-neutral-600`}
        aria-label="search catalog"
      />
      <div class="flex flex-col gap-0.5">
        <For each={hits().slice(0, 3)}>
          {(name) => <span class="truncate text-neutral-400">▸ {name}</span>}
        </For>
        <Show when={hits().length === 0}>
          <span class="text-neutral-600">no matches</span>
        </Show>
      </div>
      <span class={miniLabel}>{hits().length}/5 hybrid hits</span>
    </div>
  )
}

/* callrelay — a fullscreen app with the call overlay sliding above it. */
export function MiniCallrelay() {
  const [ringing, setRinging] = createSignal(false)
  useInterval(() => {
    setRinging(true)
    window.setTimeout(() => setRinging(false), 2600)
  }, 6000)
  return (
    <div class={`relative overflow-hidden ${miniBox} px-1.5 py-1 text-[9px]`}>
      <div class="flex flex-col gap-0.5 text-neutral-600">
        <span>1&nbsp;&nbsp;import &#123; overlay &#125; from "layer"</span>
        <span>2&nbsp;&nbsp;shell.panel(&#123; layer: "top" &#125;)</span>
        <span>3&nbsp;&nbsp;onCall(ring)</span>
      </div>
      <Show when={ringing()}>
        <div class="pb-call-slide absolute inset-x-1 top-1 flex items-center justify-between border border-pink-400/50 bg-black/90 px-1.5 py-1 text-pink-300">
          <span>☎ incoming — unknown</span>
          <span class="text-neutral-500">edge relay</span>
        </div>
      </Show>
    </div>
  )
}

/* herdr — a run board with live statuses. */
interface MiniRun {
  id: string
  model: string
  state: "running" | "done" | "queued"
  secs: number
}
export function MiniHerdr() {
  const [runs, setRuns] = createSignal<MiniRun[]>([
    { id: "r41", model: "opus", state: "running", secs: 12 },
    { id: "r42", model: "gpt-5", state: "queued", secs: 0 },
    { id: "r43", model: "gemini", state: "done", secs: 47 },
  ])
  useInterval(() => {
    setRuns((rs) =>
      rs.map((r) => {
        if (r.state === "running" && r.secs > 40)
          return { ...r, state: "done" as const }
        if (r.state === "done" && r.id === "r43" && r.secs > 60)
          return { ...r, state: "queued" as const, secs: 0 }
        if (r.state === "queued") return { ...r, state: "running" as const }
        if (r.state === "running") return { ...r, secs: r.secs + 7 }
        return { ...r, secs: r.secs + 7 }
      }),
    )
  }, 1400)
  const dot = (s: MiniRun["state"]) =>
    s === "running" ? "text-purple-300" : s === "done" ? "text-emerald-400" : "text-neutral-600"
  return (
    <div class="flex flex-col gap-1 text-[10px]">
      <For each={runs()}>
        {(r) => (
          <div class="flex items-center gap-1.5">
            <span class={dot(r.state)}>●</span>
            <span class="text-neutral-400">{r.id}</span>
            <span class="text-neutral-600">{r.model}</span>
            <span class="ml-auto text-neutral-500">
              {r.state === "queued" ? "—" : `${r.secs}s`}
            </span>
          </div>
        )}
      </For>
    </div>
  )
}

/* khaan — a ledger that keeps ticking. */
const LEDGER = [
  { desc: "QPAY *vit-store", amt: 42000 },
  { desc: "SALARY erxes", amt: 2850000 },
  { desc: "SOCIALPAY qr", amt: 15800 },
  { desc: "NOMIN grocery", amt: 63400 },
  { desc: "QPAY *plugged", amt: 189000 },
]
export function MiniKhaan() {
  const [rows, setRows] = createSignal<{ desc: string; amt: number; n: number }[]>([
    { ...LEDGER[0], n: 0 },
    { ...LEDGER[1], n: 1 },
  ])
  useInterval(() => {
    setRows((rs) => {
      const next = { ...LEDGER[(rs[rs.length - 1].n + 1) % LEDGER.length], n: rs[rs.length - 1].n + 1 }
      return [...rs.slice(-3), next]
    })
  }, 1600)
  return (
    <div class="flex flex-col gap-0.5 text-[10px]">
      <For each={rows()}>
        {(r) => (
          <div class="pb-row-in flex items-center justify-between gap-2">
            <span class="truncate text-neutral-400">{r.desc}</span>
            <span class="shrink-0 text-yellow-300/90">₮{r.amt.toLocaleString()}</span>
          </div>
        )}
      </For>
      <span class={miniLabel}>statement ↔ qpay · reconciling</span>
    </div>
  )
}

/* sisi — a query box over mock university MCP responses. */
const QA = [
  ["next exam?", "MATH201 · fri 10:00 · hall 3"],
  ["gpa?", "3.41 · 92 credits done"],
  ["tuition due?", "₮1,240,000 · oct 15"],
]
export function MiniSisi() {
  const [i, setI] = createSignal(0)
  useInterval(() => setI((v) => (v + 1) % QA.length), 2600)
  return (
    <div class="flex flex-col gap-1 text-[10px]">
      <div class={`px-1.5 py-1 ${miniBox} text-emerald-300/90`}>
        sisi: {QA[i()][0]}
      </div>
      <div class="pb-row-in pl-2 text-neutral-400">
        ↳ {QA[i()][1]}
      </div>
      <span class={miniLabel}>mcp: num portal</span>
    </div>
  )
}

/* html-thing — paste html, get a url. */
export function MiniHtmlThing() {
  const [html, setHtml] = createSignal("<h1>сайн уу</h1>")
  const slug = () => {
    let h = 7
    const s = html()
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 46656
    return h.toString(36).padStart(3, "0")
  }
  return (
    <div class="flex flex-col gap-1.5 text-[10px]">
      <input
        type="text"
        value={html()}
        onInput={(e) => setHtml(e.currentTarget.value)}
        class={`w-full px-1.5 py-1 ${miniBox} text-orange-300 outline-none`}
        aria-label="html input"
      />
      <span class="text-neutral-500">
        → <span class="text-orange-300/90">files.darjs.dev/{slug()}</span>
      </span>
    </div>
  )
}

/* erxes — the monorepo as a pulsing map. */
const ERXES_NODES = ["core-api", "gateway", "contacts", "inbox", "automations", "commerce", "finance", "ui", "workers"]
export function MiniErxes() {
  const [hot, setHot] = createSignal(0)
  useInterval(() => setHot((v) => (v + 1) % ERXES_NODES.length), 1100)
  return (
    <div class="flex flex-wrap gap-1">
      <For each={ERXES_NODES}>
        {(n, i) => (
          <span
            class={`border px-1 py-0.5 text-[8px] ${
              i() === hot()
                ? "border-indigo-400/70 text-indigo-300"
                : "border-neutral-800 text-neutral-600"
            }`}
          >
            {n}
          </span>
        )}
      </For>
    </div>
  )
}

/* golomt — legacy ledger, do not disturb. */
export function MiniGolomt() {
  const highlights = [
    "socialpay · nationwide",
    "sme banking services",
    "qr interop",
  ]
  const [i, setI] = createSignal(0)
  useInterval(() => setI((v) => (v + 1) % highlights.length), 3000)
  return (
    <div class="flex flex-col gap-1 text-[10px]">
      <div class="pb-row-in text-amber-200/80">
        ▣ {highlights[i()]}
      </div>
      <span class={miniLabel}>workspace 0 · legacy</span>
    </div>
  )
}
