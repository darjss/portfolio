# Aviddaram Bazarragchaa

**Software Engineer · Full-stack and AI agents**
Ulaanbaatar, Mongolia · Open to remote or relocation · +976 9456 8799 · hi@darjs.dev · [github.com/darjss](https://github.com/darjss) · [darjs.dev](https://darjs.dev)

## Summary

Software engineer with about 2.5 years of shipping production systems: payment features at a national bank, an AI agent platform at an open-source CRM, and the online store for my family's business. I own features end to end, from schema to UI to deploy, and I start work nobody assigned, like the code quality and SEO initiatives I pitched and now lead at erxes. Fluent English.

## Experience

### erxes · Backend Engineer, full stack · Remote
**Jun 2026 – Present**

Open-source CRM and customer-experience platform. 117 merged PRs across 6 repositories in 4 months.

- Built most of the erxes AI agent plugin with one other engineer on TypeScript, Mastra, AI SDK, React, and MongoDB: native Mastra runtime, persistent memory, agent skills, streaming chat, PPTX, PDF, and chart artifacts, and Mongolian voice with barge-in.
- Cut production tool-call failures. 45 of 45 deal-creation calls failed on an ID check and about 19% of all tool calls failed on bad arguments. Fixed both with a name-to-ID resolver and real GraphQL schema facts in tool definitions.
- Hardened the agent against SSRF, DNS rebinding, zip bombs, and Mermaid and SVG XSS. Added human approval for destructive actions, server-driven cancellation, and tenant-isolated caches.
- Integrated Executor, an MCP and API integration layer, and Cloudflare OS into erxes as an embedded product with per-tenant provisioning and passwordless SSO.
- Added the missing pieces for plugins to live in their own repositories outside the erxes monorepo: dev-time loading, self-served UI remotes, and a shared theme. Now on the plugin marketplace and hackathon organizing teams.
- Pitched a code quality initiative and lead it with the CTO. Moved a full plugin to schema-first GraphQL codegen in a 12-PR stack across 280 files, added build-time contract checks, and help other plugin teams migrate.
- Cut the embeddable messenger widget bundle by 72–82%: Lighthouse mobile 63 → 86, total blocking time 2.4 s → 0.56 s. Fixed an 18 s LCP on erxes.io as part of SEO work I pitched and run.

### Amerik Vitamin · Founder-engineer, family business
**Jul 2025 – Present**

- Built and run [amerikvitamin.mn](https://amerikvitamin.mn), the online store for my mom's US supplement import business: Astro and Solid storefront, React admin, Hono and tRPC on Cloudflare Workers, Postgres, QPay checkout. 652 products, 483 web orders, 367 customers.
- Building a Messenger AI shopping agent that identifies products from customer photos and takes orders in chat.

### Golomt Bank · Software Engineer, SocialPay backend team
**May 2024 – Jun 2025**

SocialPay is Golomt's payments and wallet app. Part-time during semesters, full-time on breaks. Java, Spring Boot, Oracle, ArgoCD.

- Wrote the full backend for the bank's SME merchant app alone in my first 4 months, learning Spring Boot on the job: accounts, transactions, POS history, supply orders, and repair requests. Shipped it to UAT and production and set up basic CI/CD with the devops team. The bank held the public launch.
- Owned MostMoney QR payments in SocialPay: a new QR path next to QPay, settled through account-based transfers.
- Built SocialPay's part of Mongolia's IBAN migration: IBAN lookup through the Bank of Mongolia and registration in the national account registry, so any bank app can find a user by phone number or email.
- Owned the e-barimt e-receipt integration end to end. Designed stored push notifications, which until then went out from the Firebase console and were never saved.
- Covered my team lead's exec-visible work during his leave. Supported the Apple Pay launch and debugged WeChat Pay QR deep links with WeChat's engineers.

## Selected projects

- **[Tranzfer](https://github.com/darjss/tranzfer-v2)**. Resumable file delivery for creators and editors, preparing for public launch. Solid 2, Effect, and Alchemy on Cloudflare D1 and R2, with staging, production, and per-PR preview environments, e2e tests in CI, and Axiom telemetry.
- **[khaan-client](https://github.com/darjss/khaan-client)**. Typed TypeScript SDK for Khan Bank's undocumented API: OTP device login, transactions, and automatic transfer reconciliation. Matches incoming bank transfers to orders in the Amerik Vitamin backend.
- **[Herdr Orchestrate](https://github.com/darjss/herdr-orchestrate)**. Runs multiple AI coding agents in visible terminal sessions with durable state, isolated Git worktrees, and model routing. 7 stars.
- **[Plugged Audio](https://github.com/darjss/plugged)**. Pre-launch in-ear monitor store for Mongolia. Astro, Solid, Elysia, and Drizzle on Cloudflare D1, QPay checkout, hybrid semantic and keyword search on Vectorize, and SMS login codes sent through an Android phone used as the SMS gateway.

## Skills

**Languages:** TypeScript, Java, Go, Kotlin, Python, SQL
**AI:** Mastra, AI SDK, MCP, tool calling, memory, human-in-the-loop, voice
**Backend:** Node.js, Bun, Spring Boot, Hono, GraphQL, tRPC, PostgreSQL, Oracle, MongoDB, Redis
**Frontend and infra:** React, SolidJS, Astro, Cloudflare Workers, Durable Objects, D1, R2, Docker, ArgoCD, GitHub Actions

## Education

**National University of Mongolia** · B.Sc. Information Systems · 2022 – 2027, diploma Jan 2027
**Pinecone Academy** · Software engineering bootcamp · 2023 – 2024
