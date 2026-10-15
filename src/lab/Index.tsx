import { A } from "@solidjs/router"
import { createSignal, Show } from "solid-js"
import { profile } from "../data/profile"
import { supportsHtmlInCanvas } from "./html-in-canvas"
import { setSound, sound } from "./sound"
import "./index.css"

const FLAG = "chrome://flags/#canvas-draw-element"

export default function Index() {
  const supported = supportsHtmlInCanvas()
  const [choice, setChoice] = createSignal(sound() ?? true)
  const [copied, setCopied] = createSignal(false)
  const commit = () => setSound(choice())

  const copy = async () => {
    await navigator.clipboard.writeText(FLAG)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <main class="home">
      <header class="home-top">
        <span class="home-name">{profile.name}</span>
        <span class="home-role">
          {profile.role.toLowerCase()} · {profile.headline.toLowerCase()}
        </span>
      </header>

      <Show when={!supported}>
        <aside class="home-notice" role="note">
          <p class="home-notice-title">this browser can't run it yet</p>
          <p>
            both pieces draw live html into canvas, a chrome feature still behind a flag. open this page in chrome (or edge, brave, arc), turn on the
            flag below, relaunch, and come back.
          </p>
          <button type="button" class="home-flag" onClick={() => void copy()}>
            <code>{FLAG}</code>
            <span>{copied() ? "copied" : "copy"}</span>
          </button>
          <p class="home-notice-quiet">or pick one anyway and get the plain version.</p>
        </aside>
      </Show>

      <div class="home-doors">
        <A href="/movie" class="door door-movie" onClick={commit}>
          <span class="door-beam" aria-hidden="true" />
          <span class="door-kicker">reel 1–4 · 1.85 : 1 · about 4 min</span>
          <span class="door-title">watch a movie</span>
          <span class="door-sub">the work, projected in a dark room, cut in four camera styles</span>
        </A>
        <A href="/concert" class="door door-concert" onClick={commit}>
          <span class="door-blocks" aria-hidden="true" />
          <span class="door-kicker">darjs_cv.mkv · 6 tracks · loud</span>
          <span class="door-title">watch a concert</span>
          <span class="door-sub">the cv as a corrupted video file that moves with the music</span>
        </A>
        <A href="/read" class="door door-read">
          <span class="door-kicker">no canvas · no sound</span>
          <span class="door-title">just read it</span>
          <span class="door-sub">the same cv as a plain page</span>
        </A>
      </div>

      <footer class="home-bottom">
        <div class="home-sound" role="radiogroup" aria-label="sound">
          <span class="home-sound-label">sound</span>
          <button type="button" role="radio" aria-checked={choice()} onClick={() => setChoice(true)}>
            on
          </button>
          <button type="button" role="radio" aria-checked={!choice()} onClick={() => setChoice(false)}>
            off
          </button>
        </div>
        <span class="home-quiet">
          <a href={profile.cvUrl}>cv.pdf</a> · <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </span>
      </footer>
    </main>
  )
}
