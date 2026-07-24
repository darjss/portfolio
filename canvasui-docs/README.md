# Canvas UI documentation archive

This directory captures the Canvas UI component APIs and complete vanilla TypeScript sources from [canvasui.dev](https://canvasui.dev). It contains **21 components**, all with full published source. Each component page also had a Solid flavor when this archive was made.

Primary sources:

- [Introduction](https://canvasui.dev/docs)
- [Installation](https://canvasui.dev/docs/installation)
- [Component index](https://canvasui.dev/components)
- Per-component documentation and shadcn registry entries linked from each file

## Install from the shadcn registry

Use this command form:

```sh
npx shadcn@latest add @canvas-ui/<name>-<flavor>
```

Current flavor suffixes include `react`, `vue`, `svelte`, `solid`, and `vanilla`. For example:

```sh
npx shadcn@latest add @canvas-ui/particle-reveal-vanilla
npx shadcn@latest add @canvas-ui/particle-reveal-solid
```

Run `npx shadcn@latest init` first if the project does not have shadcn configuration. The CLI copies the source into the project instead of adding a Canvas UI runtime package.

## html-in-canvas requirement

Most components in this archive capture live DOM through Chrome's experimental html-in-canvas API. For local testing:

1. Open `chrome://flags/#canvas-draw-element` in Chrome.
2. Enable **canvas-draw-element**.
3. Restart Chrome.
4. Put `layoutsubtree="true"` on the source canvas that contains the live DOM subtree.

```html
<canvas layoutsubtree="true">
  <div><!-- live HTML captured by drawElementImage --></div>
</canvas>
```

For production, enroll the site's domain in the [HTML-in-Canvas origin trial](https://developer.chrome.com/blog/html-in-canvas-origin-trial). Serve the domain-bound trial token in a meta tag or HTTP header. Canvas UI's token applies only to `canvasui.dev`; it does not enable the API on another domain.

Feature-detect the API at runtime:

```ts
type PaintableCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

export function supportsHtmlInCanvas() {
  if (typeof document === "undefined") return false;

  const canvas = document.createElement("canvas") as PaintableCanvas;
  const context = canvas.getContext("2d") as ElementImageContext | null;

  return Boolean(
    context &&
      typeof context.drawElementImage === "function" &&
      typeof canvas.requestPaint === "function",
  );
}
```

Do not put the only copy of important content inside the experimental source canvas. When detection fails, render the children as ordinary HTML. Canvas UI wrappers do this automatically, do not throw, and keep any effect layer that has a useful pure-WebGL fallback. The 3D object components use `three` and do not need html-in-canvas.

## SolidJS factory integration

All archived components have a published Solid flavor. If an application uses the vanilla factory directly, create the imperative instance after mount, synchronize reactive options in an effect, and destroy the instance during owner cleanup:

```tsx
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import {
  createLiquid,
  type LiquidInstance,
} from "./LiquidVanilla";

export function LiquidExample(props: { children: JSX.Element }) {
  let source!: HTMLCanvasElement;
  let content!: HTMLDivElement;
  let output!: HTMLCanvasElement;
  let instance: LiquidInstance | null = null;
  const [rainbow, setRainbow] = createSignal(true);

  createEffect(() => {
    instance?.setOptions({ rainbow: rainbow() });
  });

  onMount(() => {
    instance = createLiquid(
      { source, content, output },
      { rainbow: rainbow() },
    );

    onCleanup(() => {
      instance?.destroy();
      instance = null;
    });
  });

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setRainbow((value) => !value)}>
        Toggle color
      </button>
      <canvas ref={source} attr:layoutsubtree="true">
        <div ref={content}>{props.children}</div>
      </canvas>
      <canvas
        ref={output}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, "pointer-events": "none" }}
      />
    </div>
  );
}
```

In production, add the feature-detection branch described above so unsupported browsers receive normal HTML. Keep browser APIs in `onMount`, and keep `onCleanup` under the owner that created the Canvas UI instance.

## Components

- [Particle Reveal](components/particle-reveal.md) — Renders your page as fine grayscale dust that merges back into crisp UI around the cursor. The HTML stays interactive.
- [Liquid](components/liquid.md) — A pointer-driven WebGL fluid simulation over your page. The HTML stays interactive.
- [Bubble](components/bubble.md) — A glassy droplet that trails the cursor as blending metaballs and refracts the live page beneath it, with dispersion, frost, and an iridescent sheen. The HTML stays interactive.
- [Cloth](components/cloth.md) — Hangs your live HTML on a piece of fabric rippling in the wind, with softly lit folds. Cursor strokes send waves across the cloth. The HTML stays interactive.
- [Bend](components/bend.md) — Folds the top and bottom of your page over virtual edges as you scroll, like scrolling on the face of a cube. The HTML stays interactive.
- [Frost](components/frost.md) — Covers your page in a frozen pane of ice with refraction and frost grain. Hovering melts a hole through the frost, which freezes back over. The HTML stays interactive.
- [Shatter](components/shatter.md) — Shatters your page into 3D glass shards that lift, tilt, and float around the cursor, refracting the content beneath them, with perspective and soft shadows. The HTML stays interactive.
- [Asciify](components/asciify.md) — Redraws your page as live ascii characters in a soft radius around the cursor, with real glyph, shade block, and binary ramps. The HTML stays interactive.
- [Magnify](components/magnify.md) — A sci-fi scanner lens that follows the cursor and magnifies the live page inside a configurable HUD reticle, with chromatic aberration haze and click ripples that bend the page. The HTML stays interactive.
- [VHS](components/vhs.md) — Plays your page back like a worn VHS tape, with tape wave, head-switch noise, chroma bleed, and grain. The HTML stays interactive.
- [Glitch](components/glitch.md) — Broadcast glitch bursts that tear the page into shifted slices with RGB splits, corrupted blocks, and analog noise, then settle back to a clean read. The HTML stays interactive.
- [Laser](components/laser.md) — Hides everything below a glowing laser beam near the bottom of the viewport. Scrolling prints new content in from behind it. The HTML stays interactive.
- [Peel](components/peel.md) — Peels your page back from a chosen edge as the cursor approaches, revealing a second layer underneath. The HTML stays interactive.
- [Hex Float](components/hex-float.md) — Renders the live page onto a floor of shiny beveled hex tiles that lean back in perspective, bob gently, and rise toward the cursor. The HTML stays interactive.
- [Clouds](components/clouds.md) — Procedural fog that drifts over your page and blurs what it covers. Cursor movement parts the clouds. The HTML stays interactive.
- [Droplets](components/droplets.md) — Rain droplets that run down the screen and refract your page behind them. The HTML stays interactive.
- [Blaze](components/blaze.md) — Fire sparks, smoke, and heat distortion rising from the bottom of your page. The HTML stays interactive.
- [Ripple](components/ripple.md) — Water ripples that spread from every click and refract the live page like a pond surface, with dispersion and light glints on the crests. The HTML stays interactive.
- [Dithered Object](components/dithered-object.md) — Renders any GLB or glTF model in a floating studio scene through a 1-bit Bayer dither.
- [Particle Object](components/particle-object.md) — Rebuilds any GLB/glTF model, SVG, or image as a cloud of particles that the cursor pushes, swirls, and springs back into shape.
- [Glass Object](components/glass-object.md) — Turns any GLB/glTF model, SVG, or image into a floating liquid-glass object with real refraction, chromatic dispersion, frost, and tinted absorption, lit by a studio environment.
