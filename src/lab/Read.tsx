import { A } from "@solidjs/router"
import { For, Show } from "solid-js"
import { education, experience } from "../data/experience"
import { profile } from "../data/profile"
import { projects } from "../data/projects"
import { socials } from "../data/socials"
import "./read.css"

export default function Read() {
  return (
    <main class="read">
      <nav class="read-nav">
        <A href="/">← back to the fun versions</A>
        <span>
          <a href={profile.cvUrl}>cv.pdf</a> · <a href={profile.cvMnUrl}>монгол pdf</a>
        </span>
      </nav>

      <header>
        <h1>{profile.fullName}</h1>
        <p class="read-lede">
          {profile.role} · {profile.headline}
        </p>
        <p class="read-meta">
          {profile.location} · {profile.availability}
        </p>
        <p>{profile.summary}</p>
        <p class="read-links">
          <For each={socials}>{(s) => <a href={s.url}>{s.name === "email" ? profile.email : s.name}</a>}</For>
        </p>
      </header>

      <section>
        <h2>Experience</h2>
        <For each={experience}>
          {(job) => (
            <article>
              <h3>
                {job.company} <span>{job.role}</span>
              </h3>
              <p class="read-meta">
                {job.period} · {job.context}
              </p>
              <ul>
                <For each={job.highlights}>{(h) => <li>{h}</li>}</For>
              </ul>
            </article>
          )}
        </For>
      </section>

      <section>
        <h2>Projects</h2>
        <For each={projects}>
          {(p) => (
            <article>
              <h3>
                {p.name} <span>{p.pitch}</span>
              </h3>
              <p>{p.description}</p>
              <p class="read-meta">
                {p.stack.join(", ")} · <a href={p.sourceUrl}>source</a>
                <Show when={p.websiteUrl}>
                  {(url) => (
                    <>
                      {" · "}
                      <a href={url()}>{url().replace("https://", "")}</a>
                    </>
                  )}
                </Show>
              </p>
            </article>
          )}
        </For>
      </section>

      <section>
        <h2>Education</h2>
        <For each={education}>
          {(e) => (
            <article>
              <h3>
                {e.school} <span>{e.program}</span>
              </h3>
              <p class="read-meta">{e.period}</p>
            </article>
          )}
        </For>
      </section>

      <section>
        <h2>Skills</h2>
        <dl>
          <For each={profile.skills}>
            {(group) => (
              <>
                <dt>{group.label}</dt>
                <dd>{group.items.join(", ")}</dd>
              </>
            )}
          </For>
        </dl>
      </section>
    </main>
  )
}
