export interface Experience {
  company: string
  role: string
  period: string
  current: boolean
  context: string
  highlights: string[]
}

export const experience: Experience[] = [
  {
    company: "erxes",
    role: "Backend Engineer, full stack",
    period: "Jun 2026 – Present",
    current: true,
    context:
      "Open-source CRM and customer-experience platform. Remote. 117 merged PRs across 6 repositories in 4 months.",
    highlights: [
      "Built most of the erxes AI agent plugin with one other engineer on TypeScript, Mastra, AI SDK, React, and MongoDB: native Mastra runtime, persistent memory, agent skills, streaming chat, PPTX, PDF, and chart artifacts, and Mongolian voice with barge-in.",
      "Cut production tool-call failures. 45 of 45 deal-creation calls failed on an ID check and about 19% of all tool calls failed on bad arguments. Fixed both with a name-to-ID resolver and real GraphQL schema facts in tool definitions.",
      "Hardened the agent against SSRF, DNS rebinding, zip bombs, and Mermaid and SVG XSS. Added human approval for destructive actions, server-driven cancellation, and tenant-isolated caches.",
      "Integrated Executor, an MCP and API integration layer, and Cloudflare OS into erxes as an embedded product with per-tenant provisioning and passwordless SSO.",
      "Added the missing pieces for plugins to live in their own repositories outside the erxes monorepo: dev-time loading, self-served UI remotes, and a shared theme. Now on the plugin marketplace and hackathon organizing teams.",
      "Pitched a code quality initiative and lead it with the CTO. Moved a full plugin to schema-first GraphQL codegen in a 12-PR stack across 280 files, added build-time contract checks, and help other plugin teams migrate.",
      "Cut the embeddable messenger widget bundle by 72–82%: Lighthouse mobile 63 → 86, total blocking time 2.4 s → 0.56 s. Fixed an 18 s LCP on erxes.io as part of SEO work I pitched and run.",
    ],
  },
  {
    company: "Amerik Vitamin",
    role: "Founder-engineer, family business",
    period: "Jul 2025 – Present",
    current: true,
    context: "Online store for my mom's US supplement import business.",
    highlights: [
      "Built and run amerikvitamin.mn, the online store for my mom's US supplement import business: Astro and Solid storefront, React admin, Hono and tRPC on Cloudflare Workers, Postgres, QPay checkout. 652 products, 483 web orders, 367 customers.",
      "Building a Messenger AI shopping agent that identifies products from customer photos and takes orders in chat.",
    ],
  },
  {
    company: "Golomt Bank",
    role: "Software Engineer, SocialPay backend team",
    period: "May 2024 – Jun 2025",
    current: false,
    context:
      "SocialPay is Golomt's payments and wallet app. Part-time during semesters, full-time on breaks. Java, Spring Boot, Oracle, ArgoCD.",
    highlights: [
      "Wrote the full backend for the bank's SME merchant app alone in my first 4 months, learning Spring Boot on the job: accounts, transactions, POS history, supply orders, and repair requests. Shipped it to UAT and production and set up basic CI/CD with the devops team. The bank held the public launch.",
      "Owned MostMoney QR payments in SocialPay: a new QR path next to QPay, settled through account-based transfers.",
      "Built SocialPay's part of Mongolia's IBAN migration: IBAN lookup through the Bank of Mongolia and registration in the national account registry, so any bank app can find a user by phone number or email.",
      "Owned the e-barimt e-receipt integration end to end. Designed stored push notifications, which until then went out from the Firebase console and were never saved.",
      "Covered my team lead's exec-visible work during his leave. Supported the Apple Pay launch and debugged WeChat Pay QR deep links with WeChat's engineers.",
    ],
  },
]

export interface Education {
  school: string
  program: string
  period: string
}

export const education: Education[] = [
  { school: "National University of Mongolia", program: "B.Sc. Information Systems", period: "Sep 2022 – Jan 2027" },
  { school: "Pinecone Academy", program: "Software engineering bootcamp", period: "Oct 2023 – May 2024" },
]
