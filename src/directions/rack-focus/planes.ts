import { experience } from "../../data/experience"
import { projects } from "../../data/projects"

export interface Plane {
  id: string
  title: string
  date: string
  kicker: string
  lines: string[]
  stat?: { value: string; label: string }
  link: { href: string; label: string }
}

function project(slug: string) {
  const found = projects.find((p) => p.slug === slug)
  if (!found) throw new Error(`missing project ${slug}`)
  return found
}

const erxes = experience.find((e) => e.company === "erxes")!
const golomt = experience.find((e) => e.company === "Golomt Bank")!

const vitStore = project("vit-store")
const plugged = project("plugged")
const herdr = project("herdr-orchestrate")
const callrelay = project("callrelay")
const khaan = project("khaan-client")
const htmlThing = project("html-thing")
const sisi = project("sisi-agent")

// One z-axis ordered by time: the present at the front, the thesis as origin
// at the back. Lines stay inside the facts of src/data — three per plate max.
export const planes: Plane[] = [
  {
    id: "erxes",
    title: "erxes",
    date: erxes.period,
    kicker: "focal plane 01 — the present",
    lines: [
      `${erxes.role} — an open-source, AI-native experience OS.`,
      "TypeScript pnpm/Nx monorepo · Apollo GraphQL federation · MongoDB · BullMQ",
      "CRM, support, marketing, commerce — one self-hostable platform",
    ],
    stat: { value: "25,000+", label: "organizations run it" },
    link: { href: "https://erxes.io", label: "erxes.io" },
  },
  {
    id: "vit-store",
    title: vitStore.name,
    date: "chapter 02 — the commerce platform",
    kicker: "focal plane 02",
    lines: [
      "A production commerce monorepo: storefront, admin, API gateway.",
      "QPay checkout · OTP login · a Messenger AI agent that sees products",
      "US-imported vitamins, sold and shipped inside Mongolia",
    ],
    stat: { value: "561", label: "orders through QPay" },
    link: { href: vitStore.sourceUrl, label: "source" },
  },
  {
    id: "plugged",
    title: plugged.name,
    date: "chapter 03 — the storefront",
    kicker: "focal plane 03",
    lines: [
      "A curated IEM storefront and admin dashboard for Mongolia.",
      "QPay checkout · SMS OTP · hybrid semantic + keyword search",
      "TypeScript end to end — Astro, SolidJS, Elysia, D1, Vectorize",
    ],
    link: { href: plugged.sourceUrl, label: "source" },
  },
  {
    id: "herdr-orchestrate",
    title: herdr.name,
    date: "chapter 04 — the orchestrator",
    kicker: "focal plane 04",
    lines: [
      "Multi-model agent orchestration — persistent, visible, isolated, safe.",
      "TypeScript, Pi-native — durable run state, isolated Git worktrees",
      "Model routing, run boards, preview-first cleanup",
    ],
    link: { href: herdr.sourceUrl, label: "source" },
  },
  {
    id: "callrelay",
    title: callrelay.name,
    date: "chapter 05 — the relay",
    kicker: "focal plane 05",
    lines: [
      "Android calls, relayed through the edge, ringing above fullscreen Linux apps.",
      "A three-part system: CallScreeningService → Durable Objects → Wayland overlay",
      "Strongly consistent, durable delivery — even for ended calls",
    ],
    link: { href: callrelay.sourceUrl, label: "source" },
  },
  {
    id: "khaan-client",
    title: khaan.name,
    date: "chapter 06 — the SDK",
    kicker: "focal plane 06",
    lines: [
      "An undocumented banking flow, turned into a typed, tested SDK.",
      "three-step SOTP auth · remembered devices · transfer reconciliation",
      "Framework-independent TypeScript — ky, Valibot, async iterators",
    ],
    link: { href: khaan.sourceUrl, label: "source" },
  },
  {
    id: "html-thing",
    title: htmlThing.name,
    date: "chapter 07 — the CLI",
    kicker: "focal plane 07",
    lines: [
      "One HTML file in, a public URL out.",
      "Zero-runtime-dependency CLI — TypeScript ESM, Node stdlib, Wrangler",
      "Shipped: bucket, domain, slug checks in a single command",
    ],
    link: { href: htmlThing.sourceUrl, label: "source" },
  },
  {
    id: "golomt",
    title: golomt.company,
    date: golomt.period,
    kicker: "focal plane 08 — the bank",
    lines: [
      `${golomt.role} at one of Mongolia's largest banks.`,
      "Shipped SocialPay commerce and payment features used nationwide",
      "Spring Boot services for SME banking · QR payment interoperability",
    ],
    stat: { value: "nationwide", label: "payments reach" },
    link: { href: "https://golomtbank.com", label: "golomtbank.com" },
  },
  {
    id: "sisi-agent",
    title: sisi.name,
    date: "2022 — 2026 · the thesis · the origin",
    kicker: "focal plane 09 — the deepest",
    lines: [
      "National University of Mongolia portal data, exposed to AI agents.",
      "A local MCP server, a Chrome extension, an AI server",
      "Where all of this started",
    ],
    link: { href: sisi.sourceUrl, label: "source" },
  },
]

// Match-focus cuts: matchWords[k] is the single word shared by plane k and
// plane k+1. It is rendered once, at fixed screen coordinates, and never
// blurs or moves while the world re-forms around it.
export const matchWords = [
  "monorepo", // erxes ↔ vit-store
  "QPay", // vit-store ↔ plugged
  "TypeScript", // plugged ↔ herdr-orchestrate
  "durable", // herdr-orchestrate ↔ callrelay
  "three", // callrelay ↔ khaan-client
  "TypeScript", // khaan-client ↔ html-thing
  "shipped", // html-thing ↔ golomt
  "Mongolia", // golomt ↔ sisi-agent
]

export const planeCount = planes.length
