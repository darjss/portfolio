import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { albums } from "../../data/taste";
import { createBubble, type BubbleInstance } from "./canvas/BubbleVanilla";
import { SourceCapture, supportsHtmlInCanvas } from "./canvas/capture";
import { createLiquid, type LiquidInstance } from "./canvas/LiquidVanilla";
import {
  createParticleReveal,
  type ParticleRevealInstance,
} from "./canvas/ParticleRevealVanilla";
import { createRipple, type RippleInstance } from "./canvas/RippleVanilla";
import { SiteContent } from "./content";
import { remembered, setPlainMode, touchFragment } from "./memory";

// Static film grain for the fallback, as an inline SVG turbulence tile.
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0"/></filter><rect width="180" height="180" filter="url(#n)"/></svg>`,
)}")`;

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

// The dye cross-fades through album palettes as the visitor scrolls:
// Loveless pink, Souvlaki teal, nostalgia-ULTRA orange, then deeper cuts.
const SECTION_COLORS = [
  hexToRgb(albums[0].palette[0]), // Loveless — my bloody valentine
  hexToRgb(albums[1].palette[0]), // Souvlaki — slowdive
  hexToRgb(albums[2].palette[0]), // nostalgia, ULTRA — frank ocean
  hexToRgb(albums[3].palette[1]), // Melodrama — lorde
  hexToRgb(albums[4].palette[1]), // Norman Fucking Rockwell! — lana del rey
];

const OVERLAY_CLASS =
  "pointer-events-none absolute inset-0 h-full w-full";

export default function MemoryLeak() {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canCapture = !reduced && supportsHtmlInCanvas();
  const effectsOn = !reduced;

  // Without live capture the fragments stay fully lit and readable.
  setPlainMode(!canCapture);

  const [showCounter, setShowCounter] = createSignal(false);

  let wrap!: HTMLDivElement;
  let source!: HTMLCanvasElement;
  let contentEl!: HTMLDivElement;
  let fxSource!: HTMLCanvasElement;
  let particleOut!: HTMLCanvasElement;
  let liquidOut!: HTMLCanvasElement;
  let rippleOut!: HTMLCanvasElement;
  let bubbleOut!: HTMLCanvasElement;

  onMount(() => {
    const counterTimer = window.setTimeout(() => setShowCounter(true), 9000);

    // The first touch materializes the opening line.
    const firstTouch = () => touchFragment("hero");
    window.addEventListener("pointermove", firstTouch, { once: true });
    window.addEventListener("pointerdown", firstTouch, { once: true });

    if (!effectsOn) {
      onCleanup(() => {
        window.clearTimeout(counterTimer);
        window.removeEventListener("pointermove", firstTouch);
        window.removeEventListener("pointerdown", firstTouch);
      });
      return;
    }

    let capture: SourceCapture | null = null;
    let particle: ParticleRevealInstance | null = null;
    let liquid: LiquidInstance | null = null;
    let ripple: RippleInstance | null = null;
    let bubble: BubbleInstance | null = null;

    if (canCapture) {
      // Opt the source canvas into the experimental html-in-canvas API.
      source.setAttribute("layoutsubtree", "true");
      capture = new SourceCapture(source, contentEl);
      // A canvas is a replaced element: pin its box to the content height so
      // the wrapper (and every overlay canvas) always covers the full page.
      const syncSourceBox = () => {
        const height = contentEl.offsetHeight;
        if (height > 0) source.style.height = `${height}px`;
        capture?.syncSize();
      };
      syncSourceBox();
      particle = createParticleReveal(
        { source, content: contentEl, output: particleOut, capture },
        {
          radius: 260,
          softness: 0.8,
          size: 1.2,
          scatter: 90,
          drift: 0.7,
          aberration: 2.5,
          bend: 30,
          fade: 0.85,
          threshold: 0.08,
          background: "#0a0a0a",
          smoothing: 0.6,
        },
      );
    }

    liquid = createLiquid(
      { source: fxSource, content: contentEl, output: liquidOut },
      {
        overlayOnly: true,
        color: SECTION_COLORS[0],
        densityDissipation: 0.995, // about twenty seconds of stain
        velocityDissipation: 0.97,
        curl: 1.4,
        radius: 0.25,
        force: 0.6,
        intensity: 0.32,
      },
    );

    ripple = createRipple(
      { source: fxSource, content: contentEl, output: rippleOut },
      {
        overlayOnly: true,
        amplitude: 0.9,
        shine: 1,
        speed: 0.55,
        wavelength: 110,
        rings: 3,
        decay: 1.2,
        trigger: "click",
        interval: 9,
      },
    );

    bubble = createBubble(
      canCapture && capture
        ? { source, content: contentEl, output: bubbleOut, capture }
        : { source: fxSource, content: contentEl, output: bubbleOut },
      {
        overlayOnly: !canCapture,
        size: 26,
        trail: 10,
        follow: 0.6,
        frost: 0.35,
        iridescence: 1.2,
        dispersion: 1.2,
        shine: 0.5,
        refraction: 90,
        colorA: [0.96, 0.63, 0.71], // Loveless pink
        colorB: [0.56, 0.72, 0.78], // Souvlaki teal
        fallbackOpacity: 0.55,
      },
    );

    // The first touch also bleeds dye like a developing photograph.
    const develop = (event: PointerEvent) => {
      if (!liquid) return;
      const rect = wrap.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
      for (let i = 0; i < 3; i++) {
        liquid.splat(
          x + (Math.random() - 0.5) * 0.15,
          y + (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 16,
        );
      }
    };
    window.addEventListener("pointermove", develop, { once: true });

    // Cross-fade the dye color with the scroll position.
    let current: [number, number, number] = [...SECTION_COLORS[0]];
    const paletteTimer = window.setInterval(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = max > 0 ? window.scrollY / max : 0;
      const x = t * (SECTION_COLORS.length - 1);
      const i = Math.min(Math.floor(x), SECTION_COLORS.length - 2);
      const f = x - i;
      const a = SECTION_COLORS[i];
      const b = SECTION_COLORS[i + 1];
      const target: [number, number, number] = [
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f,
      ];
      current = [
        current[0] + (target[0] - current[0]) * 0.1,
        current[1] + (target[1] - current[1]) * 0.1,
        current[2] + (target[2] - current[2]) * 0.1,
      ];
      liquid?.setOptions({ color: current });
    }, 120);

    const resizeObserver = new ResizeObserver(() => {
      const height = contentEl.offsetHeight;
      if (canCapture && height > 0) source.style.height = `${height}px`;
      capture?.syncSize();
    });
    resizeObserver.observe(contentEl);

    onCleanup(() => {
      window.clearTimeout(counterTimer);
      window.clearInterval(paletteTimer);
      window.removeEventListener("pointermove", firstTouch);
      window.removeEventListener("pointerdown", firstTouch);
      window.removeEventListener("pointermove", develop);
      resizeObserver.disconnect();
      particle?.destroy();
      liquid?.destroy();
      ripple?.destroy();
      bubble?.destroy();
      capture?.destroy();
    });
  });

  return (
    <main class="relative min-h-full w-full bg-[#0a0a0a]">
      <div ref={wrap} class="relative w-full">
        <Show
          when={canCapture}
          fallback={
            <div ref={contentEl} class="w-full">
              <SiteContent />
            </div>
          }
        >
          <canvas ref={source} class="block w-full">
            <div ref={contentEl}>
              <SiteContent />
            </div>
          </canvas>
        </Show>

        <Show when={!canCapture}>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 z-10"
            style={{ "background-image": GRAIN_URL }}
          />
        </Show>

        <Show when={effectsOn}>
          <canvas ref={fxSource} class="hidden" aria-hidden="true" />
          <Show when={canCapture}>
            <canvas ref={particleOut} class={`${OVERLAY_CLASS} z-10`} />
          </Show>
          <canvas ref={liquidOut} class={`${OVERLAY_CLASS} z-20`} />
          <canvas ref={rippleOut} class={`${OVERLAY_CLASS} z-30`} />
          <canvas ref={bubbleOut} class={`${OVERLAY_CLASS} z-40`} />
        </Show>
      </div>

      <div
        class="pointer-events-none fixed right-4 bottom-4 z-50 font-mono text-xs text-neutral-500 transition-opacity duration-2000"
        style={{ opacity: showCounter() ? 1 : 0 }}
      >
        this site has been remembered {remembered()} times.
      </div>
    </main>
  );
}
