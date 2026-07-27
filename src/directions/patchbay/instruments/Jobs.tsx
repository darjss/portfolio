// The two job modules. erxes opens a monorepo map in the same instrument
// grammar as the projects; Golomt opens a legacy case view.

import { createSignal, For, Show } from "solid-js"
import { experience } from "../../../data/experience"
import { card, label } from "./shell"

/* erxes — the monorepo as patchable hex nodes. */
interface Node {
  id: string
  kind: "app" | "plugin" | "package"
  note: string
}

const NODES: Node[] = [
  { id: "core-api", kind: "app", note: "apollo graphql federation gateway — the graph every plugin joins" },
  { id: "gateway", kind: "app", note: "edge entry: auth, routing, plugin discovery" },
  { id: "contacts", kind: "plugin", note: "crm core — companies, customers, segments" },
  { id: "inbox", kind: "plugin", note: "omnichannel support — every conversation in one queue" },
  { id: "automations", kind: "plugin", note: "marketing workflows on redis/bullmq queues" },
  { id: "commerce", kind: "plugin", note: "products, orders, payments — where the day job meets vit-store" },
  { id: "finance", kind: "plugin", note: "invoices and accounting modules" },
  { id: "search", kind: "package", note: "elasticsearch bindings shared by 100+ modules" },
  { id: "ui", kind: "package", note: "react 18 component kit, pnpm/nx workspace" },
]

const KIND_COLOR: Record<Node["kind"], string> = {
  app: "#6a8aff",
  plugin: "#8a2a5a",
  package: "#4a5568",
}

export function ErxesInstrument() {
  const [sel, setSel] = createSignal<Node>(NODES[0])
  const job = experience[0]
  return (
    <div class="flex flex-col gap-5">
      <p class="text-[12px] leading-relaxed text-neutral-400">{job.context}</p>

      <div>
        <p class={label}>monorepo map — click a node</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <For each={NODES}>
            {(n) => (
              <button
                type="button"
                onClick={() => setSel(n)}
                class={`pb-module px-4 py-3 text-[11px] ${
                  sel().id === n.id ? "text-neutral-100" : "text-neutral-400"
                }`}
                style={{
                  background: `color-mix(in srgb, ${KIND_COLOR[n.kind]} ${
                    sel().id === n.id ? 35 : 14
                  }%, #0a0a0e)`,
                }}
              >
                {n.id}
              </button>
            )}
          </For>
        </div>
        <div class={`${card} mt-3 flex items-center gap-3 px-3 py-2 text-[11px]`}>
          <span
            class="inline-block h-2 w-2 shrink-0"
            style={{ background: KIND_COLOR[sel().kind] }}
            aria-hidden="true"
          />
          <span class="text-neutral-300">{sel().id}</span>
          <span class="text-neutral-600">{sel().kind}</span>
          <span class="text-neutral-400">{sel().note}</span>
        </div>
      </div>

      <ul class="flex flex-col gap-1.5 text-[11px] text-neutral-400">
        <For each={job.highlights}>
          {(h) => <li>▸ {h}</li>}
        </For>
      </ul>
    </div>
  )
}

/* golomt — legacy case view, workspace 0. */
export function GolomtInstrument() {
  const job = experience[1]
  const [stamped, setStamped] = createSignal(false)
  return (
    <div class="flex flex-col gap-5">
      <Show when={!stamped()}>
        <button
          type="button"
          onClick={() => setStamped(true)}
          class="self-start border border-amber-300/50 px-3 py-1.5 text-[11px] text-amber-200/90 hover:bg-amber-300/10"
        >
          workspace 0 · legacy — confirm you want to look
        </button>
      </Show>
      <Show when={stamped()}>
        <div class="pb-fade-in flex flex-col gap-5">
          <p class="text-[12px] leading-relaxed text-neutral-400">
            {job.context} One year, two systems that still move money.
          </p>
          <ul class="flex flex-col gap-2">
            <For each={job.highlights}>
              {(h) => (
                <li class={`${card} px-3 py-2 text-[12px] text-amber-100/80`}>
                  ▣ {h}
                </li>
              )}
            </For>
          </ul>
          <p class="text-[10px] text-neutral-600">
            spring boot services · socialpay commerce + payments · qr payment
            interoperability — the reason qpay shows up in half the modules on
            this panel
          </p>
        </div>
      </Show>
    </div>
  )
}
