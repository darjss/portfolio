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
]
