// callrelay incoming-call overlay — the thesis restated: a ring notification that
// paints above EVERYTHING, like the QML layer-shell surface above fullscreen
// Wayland apps. Slides in over every other layer, including the bubble trail.

export default function CallOverlay(props: {
  shown: boolean
  reduced: boolean
  onDismiss: () => void
}) {
  return (
    <div
      class="fixed top-4 right-4 z-[100] w-80 max-w-[92vw]"
      style={{
        transform: props.shown ? "translateX(0)" : "translateX(calc(100% + 2rem))",
        transition: props.reduced
          ? "none"
          : "transform 0.6s cubic-bezier(0.2, 1.25, 0.35, 1)",
        "pointer-events": props.shown ? "auto" : "none",
      }}
      aria-hidden={!props.shown}
    >
      <div class="overflow-hidden rounded-2xl border border-rose-accent/40 bg-neutral-950/80 shadow-2xl shadow-rose-accent/10 backdrop-blur-xl">
        <div class="flex items-center gap-2 border-b border-white/10 bg-rose-accent/10 px-3 py-1.5">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-accent opacity-75" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-rose-accent" />
          </span>
          <span class="text-[10px] font-bold tracking-[0.2em] text-rose-accent uppercase">
            incoming call
          </span>
          <span class="flex-1" />
          <span class="text-[10px] text-neutral-500">callrelay</span>
        </div>
        <div class="px-4 py-3">
          <div class="text-lg font-bold text-neutral-100 tabular-nums">+976 8611-4242</div>
          <div class="mt-0.5 text-[11px] text-neutral-400">
            Android → edge Durable Object → wayland layer shell
          </div>
          <div class="mt-1 text-[10px] text-neutral-600">
            painted above fullscreen apps · persistent until delivered
          </div>
        </div>
        <div class="flex gap-2 px-4 pb-3">
          <button
            type="button"
            class="flex-1 rounded-lg bg-rose-accent/90 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-accent"
            onClick={props.onDismiss}
          >
            decline
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border border-emerald-500/50 bg-emerald-500/15 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/25"
            onClick={props.onDismiss}
          >
            answer
          </button>
        </div>
      </div>
    </div>
  )
}
