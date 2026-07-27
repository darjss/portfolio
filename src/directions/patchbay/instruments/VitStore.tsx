// vit-store — the full checkout bench: typeable qty, generated QPay QR
// placeholder, and the Messenger agent transcript.

import { createSignal, For } from "solid-js"
import { card, label } from "./shell"

const PRICE = 42000
const PRODUCTS = [
  { name: "Vitamin D3 5000IU · 240ct", price: 42000 },
  { name: "Omega-3 Fish Oil 1000mg", price: 38500 },
  { name: "Magnesium Glycinate", price: 44000 },
]

// Deterministic pseudo-QR from the invoice id. A placeholder for the real
// QPay invoice image the API returns.
function qrCells(seed: string) {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  const cells: number[] = []
  for (let i = 0; i < 21 * 21; i++) {
    h = (h * 1103515245 + 12345 + i) >>> 0
    if ((h >> 13) % 3 === 0) cells.push(i)
  }
  return cells
}

const TRANSCRIPT: { who: "customer" | "agent"; text: string; at: string }[] = [
  { who: "customer", text: "[photo of a vitamin bottle]", at: "21:02" },
  { who: "agent", text: "identified: Vitamin D3 5000IU (vision match, 0.94) — in stock, ₮42,000", at: "21:02" },
  { who: "customer", text: "2 shiree avya", at: "21:03" },
  { who: "agent", text: "added 2 × Vit D3 to your cart. total ₮84,000 — pay with QPay?", at: "21:03" },
  { who: "customer", text: "tiim ee", at: "21:04" },
  { who: "agent", text: "invoice sent → qpay://invoice/884210. i'll confirm here when it settles.", at: "21:04" },
  { who: "agent", text: "paid ✓ — order #884210 handed to fulfillment, delivery in UB tomorrow", at: "21:07" },
]

export default function VitStoreInstrument() {
  const [product, setProduct] = createSignal(0)
  const [qty, setQty] = createSignal(2)
  const [status, setStatus] = createSignal<"idle" | "waiting" | "paid">("idle")
  const total = () => PRODUCTS[product()].price * qty()
  const invoice = () => `INV-${String(total()).padStart(6, "0")}`

  const pay = () => {
    if (status() === "waiting") return
    setStatus("waiting")
    window.setTimeout(() => setStatus("paid"), 1800)
  }

  return (
    <div class="grid gap-6 md:grid-cols-2">
      <section class={`${card} p-4`}>
        <p class={label}>checkout counter</p>
        <div class="mt-3 flex flex-col gap-2">
          <For each={PRODUCTS}>
            {(p, i) => (
              <button
                type="button"
                onClick={() => {
                  setProduct(i())
                  setStatus("idle")
                }}
                class={`flex items-center justify-between border px-2 py-1.5 text-left text-[12px] ${
                  product() === i()
                    ? "border-emerald-400/60 text-emerald-200"
                    : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                <span>{p.name}</span>
                <span>₮{p.price.toLocaleString()}</span>
              </button>
            )}
          </For>
        </div>

        <div class="mt-4 flex items-center gap-3 text-[12px]">
          <label for="pb-qty" class="text-neutral-500">qty</label>
          <input
            id="pb-qty"
            type="number"
            min="1"
            max="99"
            value={qty()}
            onInput={(e) => {
              setQty(Math.max(1, Number(e.currentTarget.value) || 1))
              setStatus("idle")
            }}
            class="w-16 border border-neutral-700 bg-black px-2 py-1 text-emerald-300 outline-none"
          />
          <span class="ml-auto text-lg text-emerald-300">₮{total().toLocaleString()}</span>
        </div>

        <div class="mt-4 flex items-start gap-4">
          <svg viewBox="0 0 21 21" class="h-32 w-32 border border-neutral-800 bg-black" role="img" aria-label="QPay QR placeholder">
            <For each={qrCells(invoice())}>
              {(i) => (
                <rect x={i % 21} y={Math.floor(i / 21)} width="1" height="1" fill={status() === "paid" ? "#4ade80" : "#9ca3af"} />
              )}
            </For>
            <rect x="0" y="0" width="6" height="6" fill="none" stroke="#e5e5e5" stroke-width="1" />
            <rect x="15" y="0" width="6" height="6" fill="none" stroke="#e5e5e5" stroke-width="1" />
            <rect x="0" y="15" width="6" height="6" fill="none" stroke="#e5e5e5" stroke-width="1" />
          </svg>
          <div class="flex flex-col gap-2 text-[11px]">
            <span class="text-neutral-500">qpay invoice · {invoice()}</span>
            <button
              type="button"
              onClick={pay}
              disabled={status() === "waiting"}
              class="border border-emerald-400/60 px-3 py-1.5 text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
            >
              {status() === "idle" && "send qpay invoice"}
              {status() === "waiting" && "waiting for payment…"}
              {status() === "paid" && "paid ✓ — new invoice"}
            </button>
            <span class="text-neutral-600">
              otp login · drizzle orders · workers gateway
            </span>
          </div>
        </div>
      </section>

      <section class={`${card} p-4`}>
        <p class={label}>messenger agent transcript</p>
        <div class="mt-3 flex flex-col gap-2">
          <For each={TRANSCRIPT}>
            {(line) => (
              <div
                class={`max-w-[90%] border px-2 py-1.5 text-[11px] leading-snug ${
                  line.who === "agent"
                    ? "self-start border-emerald-400/30 text-emerald-100/90"
                    : "self-end border-neutral-700 text-neutral-300"
                }`}
              >
                <span class="mr-2 text-[9px] text-neutral-600">{line.at}</span>
                {line.text}
              </div>
            )}
          </For>
        </div>
        <p class="mt-3 text-[10px] text-neutral-600">
          facebook messenger · workers ai vision · durable object cart session
        </p>
      </section>
    </div>
  )
}
