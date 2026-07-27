// Wall data — the pressure chamber's reading model.
// Plates and connection edges are derived from the real projects/experience
// data. Shared-stack edges are computed from the stack arrays; two curated
// description-level edges carry the payment DNA (QPay / bank transfers) that
// lives in the prose rather than the stack lists.

import { projects } from "../../data/projects"

export interface PlateDef {
  slug: string
  numeral: string
  caption: string
  accent: string
  /** gridColumn inside the 6-track symmetric grid (desktop). */
  col: string
  row: number
}

// Accents are drawn from the taste palettes (Loveless pink, Souvlaki blue,
// Discovery yellow, Frailty lilac, nostalgia ULTRA orange, Melodrama blue,
// Selected Ambient grey) — design DNA only.
export const PLATES: PlateDef[] = [
  { slug: "plugged", numeral: "10", caption: "technologies · hybrid search", accent: "#8fb8c8", col: "2 / 4", row: 1 },
  { slug: "callrelay", numeral: "3", caption: "parts: android → edge → linux", accent: "#e8c84a", col: "4 / 6", row: 1 },
  { slug: "khaan-client", numeral: "3", caption: "step sotp auth, fully typed", accent: "#e86a2a", col: "1 / 3", row: 2 },
  { slug: "vit-store", numeral: "13", caption: "technologies in production", accent: "#e8a0b4", col: "3 / 5", row: 2 },
  { slug: "herdr-orchestrate", numeral: "5", caption: "moving parts · pi-native", accent: "#b8a8c8", col: "5 / 7", row: 2 },
  { slug: "sisi-agent", numeral: "5", caption: "deliverables · mcp → thesis", accent: "#5a7ac8", col: "2 / 4", row: 3 },
  { slug: "html-thing", numeral: "0", caption: "runtime dependencies", accent: "#c8c8c8", col: "4 / 6", row: 3 },
]

export const projectOf = (slug: string) =>
  projects.find((p) => p.slug === slug)!

// Normalize stack spellings so the same technology matches across projects.
const ALIASES: Record<string, string> = {
  "typescript esm": "typescript",
  "bun workspaces": "bun",
  "node.js stdlib": "node.js",
  "react 19": "react",
}
const norm = (item: string) => ALIASES[item.toLowerCase()] ?? item.toLowerCase()

export interface Edge {
  a: string
  b: string
  /** Shared items as displayed. */
  shared: string[]
  /** Strong edges are drawn; weak (TypeScript-only) edges fire on splat. */
  strong: boolean
}

const CURATED: Record<string, { shared: string[] }> = {
  "khaan-client|vit-store": {
    shared: ["payment dna", "qpay ↔ transfer reconciliation", "typescript"],
  },
  "plugged|vit-store": {
    shared: ["qpay", "astro", "solidjs", "drizzle", "typescript"],
  },
}

function edgeKey(a: string, b: string) {
  return [a, b].sort().join("|")
}

export const EDGES: Edge[] = (() => {
  const edges: Edge[] = []
  const slugs = PLATES.map((p) => p.slug)
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = slugs[i]
      const b = slugs[j]
      const curated = CURATED[edgeKey(a, b)]
      if (curated) {
        edges.push({ a, b, shared: curated.shared, strong: true })
        continue
      }
      const stackA = projectOf(a).stack
      const bNorm = new Set(projectOf(b).stack.map(norm))
      const shared = stackA.filter((item) => bNorm.has(norm(item)))
      if (shared.length === 0) continue
      edges.push({ a, b, shared, strong: shared.length >= 2 })
    }
  }
  return edges
})()

/** Strong + weak neighbors of a plate, for the pigment reveal. */
export function neighborsOf(slug: string) {
  return EDGES.filter((e) => e.a === slug || e.b === slug).map((e) => ({
    slug: e.a === slug ? e.b : e.a,
    shared: e.shared,
    strong: e.strong,
  }))
}
