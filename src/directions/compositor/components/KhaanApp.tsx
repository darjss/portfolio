// khaan-client — a dead-serious internet-banking window, bank-grade form and all,
// sitting in the middle of the chaos. That contrast is the joke.

import { createSignal, Show } from "solid-js"

type Step = "login" | "dashboard" | "sotp" | "done"

export default function KhaanApp() {
  const [step, setStep] = createSignal<Step>("login")
  const [user, setUser] = createSignal("")
  const [account, setAccount] = createSignal("")
  const [amount, setAmount] = createSignal("")
  const [sotp, setSotp] = createSignal("")

  const inputClass =
    "w-full rounded border border-neutral-700 bg-black/40 px-2 py-1.5 text-xs text-neutral-100 tabular-nums focus:border-sky-500 focus:outline-none"

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div>
          <div class="text-sm font-bold tracking-wide text-neutral-100">KHAN BANK</div>
          <div class="text-[9px] tracking-[0.25em] text-neutral-500 uppercase">
            internet banking · secure session
          </div>
        </div>
        <span class="rounded border border-emerald-600/50 px-1.5 py-0.5 text-[9px] text-emerald-400">
          TLS 1.3
        </span>
      </div>

      <Show when={step() === "login"}>
        <form
          class="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setStep("dashboard")
          }}
        >
          <label class="text-[10px] text-neutral-500">
            Username
            <input
              class={inputClass}
              value={user()}
              onInput={(e) => setUser(e.currentTarget.value)}
              placeholder="dariimaa.e"
              autocomplete="off"
            />
          </label>
          <label class="text-[10px] text-neutral-500">
            Password
            <input class={inputClass} type="password" placeholder="••••••••" />
          </label>
          <button
            type="submit"
            class="mt-1 rounded bg-sky-700 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-600"
          >
            Log in
          </button>
          <div class="text-[9px] text-neutral-600">
            3-step SOTP auth · remembered-device relogin · typed errors
          </div>
        </form>
      </Show>

      <Show when={step() === "dashboard"}>
        <div class="flex flex-col gap-2">
          <div class="rounded border border-neutral-800 bg-white/[0.02] p-2.5">
            <div class="text-[10px] text-neutral-500">Current account · 5008 1142 24</div>
            <div class="text-lg font-bold text-neutral-100 tabular-nums">
              ₮4,204,200.69
            </div>
            <div class="text-[10px] text-neutral-500">
              {user() || "dariimaa.e"} · session reconciled
            </div>
          </div>
          <form
            class="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setStep("sotp")
            }}
          >
            <label class="text-[10px] text-neutral-500">
              To account
              <input
                class={inputClass}
                inputmode="numeric"
                maxLength={10}
                value={account()}
                onInput={(e) => setAccount(e.currentTarget.value.replace(/\D/g, ""))}
                placeholder="5011 ******"
              />
            </label>
            <label class="text-[10px] text-neutral-500">
              Amount (MNT)
              <input
                class={inputClass}
                inputmode="numeric"
                value={amount()}
                onInput={(e) => setAmount(e.currentTarget.value.replace(/\D/g, ""))}
                placeholder="50000"
              />
            </label>
            <button
              type="submit"
              class="mt-1 rounded bg-sky-700 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-600"
            >
              Transfer
            </button>
          </form>
        </div>
      </Show>

      <Show when={step() === "sotp"}>
        <form
          class="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setStep("done")
          }}
        >
          <div class="text-[11px] text-neutral-400">
            Transfer ₮{Number(amount() || "0").toLocaleString()} to {account() || "—"}.
            Enter the SOTP code sent to your registered device.
          </div>
          <input
            class={`${inputClass} text-center tracking-[0.5em]`}
            inputmode="numeric"
            maxLength={6}
            value={sotp()}
            onInput={(e) => setSotp(e.currentTarget.value.replace(/\D/g, ""))}
            placeholder="——————"
            aria-label="SOTP code"
          />
          <button
            type="submit"
            class="rounded bg-sky-700 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-600"
          >
            Confirm
          </button>
        </form>
      </Show>

      <Show when={step() === "done"}>
        <div class="flex flex-col gap-2">
          <div class="rounded border border-emerald-600/40 bg-emerald-500/10 p-3 text-center">
            <div class="text-sm font-bold text-emerald-400">Transfer accepted</div>
            <div class="mt-1 text-[10px] text-neutral-400">
              queued for automatic reconciliation via async iterator
            </div>
          </div>
          <button
            type="button"
            class="rounded border border-neutral-700 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500"
            onClick={() => setStep("dashboard")}
          >
            Back to accounts
          </button>
        </div>
      </Show>
    </div>
  )
}
