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
    pitch: "A real, deployed commerce platform with payments, ops tooling, and a conversational AI shopping agent.",
    description:
      "Production-scale Mongolian ecommerce monorepo for US-imported vitamins: mobile storefront, admin and inventory dashboard, API gateway, QPay checkout, OTP login, and a Facebook Messenger AI shopping agent with vision-based product identification.",
    stack: ["TypeScript", "Bun", "Turborepo", "Astro", "SolidJS", "React 19", "Hono", "tRPC", "Drizzle", "PostgreSQL", "Cloudflare Workers", "Durable Objects", "Workers AI"],
    sourceUrl: "https://github.com/darjss/vit-store",
    featured: true,
  },
  {
    slug: "plugged",
    name: "plugged",
    pitch: "A curated IEM storefront built around local payments, identity, and hybrid semantic search.",
    description:
      "Curated IEM storefront and admin dashboard for Mongolia, with cart and order tracking, QPay checkout, SMS OTP, product management, PostHog analytics, and hybrid semantic/keyword catalog search.",
    stack: ["TypeScript", "Astro", "SolidJS", "Elysia", "Eden Treaty", "Drizzle", "Cloudflare D1", "Vectorize", "Better Auth", "Tailwind CSS"],
    sourceUrl: "https://github.com/darjss/plugged",
    featured: true,
  },
  {
    slug: "callrelay",
    name: "callrelay",
    pitch: "Android calls, relayed through the edge, ringing above fullscreen Linux apps.",
    description:
      "Three-part system that detects Android calls, relays events through a strongly consistent edge service, and displays ringtone-enabled overlays above fullscreen Linux apps, with persistent delivery for ended-call events.",
    stack: ["Kotlin", "Android CallScreeningService", "Hono", "Cloudflare Workers", "Durable Objects", "QML", "Wayland layer shell"],
    sourceUrl: "https://github.com/darjss/callrelay",
    featured: true,
  },
  {
    slug: "herdr-orchestrate",
    name: "herdr-orchestrate",
    pitch: "Multi-model agent orchestration that is persistent, visible, isolated, and safe.",
    description:
      "Pi-native orchestration for visible and auditable Herdr worker sessions, with durable run state, isolated Git worktrees, model routing, background waiting, run boards, and preview-first cleanup.",
    stack: ["TypeScript", "Node.js", "Pi packages", "Herdr plugins", "Git worktrees"],
    sourceUrl: "https://github.com/darjss/herdr-orchestrate",
    featured: true,
  },
  {
    slug: "khaan-client",
    name: "khaan-client",
    pitch: "An undocumented banking flow, turned into a typed, tested SDK.",
    description:
      "Framework-independent Khan Bank TypeScript SDK for three-step SOTP authentication, remembered-device relogin, transaction retrieval, typed errors, and automatic transfer reconciliation through a hook-based async iterator.",
    stack: ["TypeScript", "ky", "Valibot", "async iterators", "Vitest"],
    sourceUrl: "https://github.com/darjss/khaan-client",
    featured: true,
  },
  {
    slug: "sisi-agent",
    name: "sisi-agent",
    pitch: "University portal data, exposed to AI agents through MCP.",
    description:
      "AI assistant for the National University of Mongolia: a local MCP server over university portal data, a Chrome extension, AI server, experimental web UI, and thesis report.",
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
