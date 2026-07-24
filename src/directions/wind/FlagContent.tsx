import { onCleanup, onMount, type JSX } from "solid-js"
import { education, experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { projects, type Project } from "../../data/projects"
import { socials } from "../../data/socials"
import { albums, books, fiveStarFilms, hyperpopArtists } from "../../data/taste"
import { createEmbers } from "./canvas/embers"
import type { Weather } from "./weather"

interface FlagContentProps {
  weather: () => Weather
  ringing: () => boolean
  onAnswer: () => void
  reducedMotion: boolean
}

const featured = projects.filter((project) => project.featured)
const loose = projects.filter((project) => !project.featured)
const bySlug = (slug: string) => featured.find((project) => project.slug === slug)!

const pennantColors = [
  "#f43f5e", "#e8a0b4", "#8fb8c8", "#e86a2a", "#c8d8b8", "#e8c84a",
]

const dyeAlbums = albums.filter((album) =>
  ["nostalgia, ULTRA", "Loveless", "Melodrama", "Discovery", "Depression Cherry", "Syro"].includes(album.title)
)

function PatchInfo(props: { project: Project }) {
  return (
    <>
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="text-base font-bold text-neutral-100">{props.project.name}</h3>
        <a
          class="shrink-0 text-xs text-rose-accent underline decoration-dotted"
          href={props.project.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          source ↗
        </a>
      </div>
      <p class="mt-1 text-xs leading-relaxed text-neutral-400">{props.project.pitch}</p>
      <p class="mt-2 text-[10px] text-neutral-500">
        {props.project.stack.slice(0, 6).join(" · ")}
      </p>
    </>
  )
}

function Stitch(props: {
  caption: string
  class?: string
  style?: JSX.CSSProperties
  unpad?: boolean
  children: JSX.Element
}) {
  return (
    <div
      class={`border-2 border-dashed border-neutral-600 bg-[#101010]/95 ${props.unpad ? "" : "p-4"} ${props.class ?? ""}`}
      style={props.style}
    >
      {props.children}
      <p class="mt-3 border-t border-dashed border-neutral-700 pt-2 text-[10px] text-neutral-500">
        {props.caption}
      </p>
    </div>
  )
}

function PrayerString(props: {
  items: { label: string; sub?: string }[]
  dur: () => number
  note: string
}) {
  return (
    <div class="relative">
      <div class="absolute inset-x-0 top-0 border-t-2 border-dashed border-neutral-600" />
      <div class="flex flex-wrap gap-x-4 gap-y-6 px-2 pt-0">
        {props.items.map((item, i) => (
          <div class="flex w-16 flex-col items-center">
            <div
              class="wind-pennant h-12 w-9"
              style={{
                background: pennantColors[i % pennantColors.length],
                "animation-duration": `${(props.dur() * (0.8 + (i % 5) * 0.14)).toFixed(2)}s`,
                "animation-delay": `${(-i * 0.23).toFixed(2)}s`,
              }}
            />
            <p class="mt-1 w-full truncate text-center text-[9px] text-neutral-400" title={item.label}>
              {item.label}
            </p>
            {item.sub ? (
              <p class="w-full truncate text-center text-[8px] text-neutral-600">{item.sub}</p>
            ) : null}
          </div>
        ))}
      </div>
      <p class="mt-3 text-[10px] text-neutral-600">{props.note}</p>
    </div>
  )
}

export default function FlagContent(props: FlagContentProps) {
  let emberCanvas!: HTMLCanvasElement

  // Wind-locked flap period in seconds: stronger wind, faster flap.
  const flap = () => Math.max(1.2, 4.6 - props.weather().windSpeed * 0.5)
  const pennantDur = () => Math.max(0.5, flap() * 0.35)

  onMount(() => {
    if (props.reducedMotion) return
    const handle = createEmbers(emberCanvas)
    if (handle) onCleanup(() => handle.destroy())
  })

  const films = fiveStarFilms.slice(0, 12).map((title) => ({ label: title }))
  const bookItems = books.map((book) => ({ label: book.title, sub: book.author }))

  return (
    <div class="relative bg-[#0a0a0a]/55 font-mono text-neutral-200">
      <div class="wind-weave pointer-events-none absolute inset-0" />

      {/* ————— HERO: the head of the flag ————— */}
      <header class="relative flex min-h-screen flex-col justify-center px-6 md:px-16">
        <p class="text-[10px] tracking-[0.3em] text-rose-accent">
          ULAANBAATAR · 47.92°N 106.92°E
        </p>
        <h1 class="mt-4 text-5xl font-bold leading-tight md:text-7xl">
          сайн байна уу
        </h1>
        <p class="mt-4 max-w-xl text-lg text-neutral-300 md:text-2xl">
          i make software in the coldest capital on earth.
        </p>
        <p class="mt-6 max-w-md text-xs leading-relaxed text-neutral-500">
          {profile.fullName} — {profile.role}. {profile.bio}
        </p>
        <p class="mt-10 max-w-sm text-[10px] leading-relaxed text-neutral-600">
          this page is one flag. its left edge is sewn to a pole; everything else
          flies free in whatever the sky over UB is doing right now. scroll to
          walk the length of the cloth.
        </p>
      </header>

      {/* ————— PRAYER FLAGS: films + books ————— */}
      <section class="relative px-6 py-14 md:px-16">
        <h2 class="mb-8 text-[10px] tracking-[0.3em] text-neutral-500">
          PRAYER FLAGS — STRUNG OFF THE MAIN CLOTH, FLUTTERING HIGHER
        </h2>
        <PrayerString
          items={films}
          dur={pennantDur}
          note="five-star films, letterboxd.com/Sjrad — each pennant its own small cloth"
        />
        <div class="mt-10">
          <PrayerString
            items={bookItems}
            dur={pennantDur}
            note="books on the nightstand — one is still being read"
          />
        </div>
      </section>

      {/* ————— PROJECTS: patches sewn into the flag ————— */}
      <section class="relative px-6 py-14 md:px-16">
        <h2 class="mb-2 text-[10px] tracking-[0.3em] text-neutral-500">
          PATCHES — FIVE PROJECTS SEWN INTO THE CLOTH
        </h2>
        <p class="mb-8 text-[10px] text-neutral-600">
          each patch flaps at its own frequency, locked to the same wind.
        </p>
        <div class="grid gap-8 md:grid-cols-2">
          {/* vit-store: market awning, flaps loud */}
          <Stitch
            caption="market-awning cotton. flaps loud."
            class="wind-flap pt-0"
            style={{ "animation-duration": `${flap().toFixed(2)}s` }}
          >
            <div
              class="-mx-4 -mt-0 mb-4 h-5 border-b-2 border-dashed border-neutral-600"
              style={{
                background:
                  "repeating-linear-gradient(90deg,#f43f5e 0 22px,#e5e5e5 22px 44px)",
              }}
            />
            <PatchInfo project={bySlug("vit-store")} />
          </Stitch>

          {/* plugged: earbud cutout, spins in gusts */}
          <Stitch
            caption="earbud-shaped cutout. spins when the gusts pick up."
            class="wind-earbud p-9"
            unpad
            style={{
              "border-radius": "46% 54% 52% 48% / 54% 47% 53% 46%",
              "animation-duration": `${(flap() * 1.7).toFixed(2)}s`,
            }}
          >
            <PatchInfo project={bySlug("plugged")} />
          </Stitch>

          {/* callrelay: rings in strong gusts */}
          <Stitch
            caption={
              props.ringing()
                ? "THE WIND IS CALLING."
                : "silent unless the gusts exceed the threshold."
            }
            class={props.ringing() ? "wind-ringing border-rose-accent" : "wind-flap"}
            style={{ "animation-duration": props.ringing() ? undefined : `${(flap() * 1.25).toFixed(2)}s` }}
          >
            <PatchInfo project={bySlug("callrelay")} />
            <button
              type="button"
              onClick={() => props.onAnswer()}
              class={`mt-3 border px-3 py-1 text-xs ${
                props.ringing()
                  ? "wind-ringing border-rose-accent bg-rose-accent/20 text-rose-accent"
                  : "border-neutral-700 text-neutral-500"
              }`}
            >
              {props.ringing() ? "📞 answer — the wind is calling" : "no incoming calls"}
            </button>
          </Stitch>

          {/* herdr-orchestrate: interleaved fabric strips */}
          <div class="relative">
            <div class="relative h-40">
              {[0, 1, 2, 3].map((i) => (
                <div
                  class="wind-strip relative h-10 overflow-hidden border-2 border-dashed border-neutral-600 bg-[#101010]/95"
                  style={{
                    "animation-duration": `${(flap() * (0.7 + i * 0.22)).toFixed(2)}s`,
                    "animation-delay": `${(-i * 0.4).toFixed(2)}s`,
                    "margin-top": i === 0 ? "0" : "-2px",
                  }}
                >
                  <div
                    class="absolute inset-x-0 top-0 h-40 px-4 pt-3"
                    style={{ transform: `translateY(${(-i * 40).toFixed(0)}px)` }}
                  >
                    <h3 class="text-lg font-bold text-neutral-100">
                      herdr-orchestrate<span class="ml-2 text-xs font-normal text-rose-accent">source ↗</span>
                    </h3>
                    <p class="mt-1 text-xs leading-relaxed text-neutral-400">
                      {bySlug("herdr-orchestrate").pitch}
                    </p>
                    <p class="mt-2 text-[10px] text-neutral-500">
                      {bySlug("herdr-orchestrate").stack.join(" · ")}
                    </p>
                    <div class="mt-2 flex items-center gap-1">
                      {["w1", "w2", "w3", "w4", "w5"].map((worker) => (
                        <span class="border border-neutral-600 px-1 text-[8px] text-neutral-500">
                          {worker}
                        </span>
                      ))}
                      <span class="ml-1 text-[8px] text-neutral-600">
                        run board · 3 waiting
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <a
              class="absolute inset-0 z-10 h-40"
              href={bySlug("herdr-orchestrate").sourceUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="herdr-orchestrate source"
            />
            <p class="mt-3 text-[10px] text-neutral-500">
              four interleaved strips — each its own cloth piece, each its own worker.
            </p>
          </div>

          {/* khaan-client: bank-grade heavy canvas */}
          <Stitch
            caption="12oz bank-grade canvas. the wind cannot afford to move it."
            class="border-4 border-solid border-neutral-500 bg-[#161616]"
          >
            <PatchInfo project={bySlug("khaan-client")} />
          </Stitch>
        </div>

        {/* loose threads: non-featured projects */}
        <div class="mt-10 flex flex-wrap items-center gap-4">
          <span class="text-[10px] text-neutral-600">loose threads:</span>
          {loose.map((project) => (
            <a
              class="border border-dashed border-neutral-600 bg-[#101010]/95 px-3 py-2 text-xs text-neutral-300"
              href={project.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={project.pitch}
            >
              {project.name} ↗
            </a>
          ))}
        </div>
      </section>

      {/* ————— FIRE / BIO: ger-fire glow, dye, embers ————— */}
      <section class="relative overflow-hidden px-6 py-24 md:px-16">
        {/* Liquid dye, nostalgia-ULTRA palette */}
        <div class="pointer-events-none absolute inset-0">
          <div
            class="wind-dye absolute -inset-24 opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(40% 45% at 30% 70%, rgba(232,106,42,0.5), transparent 70%), radial-gradient(35% 40% at 70% 40%, rgba(138,58,26,0.55), transparent 70%), radial-gradient(30% 30% at 55% 80%, rgba(244,63,94,0.28), transparent 70%)",
            }}
          />
        </div>
        {/* Blaze embers */}
        <canvas
          ref={emberCanvas}
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div class="relative">
          <h2 class="text-[10px] tracking-[0.3em] text-orange-200/70">
            THE GER FIRE — ABOUT
          </h2>
          <p class="mt-6 max-w-lg text-sm leading-relaxed text-orange-50/90">
            {profile.bio}
          </p>
          <p class="mt-3 max-w-lg text-xs leading-relaxed text-orange-100/60">
            the fire burns on nostalgia, ULTRA orange. the dye above is the
            record on the shelf: Frank Ocean, 2011.
          </p>

          <div class="mt-10">
            <p class="text-[10px] tracking-[0.3em] text-orange-200/50">
              DYE STAINS — RECORDS THAT COLORED THE CLOTH
            </p>
            <div class="mt-4 flex flex-wrap gap-4">
              {dyeAlbums.map((album) => (
                <div class="w-24">
                  <div
                    class="h-16 w-16 border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${album.palette[0]}, ${album.palette[1]})`,
                    }}
                  />
                  <p class="mt-1 truncate text-[9px] text-neutral-300" title={album.title}>
                    {album.title}
                  </p>
                  <p class="truncate text-[8px] text-neutral-500">{album.artist}</p>
                </div>
              ))}
            </div>
          </div>

          <div class="mt-10 overflow-hidden border-y border-orange-200/10 py-2">
            <div class="wind-ticker flex w-max gap-6 text-[10px] text-orange-100/50">
              {[0, 1].map(() => (
                <span>{hyperpopArtists.join(" · ")} ·&nbsp;</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ————— EXPERIENCE: the flagpole at the base ————— */}
      <section class="relative px-6 pb-8 pt-16 md:px-16">
        <h2 class="mb-10 text-[10px] tracking-[0.3em] text-neutral-500">
          THE FLAGPOLE — WHAT HOLDS EVERYTHING UP
        </h2>
        <div class="ml-3 border-l-4 border-neutral-600 pl-6 md:ml-6">
          <div class="mb-2 -ml-[31px] flex items-center gap-2 md:-ml-[37px]">
            <span class="h-2 w-2 rounded-full bg-rose-accent" />
            <span class="text-[10px] text-neutral-500">
              {experience[0].period} · the pole
            </span>
          </div>
          <h3 class="text-xl font-bold text-neutral-100">
            {experience[0].company} — {experience[0].role}
          </h3>
          <p class="mt-2 max-w-xl text-xs leading-relaxed text-neutral-400">
            {experience[0].context}
          </p>
          <ul class="mt-3 list-inside list-disc space-y-1 text-xs text-neutral-500">
            {experience[0].highlights.map((line) => (
              <li>{line}</li>
            ))}
          </ul>
        </div>

        {/* ground level + the buried footing */}
        <div class="mt-16 border-t-4 border-dotted border-neutral-700 pt-1">
          <p class="text-[9px] tracking-[0.3em] text-neutral-600">GROUND LEVEL</p>
        </div>
        <div class="relative mt-2 overflow-hidden">
          <div class="border border-neutral-700 bg-[#141414] p-4">
            <p class="text-[10px] text-neutral-500">
              {experience[1].period} · the concrete footing
            </p>
            <h3 class="mt-1 text-base font-bold text-neutral-300">
              {experience[1].company} — {experience[1].role}
            </h3>
            <p class="mt-1 text-xs text-neutral-500">{experience[1].context}</p>
            <ul class="mt-2 list-inside list-disc space-y-1 text-[11px] text-neutral-600">
              {experience[1].highlights.map((line) => (
                <li>{line}</li>
              ))}
            </ul>
          </div>
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
        </div>
        <p class="mt-2 text-[10px] text-neutral-600">
          poured concrete, half-buried. every pole needs one.
        </p>

        <div class="mt-8 text-[10px] text-neutral-600">
          {education.map((entry) => (
            <p>
              {entry.school} — {entry.program} · {entry.period}
            </p>
          ))}
        </div>
      </section>

      {/* ————— FOOTER ————— */}
      <footer class="relative flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-dashed border-neutral-800 px-6 py-10 pb-24 md:px-16">
        {socials.map((social) => (
          <a
            class="text-xs text-neutral-400 underline decoration-dotted hover:text-rose-accent"
            href={social.url}
            target={social.url.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
          >
            {social.name}
          </a>
        ))}
        <a
          class="text-xs text-neutral-400 underline decoration-dotted hover:text-rose-accent"
          href={profile.cvUrl}
        >
          cv.pdf
        </a>
        <span class="text-[10px] text-neutral-600">
          hem stitched in UB · wind data: open-meteo
        </span>
      </footer>
    </div>
  )
}
