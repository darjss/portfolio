// Module registry for the patchbay panel. Every module maps to a real project
// or job from src/data; accents are the per-module wire colors.

import { experience } from "../../data/experience"
import { projects } from "../../data/projects"

export type ModuleId =
  | "erxes"
  | "golomt"
  | "vit-store"
  | "plugged"
  | "callrelay"
  | "herdr-orchestrate"
  | "khaan-client"
  | "sisi-agent"
  | "html-thing"
  | "site"

export interface ModuleDef {
  id: ModuleId
  label: string
  tag: string
  accent: string
  /** CSS grid placement on the panel. */
  col: string
  row: string
  master?: boolean
  /** Hairline spec strip: stack, dates, one number. */
  spec: { stack: string; dates: string; number: string }
  blurb: string
  sourceUrl: string
}

const project = (slug: string) => {
  const p = projects.find((p) => p.slug === slug)
  if (!p) throw new Error(`missing project ${slug}`)
  return p
}

const stackLine = (slug: string, keep: number) =>
  project(slug)
    .stack.slice(0, keep)
    .join(" · ")

export const MODULES: ModuleDef[] = [
  {
    id: "erxes",
    label: "DAY SHIFT — erxes",
    tag: "work · current",
    accent: "#6a8aff",
    col: "1 / 4",
    row: "1",
    master: true,
    spec: {
      stack: "TypeScript · React 18 · Apollo federation · MongoDB · BullMQ",
      dates: experience[0].period,
      number: "25,000+ organizations run it",
    },
    blurb: experience[0].context,
    sourceUrl: "https://erxes.io",
  },
  {
    id: "golomt",
    label: "PREV — Golomt",
    tag: "work · legacy",
    accent: "#c8a86a",
    col: "4 / 7",
    row: "1",
    master: true,
    spec: {
      stack: "Spring Boot · SocialPay · QR interop",
      dates: experience[1].period,
      number: "payments used nationwide",
    },
    blurb: experience[1].context,
    sourceUrl: "https://golomtbank.com",
  },
  {
    id: "vit-store",
    label: "vit-store",
    tag: "commerce platform",
    accent: "#4ade80",
    col: "1 / 3",
    row: "2",
    spec: {
      stack: stackLine("vit-store", 5),
      dates: "2025",
      number: "3 surfaces — storefront · admin · agent",
    },
    blurb: project("vit-store").pitch,
    sourceUrl: project("vit-store").sourceUrl,
  },
  {
    id: "plugged",
    label: "plugged",
    tag: "iem storefront",
    accent: "#38bdf8",
    col: "3 / 5",
    row: "2",
    spec: {
      stack: stackLine("plugged", 5),
      dates: "2025",
      number: "2 search modes — semantic + keyword",
    },
    blurb: project("plugged").pitch,
    sourceUrl: project("plugged").sourceUrl,
  },
  {
    id: "callrelay",
    label: "callrelay",
    tag: "calls over the edge",
    accent: "#f472b6",
    col: "5 / 7",
    row: "2",
    spec: {
      stack: stackLine("callrelay", 4),
      dates: "2025",
      number: "3 parts — android · edge · overlay",
    },
    blurb: project("callrelay").pitch,
    sourceUrl: project("callrelay").sourceUrl,
  },
  {
    id: "herdr-orchestrate",
    label: "herdr",
    tag: "agent orchestration",
    accent: "#c084fc",
    col: "1 / 3",
    row: "3",
    spec: {
      stack: stackLine("herdr-orchestrate", 4),
      dates: "2025",
      number: "1 isolated worktree per run",
    },
    blurb: project("herdr-orchestrate").pitch,
    sourceUrl: project("herdr-orchestrate").sourceUrl,
  },
  {
    id: "khaan-client",
    label: "khaan",
    tag: "banking sdk",
    accent: "#facc15",
    col: "3 / 5",
    row: "3",
    spec: {
      stack: stackLine("khaan-client", 4),
      dates: "2025",
      number: "3-step SOTP auth, typed end to end",
    },
    blurb: project("khaan-client").pitch,
    sourceUrl: project("khaan-client").sourceUrl,
  },
  {
    id: "sisi-agent",
    label: "sisi",
    tag: "university mcp",
    accent: "#34d399",
    col: "5 / 7",
    row: "3",
    spec: {
      stack: stackLine("sisi-agent", 4),
      dates: "2024 — 2025",
      number: "5 parts — mcp · extension · ai · web · thesis",
    },
    blurb: project("sisi-agent").pitch,
    sourceUrl: project("sisi-agent").sourceUrl,
  },
  {
    id: "html-thing",
    label: "html-thing",
    tag: "one file → url",
    accent: "#fb923c",
    col: "2 / 6",
    row: "4",
    spec: {
      stack: stackLine("html-thing", 4),
      dates: "2024",
      number: "0 runtime dependencies",
    },
    blurb: project("html-thing").pitch,
    sourceUrl: project("html-thing").sourceUrl,
  },
]

export const moduleById = (id: ModuleId) => {
  const m = MODULES.find((m) => m.id === id)
  if (!m) throw new Error(`missing module ${id}`)
  return m
}

export const SITE_ACCENT = "#9ab8c8"

export function accentOf(id: ModuleId) {
  return id === "site" ? SITE_ACCENT : moduleById(id).accent
}

// Real data flows between the modules, keyed by the sorted id pair. Shown in
// the readout when a cable docks.
// Keys are the sorted id pair joined with "|".
const FLOWS: Record<string, string> = {
  "khaan-client|vit-store": "khaan-client reconciles the transfers QPay initiates at vit-store checkout",
  "khaan-client|plugged": "same QPay rails — Khan Bank transfers settle both storefronts",
  "herdr-orchestrate|vit-store": "herdr ran the agent sessions that maintain the vit-store monorepo",
  "herdr-orchestrate|plugged": "herdr runs the agents that keep the plugged catalog honest",
  "herdr-orchestrate|khaan-client": "agent runs reconcile and test the SDK in isolated worktrees",
  "callrelay|herdr-orchestrate": "callrelay rings above the fullscreen apps herdr spawns",
  "callrelay|vit-store": "an ended-call event persists at the edge until the overlay acks it — same Durable Object pattern as vit-store carts",
  "erxes|herdr-orchestrate": "day shift: the 100+ module monorepo these agent runs rehearse on",
  "erxes|vit-store": "the Messenger shopping agent is the experience-OS playbook, self-hosted",
  "erxes|golomt": "prev shift feeds the day shift — banking-grade payment discipline into commerce modules",
  "golomt|khaan-client": "SocialPay QR interop at Golomt is why an undocumented bank flow was worth typing",
  "golomt|plugged": "QR payment interoperability, now at storefront scale",
  "html-thing|plugged": "html-thing ships one-file product demos to a public URL",
  "html-thing|vit-store": "landing mocks for vit-store go up as a single file on R2",
  "erxes|sisi-agent": "university portal data, agent-native — the same bet erxes makes at platform scale",
  "plugged|vit-store": "plugged is the second shop on the same checkout architecture",
  "herdr-orchestrate|sisi-agent": "agent orchestration patterns prototyped on university MCP tools",
  "callrelay|khaan-client": "both exist because a phone event and a bank event deserve the same typed edge relay",
  "html-thing|sisi-agent": "the experimental web UI ships as one file",
  "callrelay|erxes": "omnichannel support, but the channel is your own phone line",
  "herdr-orchestrate|html-thing": "run-board previews, published as a single html file",
  "html-thing|khaan-client": "reconciliation reports export as one portable page",
  "callrelay|plugged": "order-status calls could ring straight above the admin dashboard",
  "callrelay|sisi-agent": "MCP tools + a call overlay: the assistant that interrupts politely",
  "golomt|sisi-agent": "thesis tooling paid for by a banking salary",
  "golomt|vit-store": "nationwide payment features first, a full commerce platform after",
  "erxes|khaan-client": "finance modules at work, bank internals at home",
  "erxes|plugged": "D1 + Vectorize search patterns cross-pollinate both codebases",
  "callrelay|html-thing": "overlay prototypes get shared as a single blob of html",
}

export function flowText(a: ModuleId, b: ModuleId) {
  if (a === "site" || b === "site") {
    const other = a === "site" ? b : a
    if (other === "herdr-orchestrate")
      return "herdr → this site: orchestrated the agents that helped build it"
    if (other === "html-thing")
      return "html-thing → this site: one html file in, darjs.dev out"
    return `${moduleById(other).label} → this site — lives on darjs.dev`
  }
  const key = [a, b].sort().join("|")
  const known = FLOWS[key]
  if (known) return known
  return `${moduleById(a).label} ⇄ ${moduleById(b).label} — no direct integration; both patched into darjs.dev`
}
