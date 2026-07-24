import { For, Show } from "solid-js"
import { education, experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { projects } from "../../data/projects"
import { socials } from "../../data/socials"

export default function SideB(props: {
  fallback?: boolean
  onFlipBack?: () => void
}) {
  return (
    <div class="min-h-full bg-[#f5f1e8] font-serif text-[#16130f] select-text">
      <div class="mx-auto max-w-3xl px-8 py-14">
        <Show when={props.fallback}>
          <p class="mb-8 border border-[#16130f] px-4 py-2 text-xs italic">
            Note: SIDE A of this page is an experimental ascii canvas that your
            browser does not support (or you asked for reduced motion). You
            receive the conservative site instead — the conservative site IS
            the fallback. That is the punchline.
          </p>
        </Show>

        <header class="border-b-2 border-[#16130f] pb-6">
          <h1 class="text-4xl font-bold tracking-tight">
            {profile.fullName}
          </h1>
          <p class="mt-1 text-lg italic">
            {profile.role} — {profile.location}
          </p>
          <p class="mt-3 text-sm">
            <For each={socials}>
              {(s, i) => (
                <>
                  {i() > 0 && " · "}
                  <a class="underline" href={s.url}>
                    {s.url.replace("mailto:", "").replace("https://", "")}
                  </a>
                </>
              )}
            </For>
            {" · "}
            <a class="underline" href={profile.site}>
              darjs.dev
            </a>
          </p>
        </header>

        <section class="mt-8">
          <h2 class="text-sm font-bold tracking-[0.25em]">EXPERIENCE</h2>
          <For each={experience}>
            {(job) => (
              <div class="mt-4">
                <div class="flex items-baseline justify-between">
                  <h3 class="text-base font-bold">
                    {job.role}, {job.company}
                  </h3>
                  <span class="text-sm italic">{job.period}</span>
                </div>
                <p class="mt-1 text-sm leading-relaxed">{job.context}</p>
                <ul class="mt-1 list-disc pl-5 text-sm leading-relaxed">
                  <For each={job.highlights}>{(h) => <li>{h}</li>}</For>
                </ul>
              </div>
            )}
          </For>
        </section>

        <section class="mt-8">
          <h2 class="text-sm font-bold tracking-[0.25em]">
            SELECTED PROJECTS
          </h2>
          <For each={projects}>
            {(p) => (
              <div class="mt-4">
                <div class="flex items-baseline justify-between">
                  <h3 class="text-base font-bold">
                    <a class="underline" href={p.sourceUrl}>
                      {p.name}
                    </a>
                  </h3>
                  <Show when={p.featured}>
                    <span class="text-xs italic">featured</span>
                  </Show>
                </div>
                <p class="mt-1 text-sm leading-relaxed">{p.description}</p>
                <p class="mt-1 text-xs italic text-[#4a4237]">
                  {p.stack.join(", ")}
                </p>
              </div>
            )}
          </For>
        </section>

        <section class="mt-8">
          <h2 class="text-sm font-bold tracking-[0.25em]">EDUCATION</h2>
          <For each={education}>
            {(e) => (
              <div class="mt-3 flex items-baseline justify-between text-sm">
                <span>
                  <strong>{e.school}</strong> — {e.program}
                </span>
                <span class="italic">{e.period}</span>
              </div>
            )}
          </For>
        </section>

        <footer class="mt-12 border-t border-[#16130f] pt-4 text-xs italic">
          <p>
            References and a printable copy are available at{" "}
            <a class="underline" href={profile.cvUrl}>
              CV.pdf
            </a>
            .
          </p>
          <Show when={props.onFlipBack}>
            <button
              type="button"
              class="mt-4 border border-[#16130f] px-4 py-1 font-serif not-italic hover:bg-[#16130f] hover:text-[#f5f1e8]"
              onClick={() => props.onFlipBack?.()}
            >
              ↺ RUN IT BACK (SIDE A)
            </button>
          </Show>
        </footer>
      </div>
    </div>
  )
}
