export interface Direction {
  slug: string
  name: string
  concept: string
}

export const directions: Direction[] = [
  {
    slug: "compositor",
    name: "COMPOSITOR",
    concept: "Your browser boots into a riced Wayland desktop. Cloth-wobbly live windows, fluid dye wallpaper, shatter on workspace switch.",
  },
  {
    slug: "memory-leak",
    name: "MEMORY LEAK",
    concept: "A portfolio that forgets. Everything decays to dust unless touched; a Durable Object keeps the world's collective memory.",
  },
  {
    slug: "flip",
    name: "THE FLIP",
    concept: "Side A: live-ASCII dariacore zine with a magnify-lens cursor. Side B: bank-grade serif CV. Shatter the drop to flip.",
  },
  {
    slug: "wind",
    name: "WIND.UB",
    concept: "The whole page is live-DOM cloth flying in the actual, current wind over Ulaanbaatar. Frost below freezing; your cursor melts it.",
  },
  {
    slug: "overpressure",
    name: "OVERPRESSURE",
    concept: "All work on one dense wall; pointer motion pressurizes fluid over live DOM. Stillness reads. Splat pigment reveals shared stacks.",
  },
  {
    slug: "cold-storage",
    name: "COLD STORAGE",
    concept: "A frozen archive ledger. The cursor melts frost to read; a live loupe inspects micro-type and measures the page itself.",
  },
  {
    slug: "rack-focus",
    name: "RACK FOCUS",
    concept: "The whole career at different depths in one shallow-focus stack. Scroll pulls focus through time. Match cuts on shared words.",
  },
  {
    slug: "patchbay",
    name: "PATCHBAY",
    concept: "Projects as working miniature instruments on a hex grid. Drag patch cables between them to wire the real data flows.",
  },
  {
    slug: "off-register",
    name: "OFF-REGISTER",
    concept: "Every section is a mis-registered print plate: drag the ASCII/VHS ghost into alignment. Lock all 9 to earn the clean CV.",
  },
]
