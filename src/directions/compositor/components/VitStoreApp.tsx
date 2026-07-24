// vit-store — a store app window with a mini checkout: QPay QR placeholder and
// SMS OTP input, like the real production flow.

import { createSignal, For, onMount } from "solid-js"

const PRODUCTS = [
  { id: "d3", name: "Vitamin D3 5000 IU", price: 24000 },
  { id: "mag", name: "Magnesium Glycinate", price: 38000 },
  { id: "omega", name: "Omega-3 Fish Oil", price: 45000 },
]

function formatMnt(value: number) {
  return `₮${value.toLocaleString("en-US")}`
}

// Deterministic pseudo-QR: finder patterns plus seeded modules. A placeholder,
// not a scannable code — the real one comes from the QPay API.
function drawQr(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const n = 25
  const cell = canvas.width / n
  let seed = 1337
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  ctx.fillStyle = "#e5e5e5"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#0a0a0a"
  const finder = (fx: number, fy: number) => {
    ctx.fillRect(fx * cell, fy * cell, 7 * cell, 7 * cell)
    ctx.fillStyle = "#e5e5e5"
    ctx.fillRect((fx + 1) * cell, (fy + 1) * cell, 5 * cell, 5 * cell)
    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect((fx + 2) * cell, (fy + 2) * cell, 3 * cell, 3 * cell)
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (rand() > 0.52) ctx.fillRect(x * cell, y * cell, cell, cell)
    }
  }
  finder(0, 0)
  finder(n - 7, 0)
  finder(0, n - 7)
}

export default function VitStoreApp() {
  let qr!: HTMLCanvasElement
  const [cart, setCart] = createSignal<Record<string, number>>({ d3: 1, omega: 1 })
  const [otp, setOtp] = createSignal<string[]>(Array(6).fill(""))
  const [status, setStatus] = createSignal("waiting for payment")

  onMount(() => drawQr(qr))

  const total = () =>
    PRODUCTS.reduce((sum, p) => sum + (cart()[p.id] ?? 0) * p.price, 0)

  const bump = (id: string, by: number) => {
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] ?? 0) + by) }
      if (next[id] === 0) delete next[id]
      return next
    })
    setStatus("waiting for payment")
  }

  const setDigit = (i: number, value: string, event: InputEvent) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    setOtp((o) => o.map((d, j) => (j === i ? digit : d)))
    const target = event.currentTarget as HTMLInputElement
    if (digit && target.nextElementSibling instanceof HTMLInputElement) {
      target.nextElementSibling.focus()
    }
  }

  const confirm = () => {
    if (otp().some((d) => d === "")) {
      setStatus("enter all 6 OTP digits")
      return
    }
    setStatus("qpay callback received · order #4242 confirmed ✓")
  }

  return (
    <div class="flex flex-col gap-3">
      <div class="text-[10px] tracking-widest text-neutral-600 uppercase">
        vit-store · checkout
      </div>
      <For each={PRODUCTS}>
        {(p) => (
          <div class="flex items-center gap-2 text-xs">
            <span class="flex-1 truncate">{p.name}</span>
            <button
              type="button"
              class="h-5 w-5 rounded border border-neutral-700 text-neutral-400 hover:border-rose-accent hover:text-rose-accent"
              onClick={() => bump(p.id, -1)}
            >
              −
            </button>
            <span class="w-4 text-center tabular-nums">{cart()[p.id] ?? 0}</span>
            <button
              type="button"
              class="h-5 w-5 rounded border border-neutral-700 text-neutral-400 hover:border-rose-accent hover:text-rose-accent"
              onClick={() => bump(p.id, 1)}
            >
              +
            </button>
            <span class="w-20 text-right text-neutral-400 tabular-nums">
              {formatMnt((cart()[p.id] ?? 0) * p.price)}
            </span>
          </div>
        )}
      </For>
      <div class="flex gap-3 border-t border-neutral-800 pt-3">
        <canvas
          ref={qr}
          width={100}
          height={100}
          class="h-[100px] w-[100px] shrink-0 rounded-md border border-neutral-800"
          aria-label="QPay QR placeholder"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="flex items-baseline justify-between">
            <span class="text-[10px] tracking-widest text-neutral-600 uppercase">qpay</span>
            <span class="text-sm font-bold text-neutral-100 tabular-nums">
              {formatMnt(total())}
            </span>
          </div>
          <div class="flex gap-1">
            <For each={otp()}>
              {(d, i) => (
                <input
                  value={d}
                  inputmode="numeric"
                  maxLength={1}
                  aria-label={`OTP digit ${i() + 1}`}
                  class="h-8 w-7 rounded-md border border-neutral-700 bg-black/40 text-center text-sm text-neutral-100 tabular-nums focus:border-rose-accent focus:outline-none"
                  onInput={(e) => setDigit(i(), e.currentTarget.value, e)}
                />
              )}
            </For>
          </div>
          <button
            type="button"
            class="rounded-md bg-rose-accent/90 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-rose-accent"
            onClick={confirm}
          >
            confirm payment
          </button>
          <div class="text-[10px] text-neutral-500">{status()}</div>
        </div>
      </div>
    </div>
  )
}
