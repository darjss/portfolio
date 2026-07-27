import { For, onCleanup, onMount } from "solid-js"
import { profile } from "../../data/profile"
import { education, experience } from "../../data/experience"
import { projects } from "../../data/projects"
import { socials } from "../../data/socials"

// The reverse of the press sheet: the clean, conservative one-page CV that
// the whole mis-registered performance was hiding. Real data only.
export default function CvReverse(props: { animated: boolean; onClose: () => void }) {
  onMount(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose()
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    })
  })

  const featured = projects.filter((project) => project.featured)

  return (
    <div class="cv-root fixed inset-0 z-[90] overflow-y-auto bg-[#fafaf7] text-[#16130e]">
      <div class="cv-no-print sticky top-0 z-10 flex items-center justify-between border-b border-[#16130e]/15 bg-[#fafaf7]/95 px-5 py-3 font-mono text-[10px] tracking-[0.25em] uppercase backdrop-blur-sm sm:px-8">
        <span class="text-[#16130e]/50">press sheet — reverse</span>
        <div class="flex gap-5">
          <button
            type="button"
            class="underline decoration-[#e86a2a] decoration-2 underline-offset-4"
            onClick={() => window.print()}
          >
            print
          </button>
          <button
            type="button"
            class="underline decoration-[#16130e]/40 underline-offset-4"
            onClick={props.onClose}
          >
            back to the sheet
          </button>
        </div>
      </div>

      <article
        class="mx-auto max-w-2xl px-8 py-12 font-serif"
        classList={{ "cv-flip-in": props.animated }}
      >
        <header class="border-b-2 border-[#16130e] pb-5">
          <h1 class="text-3xl font-bold tracking-tight">{profile.fullName}</h1>
          <p class="mt-1 text-sm text-[#16130e]/70">
            {profile.role} — {profile.location}
          </p>
          <p class="mt-2 font-mono text-xs text-[#16130e]/60">
            {profile.email} · {profile.site.replace("https://", "")} ·{" "}
            {socials.find((s) => s.name === "github")?.url.replace("https://", "")}
          </p>
        </header>

        <section class="mt-7">
          <h2 class="font-mono text-[11px] font-bold tracking-[0.3em] text-[#16130e]/50 uppercase">
            Experience
          </h2>
          <For each={experience}>
            {(job) => (
              <div class="mt-4">
                <div class="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 class="text-base font-bold">
                    {job.role}, {job.company}
                  </h3>
                  <span class="font-mono text-xs text-[#16130e]/60">{job.period}</span>
                </div>
                <p class="mt-1 text-sm leading-relaxed text-[#16130e]/80">{job.context}</p>
                <ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#16130e]/85">
                  <For each={job.highlights}>{(item) => <li>{item}</li>}</For>
                </ul>
              </div>
            )}
          </For>
        </section>

        <section class="mt-7">
          <h2 class="font-mono text-[11px] font-bold tracking-[0.3em] text-[#16130e]/50 uppercase">
            Education
          </h2>
          <For each={education}>
            {(entry) => (
              <div class="mt-3 flex flex-wrap items-baseline justify-between gap-x-4">
                <p class="text-sm">
                  <span class="font-bold">{entry.school}</span> — {entry.program}
                </p>
                <span class="font-mono text-xs text-[#16130e]/60">{entry.period}</span>
              </div>
            )}
          </For>
        </section>

        <section class="mt-7">
          <h2 class="font-mono text-[11px] font-bold tracking-[0.3em] text-[#16130e]/50 uppercase">
            Selected Projects
          </h2>
          <For each={featured}>
            {(project) => (
              <div class="mt-4">
                <h3 class="text-sm font-bold">{project.name}</h3>
                <p class="mt-0.5 text-sm leading-relaxed text-[#16130e]/80">
                  {project.pitch}
                </p>
                <p class="mt-1 font-mono text-[11px] leading-relaxed text-[#16130e]/55">
                  {project.stack.join(" · ")}
                </p>
              </div>
            )}
          </For>
        </section>

        <footer class="mt-9 border-t border-[#16130e]/20 pt-4 font-mono text-[11px] text-[#16130e]/60">
          <For each={socials}>
            {(social, i) => (
              <>
                {i() > 0 && " · "}
                <a
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  class="underline underline-offset-2"
                >
                  {social.name}
                </a>
              </>
            )}
          </For>
          <span class="cv-no-print float-right">
            full pdf:{" "}
            <a href={profile.cvUrl} class="underline underline-offset-2">
              CV.pdf
            </a>
          </span>
        </footer>
      </article>
    </div>
  )
}
