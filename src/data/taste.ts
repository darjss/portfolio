// Taste data — the personality layer. Scraped from Letterboxd (Sjrad) and the local music library.

export const favoriteFilms = ["La La Land", "Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles", "In the Mood for Love", "Climax"]

export const fiveStarFilms = [
  "Dune: Part Two", "Poor Things", "The Holdovers", "Oppenheimer", "Asteroid City", "BlackBerry", "Babylon",
  "Decision to Leave", "tick, tick... BOOM!", "Dune", "The French Dispatch", "Kajillionaire", "Little Women",
  "Marriage Story", "Parasite", "Chernobyl", "Booksmart", "The Favourite", "Climax", "Hereditary",
  "Blade Runner 2049", "Dunkirk", "20th Century Women", "Arrival", "La La Land", "The Handmaiden", "Spotlight",
  "The Witch", "The Grand Budapest Hotel", "Her", "The Perks of Being a Wallflower", "Frances Ha",
  "The Social Network", "Fantastic Mr. Fox", "Inglourious Basterds", "The Dark Knight", "Ratatouille",
  "The Incredibles", "Before Sunset", "Punch-Drunk Love", "Monsters, Inc.", "The Royal Tenenbaums",
  "In the Mood for Love", "Magnolia", "Good Will Hunting", "Whisper of the Heart", "Before Sunrise",
  "Forrest Gump", "Schindler's List", "A Brighter Summer Day", "Do the Right Thing",
  "Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles", "Psycho", "Seven Samurai", "Ikiru",
]

export const favoriteDirectors = [
  "Wes Anderson", "Paul Thomas Anderson", "Park Chan-wook", "Denis Villeneuve",
  "Christopher Nolan", "Richard Linklater", "Wong Kar-wai", "Yorgos Lanthimos",
]

export const albums = [
  { title: "Loveless", artist: "My Bloody Valentine", palette: ["#e8a0b4", "#7a4a5e"] },
  { title: "Souvlaki", artist: "Slowdive", palette: ["#8fb8c8", "#3a5a6a"] },
  { title: "nostalgia, ULTRA", artist: "Frank Ocean", palette: ["#e86a2a", "#8a3a1a"] },
  { title: "Melodrama", artist: "Lorde", palette: ["#2a4a8a", "#8a2a5a"] },
  { title: "Norman Fucking Rockwell!", artist: "Lana Del Rey", palette: ["#6a7a9a", "#c8b8a8"] },
  { title: "OK Computer", artist: "Radiohead", palette: ["#9ab8c8", "#4a5a6a"] },
  { title: "Frailty", artist: "Jane Remover", palette: ["#b8a8c8", "#3a3a4a"] },
  { title: "Discovery", artist: "Daft Punk", palette: ["#e8c84a", "#2a2a4a"] },
  { title: "Wallsocket", artist: "underscores", palette: ["#c8d8b8", "#4a5a3a"] },
  { title: "Selected Ambient Works 85-92", artist: "Aphex Twin", palette: ["#d8d8d8", "#5a5a5a"] },
  { title: "Depression Cherry", artist: "Beach House", palette: ["#c84a5a", "#4a1a2a"] },
  { title: "Ants From Up There", artist: "Black Country, New Road", palette: ["#c8a86a", "#5a4a2a"] },
  { title: "Ultraviolence", artist: "Lana Del Rey", palette: ["#8a8a9a", "#2a2a3a"] },
  { title: "untitled unmastered.", artist: "Kendrick Lamar", palette: ["#3a3a3a", "#c8c8c8"] },
  { title: "Syro", artist: "Aphex Twin", palette: ["#c8c8b8", "#6a6a5a"] },
]

export const hyperpopArtists = ["Jane Remover", "100 gecs", "glaive", "2hollis", "underscores", "kmoe", "brakence", "quinn", "Lucy Bedroque"]

export const books = [
  { title: "The Secret History", author: "Donna Tartt", status: "reading" },
  { title: "Project Hail Mary", author: "Andy Weir", status: "read" },
  { title: "Red Rising", author: "Pierce Brown", status: "read" },
] as const

export const letterboxd = "https://letterboxd.com/Sjrad/"
