// plugged — a search box that actually searches this portfolio: a small
// client-side index over the real projects + experience data.

import { createMemo, createSignal, For, Show } from "solid-js"
import { experience } from "../../../data/experience"
import { projects } from "../../../data/projects"
import { card, label } from "./shell"

interface Doc {
  type: "project" | "job"
  title: string
  body: string
  url?: string
}

const INDEX: Doc[] = [
  ...projects.map((p) => ({
    type: "project" as const,
    title: p.name,
    body: `${p.pitch} ${p.description} ${p.stack.join(" ")}`,
    url: p.sourceUrl,
  })),
  ...experience.map((e) => ({
    type: "job" as const,
    title: `${e.company} — ${e.role}`,
    body: `${e.context} ${e.highlights.join(" ")}`,
  })),
]

const tokenize = (s: string) =>
  s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((t) => t.length > 1)

export default function PluggedInstrument() {
  const [q, setQ] = createSignal("qpay")

  const results = createMemo(() => {
    const terms = tokenize(q())
    if (terms.length === 0) return INDEX
    return INDEX.map((doc) => {
      const hay = `${doc.title} ${doc.body}`.toLowerCase()
      let score = 0
      for (const t of terms) {
        if (doc.title.toLowerCase().includes(t)) score += 3
        if (hay.includes(t)) score += 1
      }
      return { doc, score }
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.doc)
  })

  return (
    <div class="flex flex-col gap-4">
      <div class={`${card} flex items-center gap-3 px-3 py-2.5`}>
        <span class="text-sky-400" aria-hidden="true">⌕</span>
        <input
          type="text"
          value={q()}
          onInput={(e) => setQ(e.currentTarget.value)}
          placeholder="search the portfolio — try “qpay”, “workers”, “mcp”…"
          class="w-full bg-transparent text-sm text-sky-200 outline-none placeholder:text-neutral-600"
          aria-label="search the portfolio"
        />
        <span class="shrink-0 text-[10px] text-neutral-500">
          {results().length}/{INDEX.length} docs
        </span>
      </div>

      <p class={label}>hybrid index · keyword pass over projects + jobs</p>

      <div class="flex flex-col gap-2">
        <For each={results()}>
          {(doc) => (
            <article class={`${card} px-3 py-2.5`}>
              <div class="flex items-center gap-2">
                <span
                  class={`border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${
                    doc.type === "project"
                      ? "border-sky-400/50 text-sky-300"
                      : "border-indigo-400/50 text-indigo-300"
                  }`}
                >
                  {doc.type}
                </span>
                <h3 class="text-[13px] text-neutral-100">{doc.title}</h3>
                <Show when={doc.url}>
                  {(url) => (
                    <a
                      href={url()}
                      target="_blank"
                      rel="noreferrer"
                      class="ml-auto text-[10px] text-neutral-500 underline decoration-neutral-700 underline-offset-4 hover:text-neutral-300"
                    >
                      github ↗
                    </a>
                  )}
                </Show>
              </div>
              <p class="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-neutral-400">
                {doc.body}
              </p>
            </article>
          )}
        </For>
        <Show when={results().length === 0}>
          <p class="text-[12px] text-neutral-600">
            no matches — the real plugged does this with D1 + Vectorize embeddings
          </p>
        </Show>
      </div>
    </div>
  )
}
