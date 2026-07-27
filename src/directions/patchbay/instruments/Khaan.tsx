// khaan-client — the reconciliation bench: two columns of transfers you drag
// together, like the SDK's hook-based async iterator does automatically.

import { createSignal, For, onCleanup, Show } from "solid-js"
import { card, label } from "./shell"

interface Entry {
  id: string
  desc: string
  date: string
  amount: number
}

const STATEMENT: Entry[] = [
  { id: "s1", desc: "QPAY *vit-store inv 004210", date: "03.11", amount: 84000 },
  { id: "s2", desc: "QPAY *plugged order 1138", date: "03.11", amount: 189000 },
  { id: "s3", desc: "SOCIALPAY QR 88412", date: "03.12", amount: 15800 },
  { id: "s4", desc: "QPAY *vit-store inv 004233", date: "03.12", amount: 42000 },
  { id: "s5", desc: "TRANSFER batch salary", date: "03.13", amount: 2850000 },
]

// Same money, seen from the QPay side — deliberately out of order.
const QPAY: Entry[] = [
  { id: "q1", desc: "qpay settlement 88412", date: "03.12", amount: 15800 },
  { id: "q2", desc: "qpay inv 004233", date: "03.12", amount: 42000 },
  { id: "q3", desc: "qpay inv 004210", date: "03.11", amount: 84000 },
  { id: "q4", desc: "qpay salary batch", date: "03.13", amount: 2850000 },
  { id: "q5", desc: "qpay order 1138", date: "03.11", amount: 189000 },
]

export default function KhaanInstrument() {
  const [matched, setMatched] = createSignal<Record<string, string>>({})
  const [selected, setSelected] = createSignal<string | null>(null)
  const [drag, setDrag] = createSignal<{ id: string; x: number; y: number } | null>(null)
  const [flash, setFlash] = createSignal<string | null>(null)

  const leftOf = (id: string) => STATEMENT.find((e) => e.id === id)!
  const isMatchedLeft = (id: string) => id in matched()
  const isMatchedRight = (id: string) => Object.values(matched()).includes(id)
  const done = () => Object.keys(matched()).length

  const attempt = (leftId: string, rightId: string) => {
    const right = QPAY.find((e) => e.id === rightId)!
    if (isMatchedRight(rightId)) return
    if (leftOf(leftId).amount === right.amount) {
      setMatched((m) => ({ ...m, [leftId]: rightId }))
    } else {
      setFlash(rightId)
      window.setTimeout(() => setFlash(null), 400)
    }
    setSelected(null)
  }

  let activeMove: ((e: PointerEvent) => void) | null = null
  let activeUp: ((e: PointerEvent) => void) | null = null

  const onLeftDown = (event: PointerEvent, id: string) => {
    if (isMatchedLeft(id)) return
    event.preventDefault()
    setSelected(id)
    setDrag({ id, x: event.clientX, y: event.clientY })

    const move = (e: PointerEvent) =>
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
    const up = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      activeMove = null
      activeUp = null
      setDrag(null)
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const row = el?.closest<HTMLElement>("[data-qpay-id]")
      if (row?.dataset.qpayId) attempt(id, row.dataset.qpayId)
    }
    activeMove = move
    activeUp = up
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  onCleanup(() => {
    if (activeMove) window.removeEventListener("pointermove", activeMove)
    if (activeUp) window.removeEventListener("pointerup", activeUp)
  })

  const rowBase =
    "flex w-full items-center justify-between gap-2 border px-2.5 py-2 text-left text-[11px]"

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <p class={label}>statement ↔ qpay · drag a row onto its match</p>
        <span class="ml-auto text-[12px] text-yellow-300">
          {done()}/{STATEMENT.length} reconciled
        </span>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <section class={`${card} p-3`}>
          <p class={label}>khan bank statement</p>
          <div class="mt-2 flex flex-col gap-1.5">
            <For each={STATEMENT}>
              {(e) => (
                <button
                  type="button"
                  onPointerDown={(ev) => onLeftDown(ev, e.id)}
                  disabled={isMatchedLeft(e.id)}
                  class={`${rowBase} ${
                    isMatchedLeft(e.id)
                      ? "border-emerald-400/50 text-emerald-300/80"
                      : selected() === e.id
                        ? "border-yellow-300/70 text-yellow-200"
                        : "border-neutral-800 text-neutral-300 hover:border-yellow-300/40"
                  }`}
                  style={{ "touch-action": "none" }}
                >
                  <span class="min-w-0 truncate">{e.desc}</span>
                  <span class="shrink-0 text-neutral-500">{e.date}</span>
                  <span class="shrink-0 text-yellow-300/90">₮{e.amount.toLocaleString()}</span>
                  <Show when={isMatchedLeft(e.id)}>
                    <span class="text-emerald-400">✓</span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </section>

        <section class={`${card} p-3`}>
          <p class={label}>qpay transfers</p>
          <div class="mt-2 flex flex-col gap-1.5">
            <For each={QPAY}>
              {(e) => (
                <div
                  data-qpay-id={e.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`match ${e.desc}`}
                  onClick={() => {
                    const sel = selected()
                    if (sel && !isMatchedRight(e.id)) attempt(sel, e.id)
                  }}
                  onKeyDown={(ev) => {
                    const sel = selected()
                    if (ev.key === "Enter" && sel && !isMatchedRight(e.id))
                      attempt(sel, e.id)
                  }}
                  class={`${rowBase} ${selected() ? "cursor-pointer" : ""} ${
                    isMatchedRight(e.id)
                      ? "border-emerald-400/50 text-emerald-300/80"
                      : flash() === e.id
                        ? "pb-shake border-pink-400/70 text-pink-300"
                        : "border-neutral-800 text-neutral-400"
                  }`}
                >
                  <span class="min-w-0 truncate">{e.desc}</span>
                  <span class="shrink-0 text-neutral-500">{e.date}</span>
                  <span class="shrink-0 text-yellow-300/90">₮{e.amount.toLocaleString()}</span>
                  <Show when={isMatchedRight(e.id)}>
                    <span class="text-emerald-400">✓</span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </section>
      </div>

      <Show when={done() === STATEMENT.length}>
        <p class="pb-row-in text-[12px] text-emerald-300">
          reconciliation complete — the SDK does this through a hook-based async
          iterator: onTransfer → match → yield
        </p>
      </Show>

      {/* drag ghost */}
      <Show when={drag()}>
        {(d) => (
          <div
            class="pointer-events-none fixed z-50 border border-yellow-300/80 bg-black/90 px-2.5 py-1.5 text-[11px] text-yellow-200"
            style={{ left: `${d().x + 12}px`, top: `${d().y + 10}px` }}
          >
            {leftOf(d().id).desc} · ₮{leftOf(d().id).amount.toLocaleString()}
          </div>
        )}
      </Show>
    </div>
  )
}
