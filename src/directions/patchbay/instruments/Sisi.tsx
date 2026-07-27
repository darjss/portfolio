// sisi-agent — a query box over mock university MCP responses, rendered as a
// tool-call transcript.

import { createSignal, For } from "solid-js"
import { card, label } from "./shell"

interface Turn {
  q: string
  tool: string
  args: string
  result: string[]
}

function answer(q: string): Omit<Turn, "q"> {
  const s = q.toLowerCase()
  if (s.includes("exam"))
    return {
      tool: "sisi.get_exam_schedule",
      args: `{ term: "2025-spring" }`,
      result: ["MATH201 discrete math · fri 10:00 · hall 3", "INFO301 databases · mon 08:00 · hall 11"],
    }
  if (s.includes("gpa") || s.includes("grade"))
    return {
      tool: "sisi.get_transcript",
      args: `{ cumulative: true }`,
      result: ["gpa 3.41 · 92/130 credits", "best: INFO301 A · worst: PHYS101 C+"],
    }
  if (s.includes("tuition") || s.includes("pay"))
    return {
      tool: "sisi.get_tuition_invoice",
      args: `{ term: "2025-fall" }`,
      result: ["₮1,240,000 due oct 15 · unpaid", "khan bank transfer accepted — see khaan-client"],
    }
  if (s.includes("schedule") || s.includes("class"))
    return {
      tool: "sisi.get_week_schedule",
      args: `{ week: "current" }`,
      result: ["mon 08:00 INFO301 · tue 10:00 MATH201", "wed 13:00 THES499 thesis seminar"],
    }
  return {
    tool: "sisi.list_tools",
    args: `{}`,
    result: [
      "get_exam_schedule · get_transcript · get_tuition_invoice · get_week_schedule",
      "try: “when is my next exam?” or “what is my gpa?”",
    ],
  }
}

export default function SisiInstrument() {
  const [q, setQ] = createSignal("")
  const [turns, setTurns] = createSignal<Turn[]>([
    { q: "when is my next exam?", ...answer("exam") },
  ])

  const ask = () => {
    const query = q().trim()
    if (!query) return
    setTurns((t) => [...t.slice(-5), { q: query, ...answer(query) }])
    setQ("")
  }

  return (
    <div class="flex flex-col gap-4">
      <p class={label}>
        national university of mongolia · portal data over mcp · thesis project
      </p>

      <div class="flex flex-col gap-3">
        <For each={turns()}>
          {(t) => (
            <div class="pb-row-in flex flex-col gap-1.5">
              <div class="self-end border border-neutral-700 px-3 py-1.5 text-[12px] text-neutral-200">
                {t.q}
              </div>
              <div class={`${card} self-start px-3 py-2 text-[11px]`}>
                <div class="text-emerald-300/90">
                  → tool: {t.tool} <span class="text-neutral-500">{t.args}</span>
                </div>
                <For each={t.result}>
                  {(line) => <div class="pl-3 text-neutral-300">{line}</div>}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class={`${card} flex items-center gap-2 px-3 py-2`}>
        <input
          type="text"
          value={q()}
          onInput={(e) => setQ(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="ask sisi — exams, gpa, tuition, schedule…"
          class="w-full bg-transparent text-[13px] text-emerald-200 outline-none placeholder:text-neutral-600"
          aria-label="ask sisi"
        />
        <button
          type="button"
          onClick={ask}
          class="border border-emerald-400/60 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
        >
          query
        </button>
      </div>

      <p class="text-[10px] text-neutral-600">
        local mcp server · chrome extension · ai server · experimental web ui ·
        thesis report — bun workspaces + turborepo
      </p>
    </div>
  )
}
