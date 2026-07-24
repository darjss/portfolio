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
    role: "Software Developer",
    period: "2025 — present",
    current: true,
    context:
      "erxes is an LA-headquartered, open-source, AI-native experience OS used by 25,000+ organizations — CRM, omnichannel support, marketing automation, commerce, and finance in one self-hostable platform. Engineering hub in Ulaanbaatar.",
    highlights: [
      "Building modules in a TypeScript pnpm/Nx monorepo: React 18, Apollo GraphQL federation, MongoDB, Redis/BullMQ, Elasticsearch",
      "Working across a 100+ module product used by tens of thousands of organizations",
    ],
  },
  {
    company: "Golomt Bank",
    role: "Software Developer",
    period: "May 2024 — Jun 2025",
    current: false,
    context: "One of Mongolia's largest banks.",
    highlights: [
      "Shipped SocialPay commerce and payment features used nationwide",
      "Built Spring Boot services for SME banking",
      "Worked on QR payment interoperability",
    ],
  },
]

export interface Education {
  school: string
  program: string
  period: string
}

export const education: Education[] = [
  { school: "National University of Mongolia", program: "B.Sc. Information Systems", period: "Sep 2022 — May 2026" },
  { school: "Pinecone Academy", program: "Leap Software Engineering", period: "Oct 2023 — May 2024" },
]
