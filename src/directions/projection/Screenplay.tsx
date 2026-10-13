import { For, Show } from "solid-js"
import { education, experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { projects } from "../../data/projects"
import { socials } from "../../data/socials"
import { films } from "../../data/taste"

export default function Screenplay() {
  const ordered = [...experience].reverse()
  return (
    <main class="pj-script">
      <article>
        <header class="title-page">
          <h1>{profile.name}</h1>
          <p>written by</p>
          <p>{profile.fullName}</p>
          <p style={{ "margin-top": "2em" }}>
            {profile.role} · {profile.headline}
          </p>
          <div class="contact">
            <p style={{ margin: 0 }}>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </p>
            <p style={{ margin: 0 }}>{profile.location}</p>
            <p style={{ margin: 0 }}>
              <a href={profile.cvUrl}>cv, english</a> · <a href={profile.cvMnUrl}>cv, mongolian</a>
            </p>
          </div>
        </header>

        <p class="transition" style={{ "text-align": "left" }}>
          fade in:
        </p>
        <p class="slug">ext. {profile.location}, present day</p>
        <p class="action">{profile.tagline}.</p>
        <p class="character">{profile.name}</p>
        <p class="dialogue">{profile.summary}</p>
        <p class="character">{profile.name} (cont'd)</p>
        <p class="paren">(beat)</p>
        <p class="dialogue">{profile.availability}.</p>

        <For each={ordered}>
          {(job) => (
            <section>
              <p class="transition">cut to:</p>
              <p class="slug">
                int. {job.company}, {job.role} · {job.period}
              </p>
              <p class="action">{job.context}</p>
              <For each={job.highlights}>{(h) => <p class="action">{h}</p>}</For>
            </section>
          )}
        </For>

        <p class="transition">cut to:</p>
        <p class="slug">montage, the projects</p>
        <For each={projects}>
          {(p) => (
            <section>
              <p class="action" style={{ "margin-bottom": "0.2em" }}>
                <strong>{p.featured ? p.name.toUpperCase() : p.name}.</strong> {p.pitch}
              </p>
              <p class="action" style={{ margin: "0 0 0.4em 4ch" }}>
                {p.description}
              </p>
              <p class="action" style={{ margin: "0 0 1.4em 4ch" }}>
                {p.stack.join(", ")}. <a href={p.sourceUrl}>source</a>
                <Show when={p.websiteUrl}>
                  {(url) => (
                    <>
                      {" · "}
                      <a href={url()}>{new URL(url()).hostname}</a>
                    </>
                  )}
                </Show>
              </p>
            </section>
          )}
        </For>

        <p class="transition">fade out.</p>
        <p class="center" style={{ "font-weight": 700, "text-decoration": "underline", margin: "3em 0 2em" }}>
          END CREDITS
        </p>
        <For each={profile.skills}>
          {(group) => (
            <p class="center" style={{ margin: "0 0 1em" }}>
              <em>{group.label}</em>
              <br />
              {group.items.join(", ")}
            </p>
          )}
        </For>
        <For each={education}>
          {(e) => (
            <p class="center" style={{ margin: "0 0 1em" }}>
              <em>{e.school}</em>
              <br />
              {e.program}, {e.period}
            </p>
          )}
        </For>
        <p class="center" style={{ margin: "2em 0 1em" }}>
          <em>favourite films</em>
          <br />
          <For each={films.favourites}>
            {(f) => (
              <>
                {f}
                <br />
              </>
            )}
          </For>
          <a href={films.letterboxd}>{films.total} films logged on letterboxd</a>
        </p>
        <p class="center" style={{ margin: "2em 0" }}>
          <For each={socials}>
            {(s, i) => (
              <>
                {i() > 0 ? " · " : ""}
                <a href={s.url}>{s.name}</a>
              </>
            )}
          </For>
        </p>
        <p class="center" style={{ "margin-top": "3em" }}>
          THE END
        </p>
      </article>
    </main>
  )
}
