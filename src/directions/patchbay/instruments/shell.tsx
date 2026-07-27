// Shared chrome for the full-screen instruments: stable, flat, readable DOM.
// No physics in here — the physics live on the panel and in the transition.

import type { JSX } from "solid-js"
import { moduleById, type ModuleId } from "../data"

export function SpecStrip(props: { id: ModuleId }) {
  const def = () => moduleById(props.id)
  return (
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-neutral-800/80 px-4 py-1.5 text-[10px] tracking-wider text-neutral-500">
      <span class="text-neutral-400">{def().spec.stack}</span>
      <span aria-hidden="true" class="text-neutral-700">|</span>
      <span>{def().spec.dates}</span>
      <span aria-hidden="true" class="text-neutral-700">|</span>
      <span style={{ color: def().accent }}>{def().spec.number}</span>
    </div>
  )
}

export function InstrumentShell(props: {
  id: ModuleId
  onClose: () => void
  children: JSX.Element
}) {
  const def = () => moduleById(props.id)
  return (
    <div class="flex h-full flex-col bg-[#0a0a0e] font-mono text-neutral-200">
      <header class="flex items-center gap-3 px-4 py-3">
        <span
          class="inline-block h-2.5 w-2.5"
          style={{ background: def().accent }}
          aria-hidden="true"
        />
        <h2 class="text-sm tracking-wide">{def().label}</h2>
        <span class="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
          {def().tag}
        </span>
        <a
          href={def().sourceUrl}
          target="_blank"
          rel="noreferrer"
          class="ml-auto text-[11px] text-neutral-500 underline decoration-neutral-700 underline-offset-4 hover:text-neutral-300"
        >
          source ↗
        </a>
        <button
          type="button"
          onClick={() => props.onClose()}
          class="border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-400 hover:border-neutral-400 hover:text-neutral-100"
        >
          [esc] close
        </button>
      </header>
      <SpecStrip id={props.id} />
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto max-w-4xl px-4 py-6">{props.children}</div>
      </div>
      <footer class="border-t border-neutral-800/80 px-4 py-1.5 text-[10px] text-neutral-600">
        patchbay · darjs.dev — module <span style={{ color: def().accent }}>{def().label}</span>
      </footer>
    </div>
  )
}

export const card = "border border-neutral-800 bg-black/40"
export const label = "text-[10px] uppercase tracking-[0.25em] text-neutral-500"
