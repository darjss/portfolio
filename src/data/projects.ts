export interface Project {
  slug: string
  name: string
  pitch: string
  description: string
  stack: string[]
  sourceUrl: string
  websiteUrl?: string
  featured: boolean
}

export const projects: Project[] = [
  {
    slug: "vit-store",
    name: "vit-store",
    pitch: "The online store for my mom's supplement import business, live at amerikvitamin.mn.",
    description:
      "Astro and Solid storefront, React admin, Hono and tRPC on Cloudflare Workers, Postgres, QPay checkout, and OTP login. 652 products, 483 web orders, 367 customers. A Messenger AI shopping agent that identifies products from customer photos is in development.",
    stack: ["TypeScript", "Astro", "SolidJS", "React", "Hono", "tRPC", "Drizzle", "PostgreSQL", "Cloudflare Workers", "Durable Objects", "R2", "QPay", "PostHog"],
    sourceUrl: "https://github.com/darjss/vit-store",
    websiteUrl: "https://amerikvitamin.mn",
    featured: true,
  },
  {
    slug: "tranzfer",
    name: "tranzfer",
    pitch: "Resumable file delivery for creators and editors, getting ready for public launch.",
    description:
      "Designed around uploads that recover after dropped connections. Every PR gets its own preview environment with e2e tests in CI, next to staging and production, with Axiom telemetry.",
    stack: ["TypeScript", "Solid 2", "Effect", "Alchemy", "better-auth", "Drizzle", "Cloudflare D1", "R2", "Axiom"],
    sourceUrl: "https://github.com/darjss/tranzfer-v2",
    featured: true,
  },
  {
    slug: "khaan-client",
    name: "khaan-client",
    pitch: "An undocumented banking flow, turned into a typed, tested SDK.",
    description:
      "TypeScript SDK for Khan Bank: OTP device setup, remembered-device login, transactions, typed errors, and automatic transfer reconciliation through an async iterator. Matches incoming bank transfers to orders in the Amerik Vitamin backend.",
    stack: ["TypeScript", "ky", "Valibot", "async iterators", "Vitest"],
    sourceUrl: "https://github.com/darjss/khaan-client",
    featured: true,
  },
  {
    slug: "herdr-orchestrate",
    name: "herdr-orchestrate",
    pitch: "Run several AI coding agents in visible terminal sessions, with state that survives restarts.",
    description:
      "Pi-native orchestration for visible and auditable Herdr worker sessions, with durable run state, isolated Git worktrees, model routing, background waiting, run boards, and preview-first cleanup.",
    stack: ["TypeScript", "Node.js", "Pi packages", "Herdr plugins", "Git worktrees"],
    sourceUrl: "https://github.com/darjss/herdr-orchestrate",
    featured: true,
  },
  {
    slug: "plugged",
    name: "plugged",
    pitch: "A pre-launch in-ear monitor store for Mongolia.",
    description:
      "Storefront and admin with cart and order tracking, QPay checkout, hybrid semantic and keyword search on Vectorize, and SMS login codes sent through an Android phone used as the SMS gateway.",
    stack: ["TypeScript", "Astro", "SolidJS", "Elysia", "Eden Treaty", "Drizzle", "Cloudflare D1", "Vectorize", "Better Auth", "Tailwind CSS"],
    sourceUrl: "https://github.com/darjss/plugged",
    featured: true,
  },
  {
    slug: "dms-plugins",
    name: "dms-plugins",
    pitch: "Plugins for DankMaterialShell, the Linux desktop shell I use.",
    description:
      "A bar widget that shows Codex and Claude Code usage limits from a small Go service, the Call Relay call overlay, and a GNOME Network Displays casting control.",
    stack: ["QML", "Go", "D-Bus"],
    sourceUrl: "https://github.com/darjss/dms-bar-usage",
    featured: false,
  },
  {
    slug: "callrelay",
    name: "callrelay",
    pitch: "Android calls, relayed through the edge, ringing above fullscreen Linux apps.",
    description:
      "Three-part system that detects Android calls, relays events through a strongly consistent edge service, and displays ringtone-enabled overlays above fullscreen Linux apps, with persistent delivery for ended-call events.",
    stack: ["Kotlin", "Android CallScreeningService", "Hono", "Cloudflare Workers", "Durable Objects", "QML", "Wayland layer shell"],
    sourceUrl: "https://github.com/darjss/callrelay",
    featured: false,
  },
  {
    slug: "sisi-agent",
    name: "sisi-agent",
    pitch: "University portal data, exposed to AI agents through MCP.",
    description:
      "My bachelor thesis. AI assistant for the National University of Mongolia: a local MCP server over university portal data, a Chrome extension, AI server, experimental web UI, and thesis report.",
    stack: ["TypeScript", "Bun workspaces", "Turborepo", "MCP", "WXT"],
    sourceUrl: "https://github.com/darjss/sisi-agent",
    featured: false,
  },
  {
    slug: "html-thing",
    name: "html-thing",
    pitch: "One HTML file in, a public URL out.",
    description:
      "Zero-runtime-dependency CLI that uploads one HTML file to Cloudflare R2 and returns a public URL: creates the bucket, attaches a custom domain, resolves the zone, checks slug collisions.",
    stack: ["TypeScript ESM", "Node.js stdlib", "Wrangler", "Cloudflare R2"],
    sourceUrl: "https://github.com/darjss/html-thing",
    featured: false,
  },
]
