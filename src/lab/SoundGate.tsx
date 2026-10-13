import { Show } from "solid-js"
import { setSound, sound } from "./sound"

export default function SoundGate(props: { title: string }) {
  return (
    <Show when={sound() === null}>
      <div class="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sound-gate-title">
        <div class="w-[min(360px,90vw)] rounded-2xl border border-white/15 bg-neutral-950 p-6 font-mono text-sm text-neutral-200 shadow-2xl">
          <p id="sound-gate-title" class="text-base text-white">{props.title}</p>
          <p class="mt-2 text-neutral-400">this one has sound. play it with audio?</p>
          <div class="mt-5 grid grid-cols-2 gap-2">
            <button type="button" class="rounded-lg bg-white px-3 py-2.5 font-medium text-black transition-transform active:scale-[0.97]" onClick={() => setSound(true)}>
              sound on
            </button>
            <button type="button" class="rounded-lg border border-white/20 px-3 py-2.5 transition-transform active:scale-[0.97]" onClick={() => setSound(false)}>
              sound off
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}
