import { For } from "solid-js"
import { supportsHtmlInCanvas } from "./html-in-canvas"

const directions = ["spectrogram", "datamosh", "projection", "tiling", "galley"]

export default function Index() {
  return (
    <main class="mx-auto max-w-xl p-10 font-mono text-sm">
      <p>canvas lab · html-in-canvas {supportsHtmlInCanvas() ? "on" : "off"}</p>
      <ul class="mt-6 space-y-2">
        <For each={directions}>{(slug) => <li><a class="underline" href={`/${slug}`}>{slug}</a></li>}</For>
      </ul>
    </main>
  )
}
