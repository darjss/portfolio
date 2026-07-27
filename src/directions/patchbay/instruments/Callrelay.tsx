// callrelay — a fake fullscreen Linux app with the call overlay sliding
// above it, exactly like the Wayland layer-shell overlay does.

import { createSignal, For } from "solid-js"
import { card, label } from "./shell"

const CODE = [
  `import QtQuick`,
  `import Quickshell`,
  ``,
  `PanelWindow {`,
  `  layer: Layer.Overlay        // above fullscreen apps`,
  `  anchors { top: true; left: true; right: true }`,
  `  exclusiveZone: 0            // never steals focus`,
  ``,
  `  CallBanner {`,
  `    visible: relay.ringing`,
  `    ringtone: "steppe.ogg"`,
  `    onEnded: relay.persist(event) // durable object queue`,
  `  }`,
  `}`,
]

export default function CallrelayInstrument() {
  const [ringing, setRinging] = createSignal(false)
  const [log, setLog] = createSignal<string[]>([
    "edge: durable object relay online — strongly consistent",
  ])
  const push = (line: string) => setLog((l) => [...l.slice(-6), line])

  const simulate = () => {
    if (ringing()) return
    setRinging(true)
    push("android: CallScreeningService detected incoming call")
    push("edge: event relayed → overlay ws")
  }
  const answer = () => {
    setRinging(false)
    push("overlay: answered on device — banner dismissed")
  }
  const decline = () => {
    setRinging(false)
    push("overlay: declined — ended-call event persisted for delivery")
  }

  return (
    <div class="flex flex-col gap-4">
      {/* The fake fullscreen Linux app */}
      <div class={`${card} relative overflow-hidden`}>
        <div class="flex items-center gap-2 border-b border-neutral-800 px-3 py-1.5">
          <span class="h-2 w-2 rounded-full bg-pink-400/70" aria-hidden="true" />
          <span class="text-[10px] text-neutral-500">callrelay-overlay.qml — fullscreen</span>
          <span class="ml-auto text-[9px] text-neutral-600">wayland · layer shell</span>
        </div>
        <div class="relative bg-[#07070b] p-4">
          <pre class="text-[11px] leading-5 text-neutral-400">
            <For each={CODE}>
              {(line, i) => (
                <div class="flex gap-3">
                  <span class="w-5 select-none text-right text-neutral-700">{i() + 1}</span>
                  <span class={line.includes("CallBanner") || line.includes("relay") ? "text-pink-300/90" : ""}>
                    {line || " "}
                  </span>
                </div>
              )}
            </For>
          </pre>

          {/* The call overlay sliding above the fullscreen window */}
          <div
            class={`absolute inset-x-4 top-3 border border-pink-400/60 bg-black/95 px-4 py-3 ${
              ringing() ? "pb-call-slide" : "hidden"
            }`}
            role="alert"
          >
            <div class="flex items-center gap-3">
              <span class="animate-pulse text-pink-300" aria-hidden="true">☎</span>
              <div class="flex flex-col">
                <span class="text-[13px] text-pink-200">incoming call — unknown number</span>
                <span class="text-[10px] text-neutral-500">
                  screened on android · relayed through the edge · ringing above fullscreen
                </span>
              </div>
              <div class="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={answer}
                  class="border border-emerald-400/60 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
                >
                  answer
                </button>
                <button
                  type="button"
                  onClick={decline}
                  class="border border-pink-400/60 px-2.5 py-1 text-[11px] text-pink-300 hover:bg-pink-400/10"
                >
                  decline
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={simulate}
          disabled={ringing()}
          class="border border-pink-400/60 px-3 py-1.5 text-[12px] text-pink-300 hover:bg-pink-400/10 disabled:opacity-40"
        >
          simulate incoming call
        </button>
        <span class={label}>kotlin → hono worker → qml overlay</span>
      </div>

      <div class={`${card} px-3 py-2`}>
        <p class={label}>relay log</p>
        <div class="mt-1 flex flex-col gap-0.5 text-[11px] text-neutral-400">
          <For each={log()}>
            {(line) => <span class="pb-row-in">▸ {line}</span>}
          </For>
        </div>
      </div>
    </div>
  )
}
