import { For } from "solid-js";
import { experience } from "../../data/experience";
import { profile } from "../../data/profile";
import { projects } from "../../data/projects";
import { socials } from "../../data/socials";
import {
  books,
  favoriteDirectors,
  favoriteFilms,
  fiveStarFilms,
} from "../../data/taste";
import { MemoryFragment } from "./MemoryFragment";

function project(slug: string) {
  const found = projects.find((p) => p.slug === slug);
  if (!found) throw new Error(`missing project ${slug}`);
  return found;
}

function SectionTitle(props: { id: string; children: string; note?: string }) {
  return (
    <MemoryFragment id={props.id} base={0.16} ttl={25000} class="mb-8">
      <h2 class="text-xs tracking-[0.3em] text-rose-accent uppercase">
        {props.children}
      </h2>
      {props.note && (
        <p class="mt-1 text-xs text-neutral-600">{props.note}</p>
      )}
    </MemoryFragment>
  );
}

function Hero() {
  return (
    <section class="py-16">
      <MemoryFragment id="hero" base={0} ttl={60000} seed={4}>
        <p class="text-xs text-neutral-600">
          {profile.fullName.toLowerCase()} · {profile.name}
        </p>
        <h1 class="mt-4 text-2xl leading-snug text-neutral-100">
          {profile.tagline}.
        </h1>
        <p class="mt-4 max-w-xl text-neutral-400">{profile.bio}</p>
        <p class="mt-2 text-xs text-neutral-600">
          {profile.role.toLowerCase()} — {profile.location.toLowerCase()}
        </p>
        <p class="mt-8 text-xs text-rose-accent">
          move to remember. stop, and it all turns back to dust.
        </p>
      </MemoryFragment>
    </section>
  );
}

function Films() {
  return (
    <section class="py-16">
      <SectionTitle id="films-head" note="a wall of dust. read the canon by caressing it.">
        the five-star canon
      </SectionTitle>
      <div class="flex flex-wrap gap-x-4 gap-y-2">
        <For each={fiveStarFilms}>
          {(title) => (
            <MemoryFragment
              id={`film-${title}`}
              base={0.06}
              ttl={15000}
              seed={favoriteFilms.includes(title) ? 6 : undefined}
              class="text-xs text-neutral-300"
            >
              {title.toLowerCase()}
            </MemoryFragment>
          )}
        </For>
      </div>
      <MemoryFragment
        id="directors"
        base={0.1}
        ttl={20000}
        class="mt-8 text-xs text-neutral-500"
      >
        dir: {favoriteDirectors.join(" · ").toLowerCase()}
      </MemoryFragment>
    </section>
  );
}

function Receipt() {
  const p = project("vit-store");
  const items: Array<[string, string]> = [
    ["mobile storefront", "shipped"],
    ["admin + inventory", "shipped"],
    ["api gateway", "shipped"],
    ["qpay checkout", "shipped"],
    ["otp login", "shipped"],
    ["messenger ai agent", "shipped"],
    ["vision product id", "shipped"],
  ];
  return (
    <MemoryFragment id="proj-vit-store" base={0.1} ttl={18000}>
      <div class="border border-dashed border-neutral-700 p-5">
        <p class="text-center tracking-[0.2em]">*** vit-store ***</p>
        <p class="mt-1 text-center text-xs text-neutral-500">
          us-imported vitamins · ulaanbaatar
        </p>
        <p class="my-3 text-neutral-700">
          ------------------------------------------
        </p>
        <For each={items}>
          {([label, state]) => (
            <p class="flex justify-between text-xs">
              <span>{label}</span>
              <span>{state}</span>
            </p>
          )}
        </For>
        <p class="my-3 text-neutral-700">
          ------------------------------------------
        </p>
        <p class="flex justify-between text-xs">
          <span>total</span>
          <span class="text-rose-accent">in production</span>
        </p>
        <p class="mt-3 text-xs text-neutral-500">{p.pitch}</p>
        <p class="mt-1 text-xs text-neutral-600">
          {p.stack.slice(0, 7).join(" · ").toLowerCase()}
        </p>
        <p class="mt-3 text-center text-neutral-500">
          | ||| | || ||| |||| | || ||| |
        </p>
        <p class="mt-1 text-center text-xs text-neutral-600">
          the ink fades. the deployment does not.
        </p>
      </div>
    </MemoryFragment>
  );
}

function Plugged() {
  const p = project("plugged");
  return (
    <MemoryFragment id="proj-plugged" base={0.1} ttl={18000}>
      <div class="-rotate-1">
        <p class="text-rose-accent italic">plugged — iems, tuned like a lyric sheet</p>
        <p class="mt-2 text-xs text-neutral-400 italic">{p.pitch}</p>
        <svg
          viewBox="0 0 320 90"
          class="mt-3 w-full max-w-sm"
          aria-label="iem frequency graph"
          role="img"
        >
          <line x1="0" y1="70" x2="320" y2="70" stroke="#262626" />
          <line x1="40" y1="0" x2="40" y2="90" stroke="#1a1a1a" />
          <line x1="160" y1="0" x2="160" y2="90" stroke="#1a1a1a" />
          <line x1="290" y1="0" x2="290" y2="90" stroke="#1a1a1a" />
          <polyline
            points="0,55 30,38 60,30 90,34 120,42 150,52 180,48 210,40 240,30 270,26 300,34 320,44"
            fill="none"
            stroke="#f43f5e"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <text x="30" y="86" fill="#525252" font-size="8">20hz</text>
          <text x="150" y="86" fill="#525252" font-size="8">1k</text>
          <text x="280" y="86" fill="#525252" font-size="8">10k</text>
        </svg>
        <p class="mt-2 text-xs text-neutral-500">
          qpay · sms otp · d1 + vectorize hybrid search —{" "}
          <a class="underline decoration-dotted" href={p.sourceUrl}>source</a>
        </p>
      </div>
    </MemoryFragment>
  );
}

const WAVEFORM = [
  3, 5, 8, 6, 10, 14, 9, 5, 7, 12, 16, 11, 6, 4, 8, 13, 17, 12, 7, 5, 9, 14,
  10, 6, 4, 7, 11, 15, 12, 8, 5, 3, 6, 10, 14, 9, 5, 4, 6, 3,
];

function Callrelay() {
  const p = project("callrelay");
  return (
    <MemoryFragment id="proj-callrelay" base={0.1} ttl={18000}>
      <p class="text-neutral-200">callrelay — a voicemail you can still hear</p>
      <div class="mt-3 flex h-6 items-end gap-[3px]" aria-hidden="true">
        <For each={WAVEFORM}>
          {(h) => (
            <div class="w-[3px] bg-neutral-500" style={{ height: `${h}px` }} />
          )}
        </For>
      </div>
      <div class="mt-3 text-xs text-neutral-400">
        <p>[00:00.0] android rings — callscreeningservice picks up</p>
        <p>[00:00.4] relayed through workers + durable objects</p>
        <p>[00:00.9] qml overlay rings above fullscreen wayland apps</p>
        <p>[00:01.2] ended-call events persist until delivered</p>
      </div>
      <p class="mt-2 text-xs text-neutral-600">
        {p.pitch}{" "}
        <a class="underline decoration-dotted" href={p.sourceUrl}>source</a>
      </p>
    </MemoryFragment>
  );
}

function Herdr() {
  const p = project("herdr-orchestrate");
  return (
    <MemoryFragment id="proj-herdr" base={0.1} ttl={18000}>
      <p class="text-neutral-200">herdr-orchestrate — a branch diagram</p>
      <pre class="mt-3 text-xs leading-5 text-neutral-400">
{`main ──●──●──────────●── run board
        \\── worker/one ── durable run state`}
      </pre>
      <MemoryFragment
        id="proj-herdr-leaves"
        base={0.05}
        ttl={6000}
        class="mt-0"
      >
        <pre class="text-xs leading-5 text-neutral-500">
{`        \\── worker/two ── leaf: model routing
         \\── worker/tri ── leaf: isolated worktrees
          \\── worker/qtr ── leaf: preview-first cleanup`}
        </pre>
        <p class="mt-2 text-xs text-neutral-600">
          leaves dissolve first. the trunk remembers longer.
        </p>
      </MemoryFragment>
      <p class="mt-2 text-xs text-neutral-600">
        {p.pitch}{" "}
        <a class="underline decoration-dotted" href={p.sourceUrl}>source</a>
      </p>
    </MemoryFragment>
  );
}

function Khaan() {
  const p = project("khaan-client");
  const rows: Array<[string, string, string]> = [
    ["step 1/3", "sotp auth — request", "+ ok"],
    ["step 2/3", "sotp auth — verify", "+ ok"],
    ["step 3/3", "device token issued", "+ ok"],
    ["relogin", "remembered device", "+ ok"],
    ["fetch", "transaction history", "+ n rows"],
    ["reconcile", "hook-based async iterator", "+ matched"],
  ];
  return (
    <MemoryFragment id="proj-khaan" base={0.1} ttl={18000}>
      <div class="border border-neutral-800">
        <p class="border-b border-neutral-800 px-4 py-2 text-xs tracking-[0.2em]">
          khan bank — sdk statement (undocumented, now typed)
        </p>
        <For each={rows}>
          {(row) => (
            <p class="grid grid-cols-[7rem_1fr_auto] gap-2 px-4 py-1 text-xs text-neutral-300 select-text">
              <span class="text-neutral-600">{row[0]}</span>
              <span>{row[1]}</span>
              <span class="text-rose-accent">{row[2]}</span>
            </p>
          )}
        </For>
        <p class="border-t border-neutral-800 px-4 py-2 text-xs text-neutral-500">
          {p.pitch}{" "}
          <a class="underline decoration-dotted" href={p.sourceUrl}>source</a>
        </p>
      </div>
    </MemoryFragment>
  );
}

function Projects() {
  return (
    <section class="py-16">
      <SectionTitle id="projects-head" note="touch one and it comes back, for a while.">
        projects, decaying
      </SectionTitle>
      <div class="flex flex-col gap-12">
        <Receipt />
        <Plugged />
        <Callrelay />
        <Herdr />
        <Khaan />
        <MemoryFragment
          id="proj-minor"
          base={0.08}
          ttl={15000}
          class="text-xs text-neutral-500"
        >
          <p>
            also in the attic:{" "}
            <a class="underline decoration-dotted" href={project("sisi-agent").sourceUrl}>
              sisi-agent
            </a>{" "}
            — {project("sisi-agent").pitch.toLowerCase()}
          </p>
          <p class="mt-1">
            <a class="underline decoration-dotted" href={project("html-thing").sourceUrl}>
              html-thing
            </a>{" "}
            — {project("html-thing").pitch.toLowerCase()}
          </p>
        </MemoryFragment>
      </div>
    </section>
  );
}

function Experience() {
  const erxes = experience[0];
  const golomt = experience[1];
  return (
    <section class="py-16">
      <SectionTitle id="experience-head" note="long-term memory. it decays ten times slower.">
        experience
      </SectionTitle>
      <div class="flex flex-col gap-12">
        <MemoryFragment id="exp-erxes" base={0.3} ttl={200000} seed={3}>
          <p class="text-neutral-100">
            {erxes.company} — {erxes.role.toLowerCase()}
          </p>
          <p class="text-xs text-rose-accent">{erxes.period}</p>
          <p class="mt-2 text-xs text-neutral-400">{erxes.context}</p>
          <ul class="mt-2 list-inside list-disc text-xs text-neutral-500">
            <For each={erxes.highlights}>{(h) => <li>{h}</li>}</For>
          </ul>
        </MemoryFragment>
        <MemoryFragment id="exp-golomt" base={0.5} ttl={200000} seed={4}>
          <p class="text-neutral-100">
            {golomt.company} — {golomt.role.toLowerCase()}
          </p>
          <p class="text-xs text-rose-accent">{golomt.period}</p>
          <p class="mt-2 text-xs text-neutral-400">{golomt.context}</p>
          <ul class="mt-2 list-inside list-disc text-xs text-neutral-500">
            <For each={golomt.highlights}>{(h) => <li>{h}</li>}</For>
          </ul>
          <p class="mt-2 text-xs text-neutral-600">
            partially fossilized. some memories never fully leave.
          </p>
        </MemoryFragment>
      </div>
    </section>
  );
}

function Marginalia(props: { index: number }) {
  const book = books[props.index];
  return (
    <MemoryFragment
      id={`margin-book-${props.index}`}
      base={0.08}
      ttl={15000}
      class="py-6 text-center text-xs text-neutral-600 italic"
    >
      margin: “{book.title.toLowerCase()}” — {book.author.toLowerCase()} ·{" "}
      {book.status}
    </MemoryFragment>
  );
}

function Footer() {
  return (
    <footer class="py-16">
      <MemoryFragment id="footer" base={0.12} ttl={30000} class="text-xs">
        <p class="text-neutral-500">
          walk away and this page forgets. come back and touch it awake.
        </p>
        <p class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-neutral-400">
          <For each={socials}>
            {(s) => (
              <a class="underline decoration-dotted" href={s.url}>
                {s.name}
              </a>
            )}
          </For>
          <a class="underline decoration-dotted" href={profile.cvUrl}>cv</a>
        </p>
        <p class="mt-4 text-neutral-600">
          © {new Date().getFullYear()} {profile.name} · built to be forgotten
        </p>
      </MemoryFragment>
    </footer>
  );
}

export function SiteContent() {
  return (
    <div class="mx-auto w-full max-w-3xl px-6 font-mono text-sm leading-relaxed text-neutral-300">
      <Hero />
      <Films />
      <Marginalia index={0} />
      <Projects />
      <Marginalia index={1} />
      <Experience />
      <Marginalia index={2} />
      <Footer />
    </div>
  );
}
