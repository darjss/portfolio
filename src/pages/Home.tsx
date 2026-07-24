import { A } from "@solidjs/router"
import { For } from "solid-js"
import { directions } from "../data/directions"
import { profile } from "../data/profile"

export default function Home() {
  return (
    <main class="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-10 p-8 font-mono">
      <header>
        <h1 class="text-3xl font-bold text-white">{profile.name}</h1>
        <p class="mt-2 text-neutral-400">{profile.tagline}</p>
      </header>
      <section class="flex flex-col gap-4">
        <p class="text-sm tracking-widest text-neutral-500 uppercase">pick a direction</p>
        <For each={directions}>
          {(d, i) => (
            <A
              href={`/${d.slug}`}
              class="group rounded-lg border border-neutral-800 p-5 transition-colors hover:border-rose-accent"
            >
              <div class="flex items-baseline gap-3">
                <span class="text-neutral-600">0{i() + 1}</span>
                <h2 class="text-lg font-bold text-white group-hover:text-rose-accent">{d.name}</h2>
              </div>
              <p class="mt-2 text-sm text-neutral-400">{d.concept}</p>
            </A>
          )}
        </For>
      </section>
    </main>
  )
}
