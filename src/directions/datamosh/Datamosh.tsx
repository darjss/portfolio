import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js"
import { experience, education } from "../../data/experience"
import { profile } from "../../data/profile"
import { projects } from "../../data/projects"
import { socials } from "../../data/socials"
import { supportsHtmlInCanvas } from "../../lab/html-in-canvas"
import { createCodec, type CodecStats } from "./codec"
import { createSynth, type Synth } from "./synth"
import "./datamosh.css"

declare module "solid-js" {
  namespace JSX {
    interface ExplicitAttributes {
      layoutsubtree: string
    }
  }
}

const FPS = 30
const PX_PER_FRAME = 4
const TONES = ["acid", "pink", "blue"] as const

const CHAPTERS = [
  { id: "name", label: "name" },
  { id: "experience", label: "experience" },
  { id: "projects", label: "projects" },
  { id: "skills", label: "skills" },
  { id: "contact", label: "contact" },
]

const timecode = (px: number) => {
  const frames = Math.max(0, Math.round(px / PX_PER_FRAME))
  const seconds = Math.floor(frames / FPS)
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60, frames % FPS]
    .map((n) => String(n).padStart(2, "0"))
    .join(":")
}

function Chapter(props: { index: number; at: number; children: JSX.Element; class?: string }) {
  const chapter = CHAPTERS[props.index]
  return (
    <section class={`dm-chapter ${props.class ?? ""}`} data-chapter={chapter.id} aria-labelledby={`dm-h-${chapter.id}`}>
      <header class="dm-marker">
        <span>
          ch {props.index + 1}/{CHAPTERS.length}
        </span>
        <h2 class="dm-marker-label" id={`dm-h-${chapter.id}`} style={{ margin: 0, font: "inherit" }}>
          {chapter.label}
        </h2>
        <span class="dm-marker-rule" />
        <span class="dm-num">{timecode(props.at)}</span>
        <span class="dm-marker-type">I</span>
      </header>
      {props.children}
    </section>
  )
}

function Film(props: { offsets: number[]; ref?: (el: HTMLDivElement) => void }) {
  const featured = projects.filter((p) => p.featured)
  const rest = projects.filter((p) => !p.featured)
  const [first, ...headline] = profile.headline.split(" ")

  return (
    <div class="dm-film" ref={props.ref}>
      <Chapter index={0} at={props.offsets[0] ?? 0}>
        <p class="dm-hero-meta">
          {profile.fullName} · {profile.role.toLowerCase()} · {profile.location.toLowerCase()}
        </p>
        <h1 class="dm-display dm-name">{profile.name}</h1>
        <p class="dm-display dm-headline">
          {first} <span>{headline.join(" ")}</span>
        </p>
        <div class="dm-band">
          <p class="dm-display">{profile.tagline}</p>
        </div>
        <div class="dm-hero-body">
          <p class="dm-summary">{profile.summary}</p>
          <dl class="dm-facts">
            <dt>based</dt>
            <dd>{profile.location}</dd>
            <dt>status</dt>
            <dd>{profile.availability}</dd>
            <dt>mail</dt>
            <dd>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </dd>
            <dt>cv</dt>
            <dd>
              <a href={profile.cvUrl}>english pdf</a> · <a href={profile.cvMnUrl}>монгол pdf</a>
            </dd>
          </dl>
        </div>
      </Chapter>

      <Chapter index={1} at={props.offsets[1] ?? 0}>
        <For each={experience}>
          {(job, i) => (
            <article class="dm-job" data-tone={TONES[i() % TONES.length]}>
              <div>
                <h3 class="dm-display dm-job-company">{job.company}</h3>
                <p class="dm-job-role">{job.role}</p>
                <p class="dm-job-period">
                  {job.period}
                  <Show when={job.current}>
                    <span class="dm-now">now</span>
                  </Show>
                </p>
              </div>
              <div>
                <p class="dm-job-context">{job.context}</p>
                <ul class="dm-highlights">
                  <For each={job.highlights}>{(h) => <li>{h}</li>}</For>
                </ul>
              </div>
            </article>
          )}
        </For>
        <div class="dm-school">
          <For each={education}>
            {(e) => (
              <span>
                <strong>{e.school}</strong> · {e.program} · {e.period}
              </span>
            )}
          </For>
        </div>
      </Chapter>

      <Chapter index={2} at={props.offsets[2] ?? 0}>
        <For each={featured}>
          {(p) => (
            <article class="dm-proj">
              <h3 class="dm-display dm-proj-name">{p.name}</h3>
              <div>
                <p class="dm-proj-pitch">{p.pitch}</p>
                <p class="dm-proj-desc">{p.description}</p>
                <ul class="dm-stack">
                  <For each={p.stack}>{(s) => <li>{s}</li>}</For>
                </ul>
                <p class="dm-links">
                  <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                    source ↗
                  </a>
                  <Show when={p.websiteUrl}>
                    {(url) => (
                      <a href={url()} target="_blank" rel="noreferrer">
                        {url().replace("https://", "")} ↗
                      </a>
                    )}
                  </Show>
                </p>
              </div>
            </article>
          )}
        </For>
        <div class="dm-also">
          <p class="dm-also-title">also in this file</p>
          <For each={rest}>
            {(p) => (
              <article class="dm-also-row">
                <h3 class="dm-also-name">{p.name}</h3>
                <div>
                  <p>
                    <strong>{p.pitch}</strong>
                  </p>
                  <p>{p.description}</p>
                  <ul class="dm-stack">
                    <For each={p.stack}>{(s) => <li>{s}</li>}</For>
                  </ul>
                </div>
                <p class="dm-links">
                  <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                    source ↗
                  </a>
                </p>
              </article>
            )}
          </For>
        </div>
      </Chapter>

      <Chapter index={3} at={props.offsets[3] ?? 0}>
        <For each={profile.skills}>
          {(group, i) => (
            <div class="dm-stream" data-tone={TONES[i() % TONES.length]}>
              <p class="dm-stream-id">
                stream #0:{i()} · <strong>{group.label.toLowerCase()}</strong> · {group.items.length} tracks
              </p>
              <p class="dm-stream-items">
                <For each={group.items}>{(item) => <span>{item}</span>}</For>
              </p>
            </div>
          )}
        </For>
      </Chapter>

      <Chapter index={4} at={props.offsets[4] ?? 0} class="dm-contact">
        <p class="dm-contact-lead">{profile.availability.toLowerCase()}. write to</p>
        <a class="dm-display dm-mail" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
        <div class="dm-contact-meta">
          <ul class="dm-socials">
            <For each={socials}>
              {(s) => (
                <li>
                  <a href={s.url} target={s.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    {s.name}
                  </a>
                </li>
              )}
            </For>
          </ul>
          <p class="dm-links">
            <a href={profile.cvUrl}>cv.pdf</a>
            <a href={profile.cvMnUrl}>cv.mn.pdf</a>
          </p>
        </div>
        <p class="dm-eof">[eof] · {profile.site.replace("https://", "")}</p>
      </Chapter>
    </div>
  )
}

const measure = (film: HTMLElement) =>
  Array.from(film.querySelectorAll<HTMLElement>("[data-chapter]"), (el, i) => (i ? el.offsetTop + 48 : 0))

function Player(props: { onFail: () => void }) {
  let source!: HTMLCanvasElement
  let scroller!: HTMLDivElement
  let film!: HTMLDivElement
  let output!: HTMLCanvasElement

  const [offsets, setOffsets] = createSignal<number[]>([])
  const [scroll, setScroll] = createSignal(0)
  const [total, setTotal] = createSignal(1)
  const [height, setHeight] = createSignal(1)
  const [view, setView] = createSignal(1)
  const [stats, setStats] = createSignal<CodecStats>({ type: "P", gop: 0, stale: 0, motion: 0, decoded: false })
  const [started, setStarted] = createSignal(false)
  const [sound, setSound] = createSignal(false)
  let synth: Synth | null = null

  const remeasure = () => {
    setOffsets(measure(film))
    setTotal(Math.max(1, scroller.scrollHeight - scroller.clientHeight))
    setHeight(Math.max(1, scroller.scrollHeight))
    setView(scroller.clientHeight)
    setScroll(scroller.scrollTop)
  }

  const startSound = () => {
    if (synth) return
    synth = createSynth()
    setSound(true)
  }

  const toggleSound = async () => {
    if (!synth) return startSound()
    await synth.toggle()
    setSound(synth.playing)
  }

  onMount(() => {
    const codec = createCodec({
      source,
      content: scroller,
      output,
      pulse: () => synth?.sample() ?? { pump: 0, snare: 0, level: 0, bar: -1 },
      onStats: (s) =>
        setStats((prev) =>
          prev.type === s.type && prev.gop === s.gop && Math.abs(prev.stale - s.stale) < 0.01 && prev.decoded === s.decoded ? prev : s,
        ),
    })
    if (!codec) return props.onFail()

    const inHud = (e: Event) => e.target instanceof Element && e.target.closest("[data-hud]") !== null
    const onDown = (e: PointerEvent) => {
      if (!inHud(e)) codec.keyframe()
    }
    const onClick = (e: MouseEvent) => {
      if (inHud(e) || started()) return
      setStarted(true)
      startSound()
    }
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("click", onClick)
    const onScroll = () => setScroll(scroller.scrollTop)
    scroller.addEventListener("scroll", onScroll, { passive: true })
    const resize = new ResizeObserver(remeasure)
    resize.observe(film)
    resize.observe(scroller)
    void document.fonts.ready.then(remeasure)
    scroller.focus({ preventScroll: true })

    onCleanup(() => {
      codec.destroy()
      synth?.destroy()
      resize.disconnect()
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("click", onClick)
      scroller.removeEventListener("scroll", onScroll)
    })
  })

  const share = (px: number) => `${(Math.min(px, height()) / height()) * 100}%`

  const current = () => {
    if (scroll() >= total() - 2) return CHAPTERS.length - 1
    const y = scroll() + 160
    let index = 0
    offsets().forEach((o, i) => {
      if (y >= o) index = i
    })
    return index
  }

  const jump = (i: number) => scroller.scrollTo({ top: offsets()[i] ?? 0, behavior: "smooth" })

  return (
    <div class="dm dm-root">
      <canvas ref={source} class="dm-source" attr:layoutsubtree="true">
        <div ref={scroller} class="dm-scroll" tabindex="-1">
          <Film ref={(el) => (film = el)} offsets={offsets()} />
        </div>
      </canvas>
      <canvas ref={output} class="dm-output" aria-hidden="true" />
      <div class="dm-hud">
        <div class="dm-top">
          <span class="dm-file">darjs_cv.mkv</span>
          <span class="dm-quiet dm-hide-sm">avc1 · yuv420p · 16×16 macroblocks · {FPS} fps</span>
          <span class="dm-spacer" />
          <span class="dm-quiet dm-num dm-hide-sm">stale {Math.round(stats().stale * 100)}%</span>
          <span class="dm-quiet dm-num">gop {String(stats().gop).padStart(4, "0")}</span>
          <span class="dm-type" data-type={stats().decoded ? stats().type : "none"}>
            {stats().decoded ? (stats().type === "I" ? "I-frame" : "P-frame") : "no key"}
          </span>
        </div>
        <div class="dm-bottom" data-hud>
          <button class="dm-play" data-on={sound()} onClick={() => void toggleSound()}>
            {sound() ? "■ mute" : "▶ sound"}
          </button>
          <span class="dm-num">
            {timecode(scroll())}
            <span class="dm-quiet dm-hide-sm"> / {timecode(total())}</span>
          </span>
          <div class="dm-timeline">
            <For each={CHAPTERS}>
              {(c, i) => (
                <button
                  class="dm-seg"
                  data-active={current() === i()}
                  style={{
                    left: share(offsets()[i()] ?? 0),
                    width: `calc(${share((offsets()[i() + 1] ?? height()) - (offsets()[i()] ?? 0))})`,
                  }}
                  onClick={() => jump(i())}
                >
                  {c.label}
                </button>
              )}
            </For>
            <span class="dm-playhead" style={{ left: share(scroll() + (view() * scroll()) / total()) }} />
          </div>
        </div>
        <Show when={!started()}>
          <div class="dm-intro">missing keyframe. click anywhere to decode, sound on</div>
        </Show>
      </div>
    </div>
  )
}

function Raw() {
  let film!: HTMLDivElement
  const [offsets, setOffsets] = createSignal<number[]>([])
  onMount(() => {
    setOffsets(measure(film))
    void document.fonts.ready.then(() => setOffsets(measure(film)))
  })
  return (
    <div class="dm dm-raw">
      <div class="dm-raw-bar">
        <strong>darjs_cv.mkv</strong>
        <span class="dm-quiet">raw stream. this browser has no html-in-canvas, so the decoder is off</span>
      </div>
      <Film ref={(el) => (film = el)} offsets={offsets()} />
    </div>
  )
}

export default function Datamosh() {
  const [raw, setRaw] = createSignal(!supportsHtmlInCanvas())
  return (
    <Show when={!raw()} fallback={<Raw />}>
      <Player onFail={() => setRaw(true)} />
    </Show>
  )
}
