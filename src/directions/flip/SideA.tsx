import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { education, experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { projects } from "../../data/projects"
import { socials } from "../../data/socials"
import { hyperpopArtists } from "../../data/taste"
import { createDitheredIem, type DitheredIemInstance } from "./canvas/DitheredIem"

function project(slug: string) {
  return projects.find((p) => p.slug === slug)!
}

function AgentTerminal(props: { name: string; lines: string[]; offset: number }) {
  const [rows, setRows] = createSignal<string[]>([])
  const [current, setCurrent] = createSignal("")

  onMount(() => {
    let line = 0
    let ch = 0
    let timer = 0
    const typeNext = () => {
      timer = window.setInterval(() => {
        const text = props.lines[line]
        ch += 1
        if (ch <= text.length) {
          setCurrent(text.slice(0, ch))
        } else {
          window.clearInterval(timer)
          setRows((r) => [...r.slice(-2), text])
          setCurrent("")
          ch = 0
          line = (line + 1) % props.lines.length
          timer = window.setTimeout(typeNext, 800)
        }
      }, 34)
    }
    const kickoff = window.setTimeout(typeNext, props.offset)
    onCleanup(() => {
      window.clearInterval(timer)
      window.clearTimeout(timer)
      window.clearTimeout(kickoff)
    })
  })

  return (
    <div class="border border-neutral-700 bg-black/60 p-3 text-left text-[11px] leading-relaxed">
      <div class="mb-2 flex items-center justify-between text-neutral-500">
        <span>{props.name}</span>
        <span class="text-rose-accent">● live</span>
      </div>
      <For each={rows()}>
        {(row) => <div class="text-neutral-400">{row}</div>}
      </For>
      <div class="text-neutral-100">
        {current()}
        <span class="flip-caret text-rose-accent">▌</span>
      </div>
    </div>
  )
}

function IemStage() {
  let canvas!: HTMLCanvasElement
  const [failed, setFailed] = createSignal(false)
  let instance: DitheredIemInstance | null = null

  onMount(() => {
    instance = createDitheredIem(canvas)
    if (!instance) setFailed(true)
    onCleanup(() => {
      instance?.destroy()
      instance = null
    })
  })

  return (
    <div class="relative h-64 w-full border border-neutral-800">
      <canvas ref={canvas} class="block h-full w-full" aria-label="Dithered render of an IEM" />
      <Show when={failed()}>
        <div class="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
          [ iem render unavailable on this gpu ]
        </div>
      </Show>
      <div class="absolute bottom-2 left-2 text-[10px] text-neutral-500">
        FIG. 02 — 1-BIT BAYER DITHER, LIVE THREE.JS. SWEEP THE LENS OVER IT.
      </div>
    </div>
  )
}

export default function SideA(props: {
  slammed: boolean
  assembled: boolean
  onPlayDrop: () => void
  onAnswerCall: () => void
}) {
  const [cart, setCart] = createSignal(0)
  const [receipt, setReceipt] = createSignal("CART IS EMPTY. BUY VITAMINS.")
  const [ringing, setRinging] = createSignal(false)
  const [declined, setDeclined] = createSignal(false)
  const [bonus, setBonus] = createSignal(false)
  const [holdMsg, setHoldMsg] = createSignal(0)

  const holdMessages = [
    "your call is important to us.",
    "did you try remembering this device?",
    "step 2 of 3: SOTP sent to your phone.",
    "this call may be reconciled for quality purposes.",
    "all agents are busy reconciling transfers.",
  ]

  onMount(() => {
    const iv = window.setInterval(() => {
      setHoldMsg((m) => (m + 1) % holdMessages.length)
    }, 2600)
    onCleanup(() => window.clearInterval(iv))
  })

  const goods = [
    { name: "VIT-D3 5000IU", price: "₮24,000", code: "[D3]" },
    { name: "OMEGA-3 1000MG", price: "₮31,500", code: "[O3]" },
    { name: "MAGNESIUM GLY.", price: "₮28,000", code: "[MG]" },
  ]

  function addToCart(name: string) {
    setCart((c) => c + 1)
    setReceipt(`${name} ADDED — ${cart() + 1} ITEM(S) IN CART`)
  }

  function checkout() {
    if (cart() === 0) {
      setReceipt("CART IS EMPTY. THE STOREFRONT WORKS, TRY IT.")
      return
    }
    setReceipt(
      `QPAY INVOICE #${Math.floor(Math.random() * 90000 + 10000)} SENT — ${cart()} ITEM(S). CHECK YOUR PHONE.`,
    )
    setCart(0)
  }

  const track = (i: number) =>
    `flip-track border-t border-neutral-800 pt-10 ${props.assembled ? "on" : ""}`

  const delay = (i: number) => ({ "transition-delay": `${i * 140}ms` })

  return (
    <div class="mx-auto max-w-3xl px-6 pb-32 font-mono text-neutral-300 select-text">
      {/* masthead */}
      <header class="flex min-h-screen flex-col justify-center py-16">
        <div class="mb-6 flex items-center justify-between text-[10px] tracking-widest text-neutral-500">
          <span>DARJS.DEV — ISSUE #04 — DARIACORE ZINE</span>
          <span class="text-rose-accent">SIDE A</span>
        </div>
        <h1
          class={`flip-title text-5xl font-black leading-none tracking-tighter text-white sm:text-7xl ${props.slammed ? "slammed" : ""}`}
        >
          DARJS
          <br />
          <span class="text-rose-accent">— DEV —</span>
          <br />
          ULAANBAATAR
        </h1>
        <p class="mt-6 max-w-md text-xs leading-relaxed text-neutral-400">
          {profile.tagline}. {profile.bio}
        </p>

        {/* hex float nav */}
        <nav class="mt-10 flex flex-wrap items-center gap-1" aria-label="tracks">
          <For
            each={[
              ["01 STORE", "#track-1"],
              ["02 PLUGGED", "#track-2"],
              ["03 SKIT", "#track-3"],
              ["04 HERDR", "#track-4"],
              ["05 HOTLINE", "#track-5"],
              ["06 ERXES", "#track-6"],
            ]}
          >
            {([label, href], i) => (
              <a
                href={href}
                class="flip-hex flex h-16 w-20 items-center justify-center bg-neutral-800 text-center text-[9px] font-bold text-neutral-200 hover:bg-rose-accent hover:text-black"
                style={{ "animation-delay": `${i() * 0.25}s` }}
              >
                {label}
              </a>
            )}
          </For>
        </nav>

        <p class="mt-10 text-[10px] tracking-widest text-neutral-600">
          FOR FANS OF: {hyperpopArtists.slice(0, 5).join(" / ").toUpperCase()}
        </p>
        <p class="mt-1 text-[10px] tracking-widest text-neutral-600">
          CUT IN THE COLDEST CAPITAL ON EARTH. SCROLL LOUD.
        </p>
      </header>

      {/* tracklist header */}
      <div class="mb-4 flex items-end justify-between">
        <h2 class="text-2xl font-black text-white">SIDE A — TRACKLIST</h2>
        <span class="text-[10px] text-neutral-500">6 TRACKS + 1 HIDDEN</span>
      </div>

      {/* 01 vit-store */}
      <section id="track-1" class={track(1)} style={delay(0)}>
        <h3 class="text-lg font-bold text-white">
          01 vit-store <span class="text-rose-accent">(feat. QPay)</span>
        </h3>
        <p class="mt-2 text-xs leading-relaxed text-neutral-400">
          {project("vit-store").description}
        </p>
        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <For each={goods}>
            {(g) => (
              <div class="border border-neutral-700 p-3 text-center">
                <pre class="text-xs leading-snug text-neutral-300">
{`+----------+
|  ${g.code}   |
+----------+`}
                </pre>
                <div class="mt-2 text-xs font-bold text-white">{g.name}</div>
                <div class="text-xs text-neutral-400">{g.price}</div>
                <button
                  type="button"
                  class="mt-2 w-full border border-rose-accent px-2 py-1 text-[10px] font-bold text-rose-accent hover:bg-rose-accent hover:text-black"
                  onClick={() => addToCart(g.name)}
                >
                  ADD TO CART
                </button>
              </div>
            )}
          </For>
        </div>
        <div class="mt-4 flex items-center justify-between border border-neutral-700 px-3 py-2 text-[11px]">
          <span class="text-neutral-300">
            CART [{cart()}] — {receipt()}
          </span>
          <button
            type="button"
            class="font-bold text-rose-accent hover:underline"
            onClick={checkout}
          >
            CHECKOUT →
          </button>
        </div>
        <p class="mt-3 text-[10px] text-neutral-500">
          {project("vit-store").stack.join(" · ")} —{" "}
          <a class="underline" href={project("vit-store").sourceUrl}>
            source
          </a>
        </p>
      </section>

      {/* 02 plugged */}
      <section id="track-2" class={track(2)} style={delay(1)}>
        <h3 class="mt-10 text-lg font-bold text-white">02 plugged</h3>
        <p class="mt-2 text-xs leading-relaxed text-neutral-400">
          {project("plugged").description}
        </p>
        <div class="mt-6">
          <IemStage />
        </div>
        <p class="mt-3 text-[10px] text-neutral-500">
          {project("plugged").stack.join(" · ")} —{" "}
          <a class="underline" href={project("plugged").sourceUrl}>
            source
          </a>
        </p>
      </section>

      {/* 03 callrelay — the skit */}
      <section id="track-3" class={track(3)} style={delay(2)}>
        <h3 class="mt-10 text-lg font-bold text-white">
          03 callrelay <span class="text-rose-accent">(skit)</span>
        </h3>
        <p class="mt-2 text-xs leading-relaxed text-neutral-400">
          {project("callrelay").description}
        </p>
        <div class="mt-6 border border-neutral-700 p-4 text-center">
          <Show
            when={!ringing()}
            fallback={
              <div class="flip-ringing py-4">
                <div class="text-2xl font-black text-white">RING… RING…</div>
                <div class="mt-1 text-[11px] text-neutral-400">
                  +976 9911-XXXX — relayed through a Cloudflare Durable Object
                </div>
                <div class="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    class="border border-rose-accent px-4 py-1 text-xs font-bold text-rose-accent hover:bg-rose-accent hover:text-black"
                    onClick={() => {
                      setRinging(false)
                      props.onAnswerCall()
                    }}
                  >
                    ANSWER
                  </button>
                  <button
                    type="button"
                    class="border border-neutral-600 px-4 py-1 text-xs text-neutral-300 hover:border-white"
                    onClick={() => {
                      setRinging(false)
                      setDeclined(true)
                    }}
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            }
          >
            <button
              type="button"
              class="border border-neutral-500 px-6 py-2 text-xs font-bold tracking-widest text-white hover:border-rose-accent hover:text-rose-accent"
              onClick={() => {
                setRinging(true)
                setDeclined(false)
              }}
            >
              ▶ MAKE IT RING
            </button>
            <Show when={declined()}>
              <p class="mt-3 text-[10px] text-neutral-500">
                call ended. event persisted for delivery ✓
              </p>
            </Show>
          </Show>
        </div>
        <p class="mt-3 text-[10px] text-neutral-500">
          {project("callrelay").stack.join(" · ")} —{" "}
          <a class="underline" href={project("callrelay").sourceUrl}>
            source
          </a>
        </p>
      </section>

      {/* 04 herdr-orchestrate */}
      <section id="track-4" class={track(4)} style={delay(3)}>
        <h3 class="mt-10 text-lg font-bold text-white">04 herdr-orchestrate</h3>
        <p class="mt-2 text-xs leading-relaxed text-neutral-400">
          {project("herdr-orchestrate").description} These four agents type the
          lyrics in rounds:
        </p>
        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <AgentTerminal
            name="agent-1 — planner"
            offset={0}
            lines={[
              "$ herd run --model planner",
              "> isolating git worktree…",
              "♪ every verse in its own branch ♪",
            ]}
          />
          <AgentTerminal
            name="agent-2 — builder"
            offset={900}
            lines={[
              "$ herd run --model builder",
              "> typing checks pass, run board green",
              "♪ we write in rounds, never alone ♪",
            ]}
          />
          <AgentTerminal
            name="agent-3 — reviewer"
            offset={1800}
            lines={[
              "$ herd wait --for agent-2",
              "> preview-first cleanup, no orphans",
              "♪ audit the drop before it ships ♪",
            ]}
          />
          <AgentTerminal
            name="agent-4 — closer"
            offset={2700}
            lines={[
              "$ herd board --watch",
              "> durable run state, visible, safe",
              "♪ merge the choir, kill the lights ♪",
            ]}
          />
        </div>
        <p class="mt-3 text-[10px] text-neutral-500">
          {project("herdr-orchestrate").stack.join(" · ")} —{" "}
          <a class="underline" href={project("herdr-orchestrate").sourceUrl}>
            source
          </a>
        </p>
      </section>

      {/* 05 khaan-client */}
      <section id="track-5" class={track(5)} style={delay(4)}>
        <h3 class="mt-10 text-lg font-bold text-white">
          05 khaan-client <span class="text-rose-accent">(hold music interlude)</span>
        </h3>
        <p class="mt-2 text-xs leading-relaxed text-neutral-400">
          {project("khaan-client").description}
        </p>
        <div class="mt-6 border border-neutral-700 p-4">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-white">☎ KHAN BANK HOTLINE</span>
            <span class="text-neutral-400">you are caller #3 in queue</span>
          </div>
          <div class="mt-4 flex h-12 items-end gap-1" aria-hidden="true">
            <For each={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}>
              {(i) => (
                <div
                  class="flip-eq-bar w-full bg-rose-accent"
                  style={{
                    height: `${20 + ((i * 37) % 60)}%`,
                    "animation-delay": `${i * 0.09}s`,
                    "animation-duration": `${0.5 + ((i * 13) % 40) / 100}s`,
                  }}
                />
              )}
            </For>
          </div>
          <p class="mt-3 text-center text-[11px] italic text-neutral-400">
            "{holdMessages[holdMsg()]}"
          </p>
        </div>
        <p class="mt-3 text-[10px] text-neutral-500">
          {project("khaan-client").stack.join(" · ")} —{" "}
          <a class="underline" href={project("khaan-client").sourceUrl}>
            source
          </a>
        </p>
      </section>

      {/* 06 erxes */}
      <section id="track-6" class={track(6)} style={delay(5)}>
        <h3 class="mt-10 text-lg font-bold text-white">
          06 erxes <span class="text-rose-accent">(the day job)</span>
        </h3>
        <p class="mt-2 text-xs leading-relaxed text-neutral-400">
          {experience[0].context}
        </p>
        <ul class="mt-3 list-inside list-none text-xs text-neutral-400">
          <For each={experience[0].highlights}>
            {(h) => <li class="mt-1">▸ {h}</li>}
          </For>
        </ul>
        <p class="mt-3 text-[10px] text-neutral-500">
          {experience[0].role} — {experience[0].period}
        </p>
      </section>

      {/* hidden bonus track */}
      <section class={track(7)} style={delay(6)}>
        <div class="mt-10 border border-dashed border-neutral-700 p-4">
          <Show
            when={bonus()}
            fallback={
              <button
                type="button"
                class="w-full text-left text-xs tracking-widest text-neutral-600 hover:text-rose-accent"
                onClick={() => setBonus(true)}
              >
                07 ░░░░░░░░░░░░░░░░░░░░ [ CLASSIFIED — SCRATCH TO REVEAL ]
              </button>
            }
          >
            <h3 class="text-lg font-bold text-white">
              07 Golomt Bank <span class="text-rose-accent">(hidden bonus track)</span>
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-neutral-400">
              {experience[1].context} {experience[1].period}.
            </p>
            <ul class="mt-2 list-inside list-none text-xs text-neutral-400">
              <For each={experience[1].highlights}>
                {(h) => <li class="mt-1">▸ {h}</li>}
              </For>
            </ul>
          </Show>
        </div>
      </section>

      {/* the drop */}
      <section class="mt-24 mb-16 text-center">
        <p class="text-[10px] tracking-widest text-neutral-500">
          THIS PAGE IS A MASK. UNDERNEATH IT: A BANK-GRADE SERIF CV.
        </p>
        <button
          type="button"
          class="flip-drop-btn mt-6 border-2 border-rose-accent px-10 py-4 text-xl font-black tracking-widest text-rose-accent hover:bg-rose-accent hover:text-black"
          onClick={() => props.onPlayDrop()}
        >
          ▶ PLAY THE DROP
        </button>
        <p class="mt-4 text-[10px] text-neutral-600">
          shatters the ascii into glass. side b underneath. no refunds.
        </p>
      </section>

      {/* footer */}
      <footer class="border-t border-neutral-800 pt-8 text-[11px] text-neutral-500">
        <div class="flex flex-wrap gap-4">
          <For each={socials}>
            {(s) => (
              <a class="underline hover:text-rose-accent" href={s.url}>
                {s.name}
              </a>
            )}
          </For>
          <a class="underline hover:text-rose-accent" href={profile.cvUrl}>
            cv.pdf
          </a>
        </div>
        <p class="mt-4">
          {profile.fullName} — {profile.role} — {profile.location}.{" "}
          {education[0].school}, {education[0].period}.
        </p>
        <p class="mt-2 text-neutral-600">
          side b is the fallback. that is the punchline.
        </p>
      </footer>
    </div>
  )
}
