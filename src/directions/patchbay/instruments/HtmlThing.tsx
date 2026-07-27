// html-thing — paste HTML, get a URL: the input becomes a live preview
// through a blob URL, standing in for the R2 upload.

import { createSignal, onCleanup, Show } from "solid-js"
import { card, label } from "./shell"

const STARTER = `<!doctype html>
<style>
  body { background: #0a0a0e; color: #e5e5e5; font-family: monospace; padding: 2rem }
  h1 { color: #fb923c }
</style>
<h1>сайн уу, darjs.dev</h1>
<p>one file in — a public url out.</p>`

export default function HtmlThingInstrument() {
  const [html, setHtml] = createSignal(STARTER)
  const [url, setUrl] = createSignal<string | null>(null)
  const [slug, setSlug] = createSignal<string | null>(null)

  const deploy = () => {
    const prev = url()
    if (prev) URL.revokeObjectURL(prev)
    const blob = new Blob([html()], { type: "text/html" })
    setUrl(URL.createObjectURL(blob))
    let h = 7
    const s = html()
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1679616
    setSlug(h.toString(36).padStart(4, "0"))
  }

  onCleanup(() => {
    const u = url()
    if (u) URL.revokeObjectURL(u)
  })

  return (
    <div class="flex flex-col gap-4">
      <p class={label}>
        zero-dependency cli · creates the r2 bucket, attaches the domain,
        checks slug collisions
      </p>

      <div class="grid gap-4 md:grid-cols-2">
        <section class={`${card} flex flex-col`}>
          <p class={`${label} border-b border-neutral-800 px-3 py-2`}>index.html</p>
          <textarea
            value={html()}
            onInput={(e) => setHtml(e.currentTarget.value)}
            spellcheck={false}
            class="min-h-64 w-full flex-1 resize-y bg-transparent p-3 text-[11px] leading-5 text-orange-200 outline-none"
            aria-label="html source"
          />
        </section>

        <section class="flex flex-col gap-3">
          <button
            type="button"
            onClick={deploy}
            class="self-start border border-orange-400/60 px-3 py-1.5 text-[12px] text-orange-300 hover:bg-orange-400/10"
          >
            bunx html-thing index.html
          </button>

          <Show when={url() && slug()}>
            <div class={`${card} px-3 py-2 text-[11px]`}>
              <span class="text-neutral-500">→ uploaded </span>
              <span class="text-orange-300">files.darjs.dev/{slug()}</span>
              <span class="text-neutral-600"> (preview is a local blob url)</span>
            </div>
            <iframe
              src={url()!}
              title="html-thing preview"
              sandbox=""
              class="h-64 w-full border border-neutral-800 bg-black"
            />
          </Show>
          <Show when={!url()}>
            <div class="flex h-64 items-center justify-center border border-dashed border-neutral-800 text-[11px] text-neutral-600">
              deploy to see the preview
            </div>
          </Show>
        </section>
      </div>
    </div>
  )
}
