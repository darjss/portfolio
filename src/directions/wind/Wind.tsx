import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js"
import {
  createCloth,
  supportsHtmlInCanvas,
  type ClothInstance,
  type ClothOptions,
} from "./canvas/ClothVanilla"
import { createFrost } from "./canvas/frost"
import { createHorse } from "./canvas/horse"
import { createRain } from "./canvas/rain"
import { createSky } from "./canvas/sky"
import FlagContent from "./FlagContent"
import {
  FALLBACK_WEATHER,
  clothWind,
  compass,
  fetchWeather,
  frostIntensity,
  type Weather,
} from "./weather"
import { projects } from "../../data/projects"
import "./wind.css"

const callrelay = projects.find((project) => project.slug === "callrelay")!

function clothOptionsFrom(weather: Weather): ClothOptions {
  return {
    pin: "left",
    wind: clothWind(weather.windSpeed),
    speed: Math.min(Math.max(0.25 + weather.windSpeed * 0.09, 0.25), 1.1),
    amplitude: Math.min(Math.max(12 + weather.windSpeed * 2.5, 12), 42),
    drape: 32,
    cornerRadius: 6,
    backing: [0.04, 0.04, 0.04],
    shadow: 0.3,
  }
}

export default function Wind() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  // The whole page rides live-DOM cloth only where Chrome's experimental
  // html-in-canvas API exists. Everywhere else gets the CSS fabric fallback.
  const useCloth = !reducedMotion && supportsHtmlInCanvas()

  const [weather, setWeather] = createSignal<Weather>(FALLBACK_WEATHER)
  const [cloth, setCloth] = createSignal<ClothInstance | null>(null)
  const [ringing, setRinging] = createSignal(false)
  const [callOpen, setCallOpen] = createSignal(false)

  const frostActive = () => !reducedMotion && weather().temperature < 0

  let clothSource!: HTMLCanvasElement
  let clothContent!: HTMLDivElement
  let clothOutput!: HTMLCanvasElement
  let skyCanvas!: HTMLCanvasElement
  let horseCanvas!: HTMLCanvasElement
  let rainCanvas!: HTMLCanvasElement
  let frostCanvas!: HTMLCanvasElement
  let bubble!: HTMLDivElement

  // Lock the cloth's violence/laziness to the real wind on every poll.
  createEffect(() => {
    const w = weather()
    cloth()?.setOptions(clothOptionsFrom(w))
  })

  onMount(() => {
    // ——— weather: poll open-meteo, fall back to the recorded winter average ———
    let stopped = false
    const poll = async () => {
      const next = await fetchWeather()
      if (!stopped) setWeather(next)
    }
    poll()
    const pollTimer = window.setInterval(poll, 10 * 60 * 1000)

    // ——— sky: pale dawn clouds, slow drift tied to wind speed ———
    const sky = createSky(skyCanvas, {
      windSpeed: () => weather().windSpeed,
      still: reducedMotion,
    })

    const cleanups: Array<() => void> = [
      () => {
        stopped = true
        window.clearInterval(pollTimer)
      },
    ]
    if (sky) cleanups.push(sky.destroy)

    if (!reducedMotion) {
      const horse = createHorse(horseCanvas)
      if (horse) cleanups.push(horse.destroy)

      const rain = createRain(rainCanvas, {
        amount: () => weather().precipitation,
        windDirection: () => weather().windDirection,
      })
      if (rain) cleanups.push(rain.destroy)

      const frost = createFrost(frostCanvas, {
        intensity: () => frostIntensity(weather().temperature),
        activateAfterMs: 4000,
      })
      if (frost) cleanups.push(frost.destroy)
    }

    // ——— cloth: the entire page DOM as one flag, left edge pinned ———
    if (useCloth) {
      clothSource.setAttribute("layoutsubtree", "true")
      const instance = createCloth(
        { source: clothSource, content: clothContent, output: clothOutput },
        clothOptionsFrom(weather()),
      )
      if (instance) {
        setCloth(instance)
        cleanups.push(() => {
          instance.destroy()
          setCloth(null)
        })
      }
    }

    // ——— callrelay: gusts above the threshold make the patch ring ———
    let ringStop = 0
    const ringTimer = window.setInterval(() => {
      const w = weather()
      if (callOpen() || ringing()) return
      if (w.windSpeed >= 3.5 && Math.random() < w.windSpeed / 14) {
        setRinging(true)
        window.clearTimeout(ringStop)
        ringStop = window.setTimeout(() => setRinging(false), 8000)
      }
    }, 5000)
    cleanups.push(() => {
      window.clearInterval(ringTimer)
      window.clearTimeout(ringStop)
    })

    // ——— bubble: the melt patch that follows the cursor ———
    let bubbleRaf = 0
    if (!reducedMotion) {
      let tx = -200
      let ty = -200
      let cx = -200
      let cy = -200
      const onMove = (event: PointerEvent) => {
        tx = event.clientX
        ty = event.clientY
      }
      window.addEventListener("pointermove", onMove, { passive: true })
      const follow = () => {
        if (frostActive()) {
          cx += (tx - cx) * 0.16
          cy += (ty - cy) * 0.16
          bubble.style.transform = `translate3d(${cx - 48}px, ${cy - 48}px, 0)`
        }
        bubbleRaf = requestAnimationFrame(follow)
      }
      bubbleRaf = requestAnimationFrame(follow)
      cleanups.push(() => {
        cancelAnimationFrame(bubbleRaf)
        window.removeEventListener("pointermove", onMove)
      })
    }

    onCleanup(() => {
      for (const cleanup of cleanups) cleanup()
    })
  })

  // clicks are local fabric tugs: briefly strengthen the brush
  let tugTimer = 0
  function onTug() {
    const instance = cloth()
    if (!instance) return
    instance.setOptions({ brush: 6 })
    window.clearTimeout(tugTimer)
    tugTimer = window.setTimeout(
      () => cloth()?.setOptions({ brush: 2.05 }),
      350,
    )
  }
  onCleanup(() => window.clearTimeout(tugTimer))

  function answerCall() {
    setRinging(false)
    setCallOpen(true)
  }

  const swayDuration = () =>
    `${Math.max(1.8, 6.5 - weather().windSpeed * 0.6).toFixed(2)}s`

  return (
    <main class="relative min-h-full font-mono">
      {/* sky layer: pale dawn gradient + drifting clouds + the horse */}
      <div class="fixed inset-0 z-0" aria-hidden="true">
        <div
          class="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,#0a0a0a 0%,#141016 42%,#33202c 74%,#5c3a48 100%)",
          }}
        />
        <canvas ref={skyCanvas} class="absolute inset-0 h-full w-full" />
        <canvas ref={horseCanvas} class="absolute inset-0 h-full w-full" />
      </div>

      {/* cloth layer: the entire page is the flag */}
      <Show
        when={useCloth}
        fallback={
          <div
            class="wind-sway relative z-10"
            style={{ "animation-duration": swayDuration() }}
          >
            <FlagContent
              weather={weather}
              ringing={ringing}
              onAnswer={answerCall}
              reducedMotion={reducedMotion}
            />
          </div>
        }
      >
        <div class="relative z-10" onPointerDown={onTug}>
          <canvas ref={clothSource} class="block w-full">
            <div ref={clothContent} class="w-full">
              <FlagContent
                weather={weather}
                ringing={ringing}
                onAnswer={answerCall}
                reducedMotion={reducedMotion}
              />
            </div>
          </canvas>
          <canvas
            ref={clothOutput}
            aria-hidden="true"
            class="pointer-events-none absolute"
          />
        </div>
      </Show>

      {/* droplets: precipitation mode */}
      <canvas
        ref={rainCanvas}
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 z-30 h-full w-full"
      />

      {/* frost: creeps in from the edges below freezing */}
      <canvas
        ref={frostCanvas}
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 z-40 h-full w-full"
      />

      {/* bubble: the iridescent melt patch on the cursor */}
      <div
        ref={bubble}
        aria-hidden="true"
        class="wind-bubble pointer-events-none fixed left-0 top-0 z-50 h-24 w-24 rounded-full"
        style={{
          display: frostActive() ? "block" : "none",
          "backdrop-filter": "blur(2px) saturate(1.5)",
          border: "1px solid rgba(255,255,255,0.22)",
          background:
            "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.16), transparent 42%), conic-gradient(from 0deg, rgba(244,63,94,0.10), rgba(143,184,200,0.14), rgba(232,200,74,0.10), rgba(232,106,42,0.12), rgba(244,63,94,0.10))",
        }}
      />

      {/* the callrelay overlay: answering the wind */}
      <Show when={callOpen()}>
        <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6">
          <div class="max-w-md border-2 border-dashed border-rose-accent bg-[#0f0f0f] p-6">
            <p class="text-[10px] tracking-[0.3em] text-rose-accent">
              INCOMING CALL — ANSWERED
            </p>
            <h2 class="mt-3 text-xl font-bold text-neutral-100">
              {callrelay.name}
            </h2>
            <p class="mt-2 text-xs leading-relaxed text-neutral-400">
              {callrelay.description}
            </p>
            <p class="mt-3 text-[10px] text-neutral-500">
              {callrelay.stack.join(" · ")}
            </p>
            <div class="mt-5 flex gap-4">
              <a
                class="text-xs text-rose-accent underline decoration-dotted"
                href={callrelay.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                source ↗
              </a>
              <button
                type="button"
                class="text-xs text-neutral-400 underline decoration-dotted"
                onClick={() => setCallOpen(false)}
              >
                hang up
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* the tether line: always visible */}
      <footer class="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-[#0a0a0a]/85 px-4 py-2 text-[11px] text-neutral-400 backdrop-blur-sm">
        <span
          class="mr-2 inline-block text-rose-accent"
          style={{
            transform: `rotate(${((weather().windDirection + 180) % 360).toFixed(0)}deg)`,
          }}
        >
          ↑
        </span>
        this sentence is bending in the actual wind over Ulaanbaatar right now
        — {weather().windSpeed.toFixed(1)} m/s {compass(weather().windDirection)},{" "}
        {Math.round(weather().temperature)}°C
        {weather().precipitation > 0
          ? ` · ${weather().precipitation.toFixed(1)} mm precipitation`
          : ""}
        {weather().live ? "" : " · recorded winter average (live feed unreachable)"}
      </footer>
    </main>
  )
}
