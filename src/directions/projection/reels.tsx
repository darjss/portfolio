import { For, Show, createSignal, onCleanup, onMount, type JSX } from "solid-js"
import { education, experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { projects } from "../../data/projects"
import { socials } from "../../data/socials"
import { films } from "../../data/taste"
import { LOGICAL_HEIGHT, reels, smoothstep, window01, type ReelId } from "./timeline"

export type ReelProps = {
  u: () => number
  ref: (el: HTMLElement) => void
}

const H = LOGICAL_HEIGHT
const widthOf = (id: ReelId) => Math.round(H * reels.find((r) => r.id === id)!.aspect)
const job = (company: string) => experience.find((e) => e.company === company)!

const Frame = (props: { id: ReelId; ref: (el: HTMLElement) => void; style?: JSX.CSSProperties; children: JSX.Element }) => (
  <section
    ref={props.ref}
    class="pj-reel"
    data-reel={props.id}
    style={{ width: `${widthOf(props.id)}px`, height: `${H}px`, ...props.style }}
  >
    {props.children}
  </section>
)

const plateau = (x: number, n: number) => {
  const k = Math.min(Math.max(x, 0), n)
  const i = Math.min(Math.floor(k), n - 1)
  return i + smoothstep(0.3, 0.8, k - i)
}

const caslon = "'Libre Caslon Text', Georgia, serif"
const caslonDisplay = "'Libre Caslon Display', Georgia, serif"

export function Opening(props: ReelProps) {
  const card = (a: number, b: number) => () => window01(props.u(), a, b, 0.08, 0.08)
  const style = (opacity: () => number): JSX.CSSProperties => ({
    position: "absolute",
    inset: "0",
    display: "flex",
    "flex-direction": "column",
    "align-items": "center",
    "justify-content": "center",
    "text-align": "center",
    gap: "18px",
    opacity: opacity(),
  })
  const a = card(-1, 0.27)
  const b = card(0.25, 0.5)
  const c = card(0.48, 0.72)
  const d = card(0.7, 2)
  return (
    <Frame id="opening" ref={props.ref} style={{ "font-family": caslon }}>
      <div style={style(a)}>
        <h1 style={{ "font-family": caslonDisplay, "font-size": "132px", "font-weight": 400, margin: 0, "letter-spacing": "-0.01em", "line-height": 1 }}>
          {profile.name}
        </h1>
        <p style={{ "font-size": "22px", "font-variant": "small-caps", "letter-spacing": "0.12em", margin: 0, opacity: 0.86 }}>{profile.fullName}</p>
        <p style={{ position: "absolute", bottom: "54px", "font-size": "17px", "font-style": "italic", opacity: 0.6, margin: 0 }}>scroll to advance the reel</p>
      </div>
      <div style={style(b)}>
        <p style={{ "font-size": "20px", "font-style": "italic", margin: 0, opacity: 0.75 }}>{profile.role}</p>
        <p style={{ "font-family": caslonDisplay, "font-size": "64px", margin: 0, "line-height": 1.1 }}>{profile.headline}</p>
      </div>
      <div style={style(c)}>
        <p style={{ "font-family": caslonDisplay, "font-size": "54px", margin: 0 }}>{profile.location}</p>
        <p style={{ "font-size": "22px", "font-style": "italic", margin: 0, opacity: 0.8 }}>{profile.availability}</p>
      </div>
      <div style={style(d)}>
        <p style={{ "font-size": "27px", "line-height": 1.55, "max-width": "34em", margin: 0, "text-wrap": "pretty" }}>{profile.summary}</p>
      </div>
    </Frame>
  )
}

export function Golomt(props: ReelProps) {
  const golomt = job("Golomt Bank")
  const n = golomt.highlights.length
  const slot = 0.9 / n
  const header = () => smoothstep(0, 0.09, props.u())
  const shown = (i: number) => () => window01(props.u(), 0.1 + i * slot, i === n - 1 ? 2 : 0.1 + (i + 1) * slot, slot * 0.4, slot * 0.18)
  const light = () => props.u()
  const ink = "oklch(0.94 0.02 85)"
  return (
    <Frame id="golomt" ref={props.ref} style={{ "font-family": "'Libre Franklin', system-ui, sans-serif", color: ink }}>
      <div
        class="pj-fill"
        style={{
          background: `radial-gradient(ellipse at 50% ${30 + light() * 30}%, oklch(0.62 0.035 165) 0%, oklch(0.44 0.03 170) 55%, oklch(0.27 0.02 170) 100%)`,
        }}
      />
      <div
        class="pj-fill"
        style={{
          "background-image": "linear-gradient(oklch(0.22 0.02 170 / 0.55) 2px, transparent 2px), linear-gradient(90deg, oklch(0.22 0.02 170 / 0.55) 2px, transparent 2px)",
          "background-size": "62px 62px",
          "background-position": "center 18px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "64px",
          width: "456px",
          height: "560px",
          transform: "translateX(-50%)",
          border: "14px solid oklch(0.82 0.03 85)",
          "box-shadow": "inset 0 0 0 2px oklch(0.3 0.02 60)",
          background: `linear-gradient(180deg, oklch(${0.17 + light() * 0.05} 0.02 60) 0%, oklch(${0.24 + light() * 0.06} 0.035 ${70 - light() * 20}) 100%)`,
          padding: "34px 34px",
          "box-sizing": "border-box",
        }}
      >
        <div style={{ "text-align": "center", opacity: header() }}>
          <h2 style={{ margin: 0, "font-size": "34px", "font-weight": 300, "letter-spacing": "0.01em" }}>{golomt.company}</h2>
        </div>
        <div style={{ position: "relative", "margin-top": "34px" }}>
          <For each={golomt.highlights}>
            {(text, i) => (
              <p style={{ position: "absolute", top: 0, left: 0, right: 0, margin: 0, "font-size": "19px", "line-height": 1.6, "font-weight": 350, "text-align": "center", "text-wrap": "pretty", opacity: shown(i())() }}>
                {text}
              </p>
            )}
          </For>
        </div>
      </div>
      <p style={{ position: "absolute", left: "34px", top: "300px", width: "190px", margin: 0, "text-align": "right", "font-size": "14px", "line-height": 1.5, opacity: header() * 0.85 }}>
        {golomt.period}
      </p>
      <p style={{ position: "absolute", right: "34px", top: "300px", width: "190px", margin: 0, "font-size": "14px", "line-height": 1.5, opacity: header() * 0.85 }}>
        {golomt.role}
      </p>
      <p style={{ position: "absolute", left: "50%", bottom: "34px", width: "620px", transform: "translateX(-50%)", margin: 0, "text-align": "center", "font-size": "14px", "line-height": 1.5, opacity: header() * 0.8 }}>
        {golomt.context}
      </p>
      <div style={{ position: "absolute", left: "50%", top: "636px", transform: "translateX(-50%)", display: "flex", gap: "12px" }}>
        <For each={golomt.highlights}>
          {(_, i) => <span style={{ width: "8px", height: "8px", background: ink, opacity: 0.25 + shown(i())() * 0.75 }} />}
        </For>
      </div>
    </Frame>
  )
}

const erxes = job("erxes")
const ERXES_SLOTS = erxes.highlights.length + 1
const RADIUS = 860
const FLOOR = 2600

export const erxesCamera = (u: number) => {
  const x = u * (ERXES_SLOTS - 1 + 0.35)
  const slot = plateau(x, ERXES_SLOTS - 1)
  const between = x - Math.floor(x)
  const strobe = between > 0.38 && between < 0.66 && Math.floor(x) < ERXES_SLOTS - 1
  return { slot, strobe, next: Math.floor(x) + 1 }
}

export const strobeWord = (slot: number) => {
  if (slot <= 0) return erxes.company.toUpperCase()
  const text = erxes.highlights[slot - 1]
  return text.split(/\s+/)[0].replace(/[^\p{L}-]/gu, "").toUpperCase()
}

export function Erxes(props: ReelProps & { spin: () => number }) {
  const angle = (slot: number) => (slot * Math.PI * 2) / ERXES_SLOTS
  const pos = (slot: number) => ({ x: FLOOR / 2 + RADIUS * Math.sin(angle(slot)), y: FLOOR / 2 - RADIUS * Math.cos(angle(slot)) })
  const camera = () => {
    const { slot } = erxesCamera(props.u())
    const p = pos(slot)
    const travel = Math.sin((slot - Math.floor(slot)) * Math.PI)
    const scale = 1 - travel * 0.42
    const w = widthOf("erxes")
    return `translate(${w / 2}px, ${H / 2}px) scale(${scale}) rotate(${-angle(slot) + props.spin()}rad) translate(${-p.x}px, ${-p.y}px)`
  }
  const card = (slot: number): JSX.CSSProperties => {
    const p = pos(slot)
    return {
      position: "absolute",
      left: `${p.x}px`,
      top: `${p.y}px`,
      width: "760px",
      transform: `translate(-50%, -50%) rotate(${angle(slot)}rad)`,
      "text-align": "left",
    }
  }
  return (
    <Frame id="erxes" ref={props.ref} style={{ "font-family": "'Archivo', system-ui, sans-serif", background: "#030303" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${FLOOR}px`,
          height: `${FLOOR}px`,
          "transform-origin": "0 0",
          transform: camera(),
          background: [
            "radial-gradient(circle at 50% 50%, transparent 0 1040px, oklch(0.2 0.02 20) 1041px 1046px, transparent 1047px)",
            "radial-gradient(circle at 26% 30%, oklch(0.55 0.24 25 / 0.75), transparent 24%)",
            "radial-gradient(circle at 74% 28%, oklch(0.62 0.22 145 / 0.6), transparent 22%)",
            "radial-gradient(circle at 70% 76%, oklch(0.5 0.24 330 / 0.6), transparent 24%)",
            "radial-gradient(circle at 28% 74%, oklch(0.5 0.2 265 / 0.65), transparent 24%)",
            "radial-gradient(circle at 50% 50%, oklch(0.16 0.02 30), oklch(0.05 0 0) 70%)",
          ].join(","),
        }}
      >
        <div style={card(0)}>
          <h2 style={{ margin: 0, "font-size": "150px", "font-weight": 900, "font-stretch": "125%", "line-height": 0.9, "letter-spacing": "-0.01em" }}>{erxes.company}</h2>
          <p style={{ margin: "18px 0 0", "font-size": "22px", "font-weight": 700 }}>
            {erxes.role} · {erxes.period}
          </p>
          <p style={{ margin: "10px 0 0", "font-size": "20px", "line-height": 1.45, "font-weight": 450, "max-width": "40em" }}>{erxes.context}</p>
        </div>
        <For each={erxes.highlights}>
          {(text, i) => (
            <div style={card(i() + 1)}>
              <span style={{ display: "block", "font-size": "56px", "font-weight": 900, "font-stretch": "125%", color: "oklch(0.72 0.2 25)", "line-height": 1 }}>
                {String(i() + 1).padStart(2, "0")}
              </span>
              <p style={{ margin: "14px 0 0", "font-size": "25px", "line-height": 1.42, "font-weight": 560, "text-wrap": "pretty" }}>{text}</p>
            </div>
          )}
        </For>
      </div>
    </Frame>
  )
}

export function Strobe(props: { ref: (el: HTMLElement) => void; word: () => string; invert: () => boolean }) {
  return (
    <Frame
      id="erxes"
      ref={props.ref}
      style={{
        background: props.invert() ? "oklch(0.62 0.25 27)" : "#000",
        color: props.invert() ? "#000" : "#fff",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        "font-family": "'Archivo', system-ui, sans-serif",
      }}
    >
      <p style={{ margin: 0, "font-size": "190px", "font-weight": 900, "font-stretch": "125%", "letter-spacing": "-0.02em", "line-height": 1 }}>{props.word()}</p>
    </Frame>
  )
}

export function Amerik(props: ReelProps) {
  const amerik = job("Amerik Vitamin")
  const site = projects.find((p) => p.websiteUrl)?.websiteUrl
  const W = widthOf("amerik")
  const room = () => plateau(props.u() * 2.3, 2)
  const red = "oklch(0.3 0.13 25)"
  const amber = "oklch(0.8 0.14 70)"
  const bodoni = "'Bodoni Moda', Didot, serif"
  const roomStyle = (i: number, extra: JSX.CSSProperties): JSX.CSSProperties => ({ position: "absolute", top: 0, left: `${i * W}px`, width: `${W}px`, height: `${H}px`, ...extra })
  return (
    <Frame id="amerik" ref={props.ref} style={{ "font-family": bodoni, background: red, color: "oklch(0.95 0.03 80)" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-room() * W}px)` }}>
        <div style={roomStyle(0, { background: "#050302", display: "flex", "flex-direction": "column", "align-items": "center", "justify-content": "center", gap: "28px" })}>
          <p style={{ margin: 0, "font-size": "36px", "font-style": "italic", "line-height": 1.45, "max-width": "22em", "text-align": "center" }}>{amerik.context}</p>
          <p style={{ margin: 0, "font-size": "15px", "letter-spacing": "0.08em", opacity: 0.7 }}>
            {amerik.company} · {amerik.role} · {amerik.period}
          </p>
        </div>
        <div
          style={roomStyle(1, {
            background: `radial-gradient(circle at 78% 22%, oklch(0.85 0.15 75 / 0.85), transparent 30%), radial-gradient(ellipse at 30% 110%, oklch(0.4 0.09 160 / 0.6), transparent 50%), linear-gradient(90deg, oklch(0.22 0.11 25), ${red} 40%, oklch(0.38 0.15 28))`,
          })}
        >
          <div style={{ position: "absolute", left: "380px", top: "150px", width: "620px" }}>
            <h2 style={{ margin: 0, "font-size": "76px", "font-style": "italic", "font-weight": 500, color: amber, "line-height": 1 }}>{amerik.company}</h2>
            <p style={{ margin: "30px 0 0", "font-size": "24px", "line-height": 1.55, "text-wrap": "pretty" }}>{amerik.highlights[0]}</p>
          </div>
        </div>
        <div
          style={roomStyle(2, {
            background: `radial-gradient(circle at 18% 70%, oklch(0.8 0.15 70 / 0.7), transparent 28%), linear-gradient(90deg, oklch(0.36 0.15 28), oklch(0.24 0.1 22))`,
          })}
        >
          <div style={{ position: "absolute", left: "480px", top: "210px", width: "560px" }}>
            <p style={{ margin: 0, "font-size": "28px", "line-height": 1.5, "font-style": "italic", "text-wrap": "pretty" }}>{amerik.highlights[1]}</p>
            <Show when={site}>
              {(url) => (
                <a href={url()} style={{ display: "inline-block", "margin-top": "34px", "font-size": "22px", color: amber }}>
                  {new URL(url()).hostname}
                </a>
              )}
            </Show>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-room() * W * 1.55}px)`, "pointer-events": "none" }}>
        <For each={[0.86, 1.82, 2.74]}>
          {(k, i) => (
            <div
              style={{
                position: "absolute",
                top: "-20px",
                left: `${k * W * 1.55 - (i() === 1 ? 260 : 0)}px`,
                width: `${i() === 1 ? 300 : 230}px`,
                height: `${H + 40}px`,
                background: "linear-gradient(90deg, #070302, oklch(0.16 0.05 30) 50%, #050201)",
                filter: "blur(6px)",
              }}
            />
          )}
        </For>
      </div>
    </Frame>
  )
}

const washes = [
  { bg: "oklch(0.36 0.17 266)", ink: "oklch(0.97 0.02 95)" },
  { bg: "oklch(0.85 0.17 94)", ink: "oklch(0.22 0.06 266)" },
  { bg: "oklch(0.5 0.13 160)", ink: "oklch(0.97 0.02 95)" },
  { bg: "oklch(0.55 0.21 26)", ink: "oklch(0.98 0.01 95)" },
  { bg: "oklch(0.4 0.16 300)", ink: "oklch(0.97 0.02 95)" },
  { bg: "oklch(0.72 0.12 236)", ink: "oklch(0.2 0.06 266)" },
]

export function Projects(props: ReelProps) {
  const stageW = projects.map((p) => (p.featured ? 1160 : 860))
  const lefts = stageW.map((_, i) => stageW.slice(0, i).reduce((a, b) => a + b, 0))
  const total = lefts[lefts.length - 1] + stageW[stageW.length - 1]
  const W = widthOf("projects")
  const n = projects.length
  const position = () => plateau(props.u() * (n - 1 + 0.3), n - 1)
  const camera = () => {
    const k = position()
    const i = Math.min(Math.floor(k), n - 2)
    const f = k - i
    const center = (j: number) => lefts[j] + stageW[j] / 2
    const x = center(i) + (center(i + 1) - center(i)) * f
    const travel = Math.sin(f * Math.PI)
    return `translate(${W / 2 - x}px, ${-travel * 22}px) scale(${1.02 - travel * 0.03})`
  }
  const gradient = projects.map((_, i) => `${washes[i % washes.length].bg} ${lefts[i] + stageW[i] * 0.5}px`).join(", ")
  return (
    <Frame id="projects" ref={props.ref} style={{ "font-family": "'Josefin Sans', system-ui, sans-serif", background: washes[0].bg }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: `${total}px`, height: `${H}px`, "transform-origin": `${W / 2}px ${H / 2}px`, transform: camera(), background: `linear-gradient(90deg, ${gradient})` }}>
        <For each={projects}>
          {(p, i) => {
            const wash = washes[i() % washes.length]
            return (
              <article
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${lefts[i()]}px`,
                  width: `${stageW[i()]}px`,
                  height: `${H}px`,
                  color: wash.ink,
                  background: "radial-gradient(ellipse 46% 60% at 50% 46%, oklch(1 0 0 / 0.22), transparent 70%)",
                  display: "flex",
                  "flex-direction": "column",
                  "justify-content": "center",
                  padding: p.featured ? "0 150px" : "0 110px",
                  "box-sizing": "border-box",
                }}
              >
                <h3 style={{ margin: 0, "font-size": p.featured ? "92px" : "64px", "font-weight": 700, "line-height": 0.95, "letter-spacing": "-0.01em" }}>{p.name}</h3>
                <p style={{ margin: "18px 0 0", "font-size": p.featured ? "27px" : "23px", "font-style": "italic", "font-weight": 400, "line-height": 1.3 }}>{p.pitch}</p>
                <p style={{ margin: "20px 0 0", "font-size": "19px", "line-height": 1.55, "font-weight": 400, "max-width": "40em", "text-wrap": "pretty" }}>{p.description}</p>
                <p style={{ margin: "18px 0 0", "font-size": "15px", "line-height": 1.6, "font-weight": 600, opacity: 0.85 }}>{p.stack.join("  /  ")}</p>
                <p style={{ margin: "22px 0 0", display: "flex", gap: "26px", "font-size": "19px", "font-weight": 600 }}>
                  <a href={p.sourceUrl}>source</a>
                  <Show when={p.websiteUrl}>{(url) => <a href={url()}>{new URL(url()).hostname}</a>}</Show>
                </p>
              </article>
            )
          }}
        </For>
      </div>
    </Frame>
  )
}

export function Credits(props: ReelProps) {
  let roll!: HTMLDivElement
  const [height, setHeight] = createSignal(2000)
  onMount(() => {
    const observer = new ResizeObserver(() => setHeight(roll.offsetHeight))
    observer.observe(roll)
    onCleanup(() => observer.disconnect())
  })
  const y = () => H - smoothstep(0, 0.97, props.u()) * (height() + 160)
  const row = (label: string, value: JSX.Element) => (
    <div style={{ display: "grid", "grid-template-columns": "1fr 1fr", gap: "36px", margin: "0 0 14px" }}>
      <span style={{ "text-align": "right", "font-style": "italic", opacity: 0.66 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
  const block = (children: JSX.Element) => <div style={{ margin: "0 0 70px" }}>{children}</div>
  const cv = [
    { label: "english", url: profile.cvUrl },
    { label: "mongolian", url: profile.cvMnUrl },
  ]
  return (
    <Frame id="credits" ref={props.ref} style={{ "font-family": caslon, "font-size": "21px", "line-height": 1.45 }}>
      <div ref={roll} style={{ position: "absolute", left: "50%", top: 0, width: "860px", transform: `translate(-50%, ${y()}px)` }}>
        {block(
          <div style={{ "text-align": "center" }}>
            <p style={{ margin: 0, "font-family": caslonDisplay, "font-size": "84px", "line-height": 1 }}>{profile.name}</p>
            <p style={{ margin: "14px 0 0", "font-variant": "small-caps", "letter-spacing": "0.1em" }}>{profile.fullName}</p>
            <p style={{ margin: "6px 0 0", "font-style": "italic", opacity: 0.75 }}>
              {profile.role} · {profile.headline}
            </p>
          </div>,
        )}
        {block(<For each={profile.skills}>{(group) => row(group.label, group.items.join(", "))}</For>)}
        {block(<For each={education}>{(e) => row(e.school, `${e.program}, ${e.period}`)}</For>)}
        {block(
          <>
            {row("email", <a href={`mailto:${profile.email}`}>{profile.email}</a>)}
            {row("based in", profile.location)}
            {row("available", profile.availability)}
            {row(
              "cv",
              <span style={{ display: "inline-flex", gap: "20px" }}>
                <For each={cv}>{(c) => <a href={c.url}>{c.label}</a>}</For>
              </span>,
            )}
            <For each={socials}>{(s) => row(s.name, <a href={s.url}>{s.url.replace(/^mailto:|^https:\/\//, "").replace(/\/$/, "")}</a>)}</For>
          </>,
        )}
        {block(
          <>
            {row(
              "favourite films",
              <span style={{ display: "flex", "flex-direction": "column" }}>
                <For each={films.favourites}>{(f) => <span>{f}</span>}</For>
              </span>,
            )}
            {row("films logged", <a href={films.letterboxd}>{films.total} on letterboxd</a>)}
          </>,
        )}
        <div style={{ "text-align": "center", padding: "40px 0 0" }}>
          <p style={{ margin: 0, "font-family": caslonDisplay, "font-size": "64px", "font-style": "italic" }}>fin</p>
          <p style={{ margin: "16px 0 0" }}>
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </p>
        </div>
      </div>
    </Frame>
  )
}
