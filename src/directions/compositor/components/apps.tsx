// Window contents for the core desktop apps: about, now playing, projects,
// the two experience workspaces, and the callrelay control panel.

import { For, createSignal, onCleanup, onMount } from "solid-js"
import { profile } from "../../../data/profile"
import { socials } from "../../../data/socials"
import { experience, type Experience } from "../../../data/experience"
import { projects, type Project } from "../../../data/projects"
import { albums, hyperpopArtists } from "../../../data/taste"

export function AboutApp() {
  return (
    <div class="flex flex-col gap-3">
      <div>
        <div class="text-xl font-bold text-neutral-100">{profile.name}</div>
        <div class="text-xs text-rose-accent">{profile.role}</div>
      </div>
      <p class="text-neutral-400">{profile.bio}</p>
      <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <span class="text-neutral-600">where</span>
        <span>{profile.location}</span>
        <span class="text-neutral-600">mail</span>
        <a class="text-rose-accent hover:underline" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
        <span class="text-neutral-600">cv</span>
        <a class="text-rose-accent hover:underline" href={profile.cvUrl}>
          {profile.cvUrl}
        </a>
      </div>
      <div class="flex gap-2 border-t border-neutral-800 pt-3">
        <For each={socials}>
          {(s) => (
            <a
              href={s.url}
              target={s.url.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              class="rounded-md border border-neutral-800 px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:border-rose-accent hover:text-rose-accent"
            >
              {s.name}
            </a>
          )}
        </For>
      </div>
      <p class="text-[10px] text-neutral-600">
        this desktop is the callrelay thesis: overlays above fullscreen wayland apps,
        restated as a portfolio. drag the titlebars. switch workspaces below.
      </p>
    </div>
  )
}

export function NowPlayingApp() {
  const frailty = albums.find((a) => a.artist === "Jane Remover") ?? albums[6]
  const [pct, setPct] = createSignal(12)
  let timer = 0
  onMount(() => {
    timer = window.setInterval(() => setPct((p) => (p + 0.4) % 100), 1000)
  })
  onCleanup(() => window.clearInterval(timer))

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div
          class="h-14 w-14 shrink-0 rounded-lg border border-white/10"
          style={{
            background: `linear-gradient(135deg, ${frailty.palette[0]}, ${frailty.palette[1]})`,
          }}
        />
        <div class="min-w-0">
          <div class="truncate text-sm font-bold text-neutral-100">{frailty.title}</div>
          <div class="truncate text-xs text-neutral-400">{frailty.artist}</div>
          <div class="mt-1 text-[10px] tracking-widest text-neutral-600 uppercase">
            now playing · cmus
          </div>
        </div>
      </div>
      <div class="h-1 overflow-hidden rounded-full bg-neutral-800">
        <div
          class="h-full rounded-full bg-rose-accent transition-[width] duration-1000"
          style={{ width: `${pct()}%` }}
        />
      </div>
      <div class="border-t border-neutral-800 pt-2">
        <div class="mb-1.5 text-[10px] tracking-widest text-neutral-600 uppercase">
          heavy rotation
        </div>
        <div class="flex flex-wrap gap-1">
          <For each={hyperpopArtists}>
            {(a) => (
              <span class="rounded border border-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                {a}
              </span>
            )}
          </For>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-1.5">
        <For each={albums.slice(0, 10)}>
          {(a) => (
            <div
              title={`${a.title} — ${a.artist}`}
              class="aspect-square rounded border border-white/5"
              style={{
                background: `linear-gradient(135deg, ${a.palette[0]}, ${a.palette[1]})`,
              }}
            />
          )}
        </For>
      </div>
    </div>
  )
}

export function ProjectsApp(props: { onLaunch: (slug: string) => void }) {
  const featured = projects.filter((p) => p.featured)
  const rest = projects.filter((p) => !p.featured)
  const row = (p: Project, launchable: boolean) => (
    <div class="flex items-center gap-3 rounded-lg border border-neutral-800/80 bg-white/[0.02] px-3 py-2">
      <div class="min-w-0 flex-1">
        <div class="text-xs font-bold text-neutral-200">{p.name}</div>
        <div class="truncate text-[11px] text-neutral-500">{p.pitch}</div>
      </div>
      {launchable ? (
        <button
          type="button"
          class="shrink-0 rounded-md border border-rose-accent/50 bg-rose-accent/10 px-2 py-1 text-[10px] font-bold text-rose-accent transition-colors hover:bg-rose-accent/25"
          onClick={() => props.onLaunch(p.slug)}
        >
          open
        </button>
      ) : (
        <a
          class="shrink-0 rounded-md border border-neutral-800 px-2 py-1 text-[10px] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-300"
          href={p.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          src
        </a>
      )}
    </div>
  )
  return (
    <div class="flex flex-col gap-2">
      <div class="text-[10px] tracking-widest text-neutral-600 uppercase">
        installed applications
      </div>
      <For each={featured}>{(p) => row(p, true)}</For>
      <div class="mt-1 text-[10px] tracking-widest text-neutral-600 uppercase">
        also on the disk
      </div>
      <For each={rest}>{(p) => row(p, false)}</For>
    </div>
  )
}

export function ExperienceApp(props: { job: Experience; note?: string }) {
  return (
    <div class="flex flex-col gap-3">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-neutral-100">{props.job.company}</span>
          {props.job.current && (
            <span class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
              current
            </span>
          )}
        </div>
        <div class="text-xs text-rose-accent">{props.job.role}</div>
        <div class="text-[11px] text-neutral-500">{props.job.period}</div>
      </div>
      <p class="text-xs text-neutral-400">{props.job.context}</p>
      <ul class="flex list-none flex-col gap-1.5">
        <For each={props.job.highlights}>
          {(h) => (
            <li class="flex gap-2 text-xs text-neutral-300">
              <span class="text-rose-accent">▸</span>
              <span>{h}</span>
            </li>
          )}
        </For>
      </ul>
      {props.note && (
        <div class="rounded-md border border-neutral-800 bg-white/[0.02] px-2 py-1.5 text-[10px] text-neutral-500">
          {props.note}
        </div>
      )}
    </div>
  )
}

export const erxesJob = experience[0]
export const golomtJob = experience[1]

export function CallrelayApp(props: { onSimulate: () => void }) {
  return (
    <div class="flex flex-col gap-3">
      <div class="text-[10px] tracking-widest text-neutral-600 uppercase">
        call path
      </div>
      <pre class="overflow-x-auto rounded-lg border border-neutral-800 bg-black/40 p-3 text-[10px] leading-relaxed text-neutral-400">
{`┌────────────────────┐
│ android            │  CallScreeningService
│  call detected     │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ cloudflare workers │  Hono + Durable Objects
│  strongly consistent│  persistent delivery
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ qml overlay        │  wayland layer shell
│  ABOVE fullscreen  │  ringtone enabled
└────────────────────┘`}
      </pre>
      <p class="text-xs text-neutral-400">
        Yes, it rings over your game. That is the point. This whole portfolio is the
        overlay, painted above the desktop.
      </p>
      <button
        type="button"
        class="rounded-lg border border-rose-accent/50 bg-rose-accent/10 py-2 text-xs font-bold text-rose-accent transition-colors hover:bg-rose-accent/25"
        onClick={props.onSimulate}
      >
        simulate incoming call
      </button>
    </div>
  )
}
