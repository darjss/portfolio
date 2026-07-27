import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { A } from "@solidjs/router"
import Plate, { pad2 } from "./Plate"
import CvReverse from "./CvReverse"
import { supportsHtmlInCanvas } from "./canvas/GhostPlate"
import { createPressSound } from "./sound"
import { profile } from "../../data/profile"
import { projects, type Project } from "../../data/projects"
import { experience, type Experience } from "../../data/experience"
import { socials } from "../../data/socials"
import "./off-register.css"

const TOTAL = 9

function ProjectBody(props: { project: Project }) {
  return (
    <div>
      <h3 class="font-mono text-2xl font-bold tracking-tight">{props.project.name}</h3>
      <p class="mt-1 font-mono text-sm text-[#16130e]/70">{props.project.pitch}</p>
      <p class="mt-3 max-w-xl font-mono text-[13px] leading-relaxed text-[#16130e]/85">
        {props.project.description}
      </p>
      <div class="mt-3 flex gap-4 font-mono text-xs">
        <a
          href={props.project.sourceUrl}
          target="_blank"
          rel="noreferrer"
          class="underline decoration-[#e86a2a] decoration-2 underline-offset-4"
        >
          source ↗
        </a>
        <Show when={props.project.websiteUrl}>
          {(url) => (
            <a
              href={url()}
              target="_blank"
              rel="noreferrer"
              class="underline decoration-[#e86a2a] decoration-2 underline-offset-4"
            >
              site ↗
            </a>
          )}
        </Show>
      </div>
    </div>
  )
}

function ProjectSpec(props: { project: Project }) {
  return (
    <div class="mt-5 border-t border-dashed border-[#16130e]/25 pt-3 font-mono text-[11px] leading-relaxed text-[#16130e]/75">
      <p>
        <span class="text-[#e86a2a]">stack ×{props.project.stack.length}</span> —{" "}
        {props.project.stack.join(" · ")}
      </p>
    </div>
  )
}

function JobBody(props: { job: Experience }) {
  return (
    <div>
      <h3 class="font-mono text-2xl font-bold tracking-tight">
        {props.job.company}
        <Show when={props.job.current}>
          <span class="ml-3 align-middle font-mono text-[10px] tracking-[0.25em] text-[#e86a2a] uppercase">
            current
          </span>
        </Show>
      </h3>
      <p class="mt-1 font-mono text-sm text-[#16130e]/70">
        {props.job.role} · {props.job.period}
      </p>
      <p class="mt-3 max-w-xl font-mono text-[13px] leading-relaxed text-[#16130e]/85">
        {props.job.context}
      </p>
      <ul class="mt-3 max-w-xl list-disc space-y-1.5 pl-5 font-mono text-[13px] leading-relaxed text-[#16130e]/85">
        <For each={props.job.highlights}>{(item) => <li>{item}</li>}</For>
      </ul>
    </div>
  )
}

function SpecLine(props: { children: string }) {
  return (
    <div class="mt-5 border-t border-dashed border-[#16130e]/25 pt-3 font-mono text-[11px] leading-relaxed text-[#16130e]/75">
      <p>{props.children}</p>
    </div>
  )
}

export default function OffRegister() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  // Full two-plate press only where Chrome's html-in-canvas exists and motion
  // is welcome. Everywhere else: the sheet arrives already registered.
  const supported = !reducedMotion && supportsHtmlInCanvas()

  const sound = createPressSound()

  const initial: Record<number, boolean> = {}
  if (!supported) for (let i = 1; i <= TOTAL; i++) initial[i] = true
  const [done, setDone] = createSignal<Record<number, boolean>>(initial)
  const [flipped, setFlipped] = createSignal(false)

  const count = () => Object.keys(done()).length
  const isDone = (no: number) => Boolean(done()[no])

  function register(no: number) {
    setDone((prev) => (prev[no] ? prev : { ...prev, [no]: true }))
  }

  // the hum thins as plates lock; the ninth lock kills it entirely,
  // then one heavy press stroke flips the sheet to its CV reverse
  createEffect(() => {
    const c = count()
    if (!supported) return
    sound.setHum(1 - c / TOTAL)
    if (c === TOTAL) {
      sound.silence()
      const t1 = window.setTimeout(() => sound.thunk(true), 800)
      const t2 = window.setTimeout(() => setFlipped(true), 1800)
      onCleanup(() => {
        window.clearTimeout(t1)
        window.clearTimeout(t2)
      })
    }
  })

  onMount(() => {
    if (!supported) return
    const unlock = () => sound.unlock()
    window.addEventListener("pointerdown", unlock, { once: true })
    onCleanup(() => window.removeEventListener("pointerdown", unlock))
  })

  onCleanup(() => sound.destroy())

  const featured = projects.filter((project) => project.featured)
  const [erxesJob, golomtJob] = experience
  const plateNo = (project: Project) => 3 + featured.indexOf(project)

  return (
    <main class="min-h-full bg-[#f7f3ec] pb-28 text-[#16130e]">
      {/* press header */}
      <header class="border-b-2 border-[#16130e] px-5 py-3 sm:px-8">
        <div class="mx-auto flex max-w-3xl items-center justify-between font-mono text-[10px] tracking-[0.3em] uppercase">
          <A href="/" class="underline decoration-[#16130e]/30 underline-offset-4">
            ← darjs.dev
          </A>
          <span class="text-[#16130e]/60">off-register — a mis-registered press sheet</span>
        </div>
      </header>

      <Show when={!supported}>
        <p class="mx-auto max-w-3xl px-5 pt-6 font-mono text-[11px] leading-relaxed text-[#16130e]/60 sm:px-8">
          this browser can't run the two-plate press (or you asked for reduced
          motion), so every plate arrived already registered.{" "}
          <button
            type="button"
            class="text-[#e86a2a] underline underline-offset-4"
            onClick={() => setFlipped(true)}
          >
            read the reverse — the clean CV
          </button>
        </p>
      </Show>

      {/* 01 — masthead */}
      <Plate
        no={1}
        title="masthead"
        supported={supported}
        registered={isDone(1)}
        sound={sound}
        onRegister={() => register(1)}
        hint="plate 01 is out of register — grab the ⌖ mark, pull the orange ghost onto the black type, and hold until it snaps."
        spec={
          <div class="mt-5 border-t border-dashed border-[#16130e]/25 pt-3 font-mono text-[11px] leading-relaxed text-[#16130e]/75">
            <p>
              47.9206°N 106.9167°E ·{" "}
              <a href={`mailto:${profile.email}`} class="underline underline-offset-2">
                {profile.email}
              </a>{" "}
              ·{" "}
              <a
                href={profile.site}
                target="_blank"
                rel="noreferrer"
                class="underline underline-offset-2"
              >
                {profile.site.replace("https://", "")}
              </a>{" "}
              ·{" "}
              <a href={profile.cvUrl} class="underline underline-offset-2">
                CV.pdf
              </a>
            </p>
          </div>
        }
      >
        <h1 class="font-mono text-4xl font-bold tracking-tight sm:text-6xl">
          {profile.fullName}
        </h1>
        <p class="mt-2 font-mono text-sm sm:text-base">
          <span class="text-[#e86a2a]">{profile.name}</span> — {profile.role} ·{" "}
          {profile.location}
        </p>
        <p class="mt-4 max-w-xl font-mono text-[13px] leading-relaxed text-[#16130e]/85">
          {profile.bio}
        </p>
        <p class="mt-3 font-mono text-xs italic text-[#16130e]/60">"{profile.tagline}"</p>
      </Plate>

      {/* 02 — erxes */}
      <Plate
        no={2}
        title="erxes — work"
        supported={supported}
        registered={isDone(2)}
        sound={sound}
        onRegister={() => register(2)}
        spec={
          <SpecLine>
            25,000+ organizations · 100+ product modules · LA headquarters, Ulaanbaatar
            engineering hub
          </SpecLine>
        }
      >
        <JobBody job={erxesJob} />
      </Plate>

      {/* 03–07 — featured projects, in press order */}
      <For each={featured}>
        {(project) => (
          <Plate
            no={plateNo(project)}
            title={project.name}
            supported={supported}
            registered={isDone(plateNo(project))}
            sound={sound}
            onRegister={() => register(plateNo(project))}
            spec={<ProjectSpec project={project} />}
          >
            <ProjectBody project={project} />
          </Plate>
        )}
      </For>

      {/* 08 — Golomt Bank */}
      <Plate
        no={8}
        title="golomt bank — work"
        supported={supported}
        registered={isDone(8)}
        sound={sound}
        onRegister={() => register(8)}
        spec={
          <SpecLine>
            SocialPay commerce used nationwide · Spring Boot SME services · QR payment
            interoperability
          </SpecLine>
        }
      >
        <JobBody job={golomtJob} />
      </Plate>

      {/* 09 — colophon */}
      <Plate
        no={9}
        title="colophon"
        supported={supported}
        registered={isDone(9)}
        sound={sound}
        onRegister={() => register(9)}
        spec={
          <SpecLine>
            printed in one pass · ink #16130e on paper #f7f3ec · ghost #e86a2a · set in
            JetBrains Mono · nine plates
          </SpecLine>
        }
      >
        <h3 class="font-mono text-2xl font-bold tracking-tight">colophon</h3>
        <p class="mt-3 max-w-xl font-mono text-[13px] leading-relaxed text-[#16130e]/85">
          this press sheet was set in JetBrains Mono and printed live in your browser.
          every section ran as two plates — one true, one ghost — and you pulled them
          into register yourself.
        </p>
        <p class="mt-3 font-mono text-[13px] text-[#16130e]/85">
          reach me:{" "}
          <a
            href={`mailto:${profile.email}`}
            class="underline decoration-[#e86a2a] decoration-2 underline-offset-4"
          >
            {profile.email}
          </a>
        </p>
        <ul class="mt-3 flex gap-5 font-mono text-xs">
          <For each={socials}>
            {(social) => (
              <li>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  class="underline decoration-[#e86a2a] decoration-2 underline-offset-4"
                >
                  {social.name} ↗
                </a>
              </li>
            )}
          </For>
        </ul>
      </Plate>

      {/* press-sheet progress strip */}
      <footer class="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#16130e] bg-[#f7f3ec]/95 px-4 py-2.5 backdrop-blur-sm">
        <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 font-mono text-[10px] tracking-[0.2em] uppercase">
          <span class="shrink-0">
            press sheet — {pad2(count())}/09
            <Show when={count() === TOTAL}>
              <span class="text-[#e86a2a]"> complete</span>
            </Show>
          </span>
          <div class="flex items-center gap-1.5">
            <For each={Array.from({ length: TOTAL }, (_, i) => i + 1)}>
              {(no) => (
                <span
                  class="grid h-5 w-5 place-items-center border text-[8px]"
                  classList={{
                    "border-[#e86a2a] bg-[#e86a2a] text-[#f7f3ec]": isDone(no),
                    "border-[#16130e]/30 text-[#16130e]/50": !isDone(no),
                  }}
                >
                  {pad2(no)}
                </span>
              )}
            </For>
          </div>
          <Show when={count() === TOTAL}>
            <button
              type="button"
              class="shrink-0 text-[#e86a2a] underline underline-offset-4"
              onClick={() => setFlipped(true)}
            >
              flip the sheet →
            </button>
          </Show>
        </div>
      </footer>

      {/* the reverse: a clean one-page CV */}
      <Show when={flipped()}>
        <CvReverse animated={supported} onClose={() => setFlipped(false)} />
      </Show>
    </main>
  )
}
