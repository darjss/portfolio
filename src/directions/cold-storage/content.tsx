import { For } from "solid-js"
import { experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { projects } from "../../data/projects"
import { socials } from "../../data/socials"

interface Specimen {
  name: string
  kind: "POSITION" | "PROJECT"
  dates: string
  sentence: string
  stack: string[]
  dense: string[]
  number: { value: string; label: string }
  url?: string
}

const ERXES_STACK = [
  "TypeScript",
  "pnpm / Nx monorepo",
  "React 18",
  "Apollo GraphQL federation",
  "MongoDB",
  "Redis / BullMQ",
  "Elasticsearch",
]

const GOLOMT_STACK = [
  "Spring Boot",
  "SME banking services",
  "SocialPay commerce",
  "QR payment interoperability",
]

// Chronological, newest first: the current position opens the ledger,
// the thesis project closes it at the bottom.
const specimens: Specimen[] = [
  {
    name: experience[0].company,
    kind: "POSITION",
    dates: experience[0].period,
    sentence:
      "Software developer on the open-source, AI-native experience OS.",
    stack: ERXES_STACK,
    dense: [experience[0].context, ...experience[0].highlights],
    number: { value: "25,000+", label: "ORGS ON PLATFORM" },
  },
  {
    name: experience[1].company,
    kind: "POSITION",
    dates: experience[1].period,
    sentence: `${experience[1].role} at one of Mongolia's largest banks.`,
    stack: GOLOMT_STACK,
    dense: [experience[1].context, ...experience[1].highlights],
    number: { value: "14", label: "MONTHS" },
  },
  ...[...projects]
    .sort((a, b) =>
      a.slug === "sisi-agent" ? 1 : b.slug === "sisi-agent" ? -1 : 0,
    )
    .map((project): Specimen => {
      return {
        name: project.name,
        kind: "PROJECT",
        dates: project.slug === "sisi-agent" ? "THESIS" : "SOFTWARE",
        sentence: project.pitch,
        stack: project.stack,
        dense: [project.description, `stack: ${project.stack.join(" · ")}`],
        number: { value: String(project.stack.length), label: "DEPENDENCIES" },
        url: project.sourceUrl,
      }
    }),
]

function pad(index: number) {
  return String(index + 1).padStart(2, "0")
}

function Rule() {
  return <div aria-hidden="true" class="cs-rule" />
}

function SpecimenDrawer(props: { specimen: Specimen; index: number }) {
  return (
    <section class="cs-drawer" aria-label={props.specimen.name}>
      <Rule />
      <p class="cs-dense cs-faint mt-3">SPECIMEN {pad(props.index)} / 09</p>
      <h2 class="cs-name mt-1">{props.specimen.name}</h2>
      <p class="cs-body cs-faint mt-0.5 tracking-[0.22em]">
        {props.specimen.kind} · {props.specimen.dates}
      </p>
      <p class="cs-body mx-auto mt-2 max-w-[46ch] leading-relaxed">
        {props.specimen.sentence}
      </p>

      {/* stack as a hairline table — dense, loupe territory */}
      <div class="cs-table mx-auto mt-3 grid max-w-[300px] grid-cols-2">
        <For each={props.specimen.stack}>
          {(item) => <span class="cs-dense cs-cell">{item}</span>}
        </For>
      </div>

      <p class="mt-3">
        <span class="cs-number">{props.specimen.number.value}</span>
        <span class="cs-dense cs-faint ml-2">{props.specimen.number.label}</span>
      </p>

      <div class="cs-dense cs-faint mx-auto mt-2 max-w-[52ch] space-y-1 leading-relaxed">
        <For each={props.specimen.dense}>{(line) => <p>{line}</p>}</For>
      </div>

      {props.specimen.url ? (
        <a
          class="cs-body mt-2 inline-block underline decoration-dotted underline-offset-2"
          href={props.specimen.url}
          target="_blank"
          rel="noreferrer"
        >
          source ↗
        </a>
      ) : null}
      <div class="mt-3" />
      <Rule />
    </section>
  )
}

export default function LedgerContent(props: { plain: boolean }) {
  return (
    <div class="cs-ledger font-mono" classList={{ "cs-plain": props.plain }}>
      {/* ——— index: the wipe target, nine rows of micro-type ——— */}
      <header class="pt-10 pb-2 text-center">
        <p class="cs-dense cs-faint tracking-[0.4em]">COLD STORAGE</p>
        <h1 class="cs-body mt-2 tracking-[0.14em]">
          ARCHIVE LEDGER — {profile.fullName.toUpperCase()}
        </h1>
        <p class="cs-dense cs-faint mt-1 tracking-[0.18em]">
          @{profile.name} · {profile.role.toUpperCase()} ·{" "}
          {profile.location.toUpperCase()}
        </p>
        <p class="cs-dense cs-faint mt-1">
          the cursor is warm — wipe to read · 09 SPECIMENS
        </p>
        <div class="mx-auto mt-4 max-w-[300px]">
          <Rule />
        </div>
        <nav aria-label="ledger index" class="mx-auto mt-3 max-w-[320px]">
          <For each={specimens}>
            {(specimen, index) => (
              <p class="cs-body cs-index-row">
                <span class="cs-faint">{pad(index())}</span>
                {" — "}
                {specimen.name.toUpperCase()}
                {" — "}
                <span class="cs-faint">{specimen.kind}</span>
              </p>
            )}
          </For>
        </nav>
        <div class="mx-auto mt-3 max-w-[300px]">
          <Rule />
        </div>
      </header>

      {/* ——— the nine frosted drawers ——— */}
      <div class="mx-auto max-w-[380px] px-4 text-center">
        <For each={specimens}>
          {(specimen, index) => (
            <SpecimenDrawer specimen={specimen} index={index()} />
          )}
        </For>
      </div>

      {/* ——— colophon ——— */}
      <footer class="pt-6 pb-16 text-center">
        <p class="cs-dense cs-faint tracking-[0.3em]">
          END OF LEDGER — 09 SPECIMENS
        </p>
        <p class="cs-body mt-3">
          <For each={socials}>
            {(social, index) => (
              <>
                {index() > 0 ? <span class="cs-faint"> · </span> : null}
                <a
                  class="underline decoration-dotted underline-offset-2"
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.name}
                </a>
              </>
            )}
          </For>
          <span class="cs-faint"> · </span>
          <a
            class="underline decoration-dotted underline-offset-2"
            href={profile.cvUrl}
          >
            cv
          </a>
        </p>
        <p class="cs-dense cs-faint mt-2">
          kept in frost in the coldest capital on earth
        </p>
      </footer>
    </div>
  )
}
