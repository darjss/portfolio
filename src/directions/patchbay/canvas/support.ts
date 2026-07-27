// Shared capability detection for the canvasui effect layer.

type PaintableCanvas = HTMLCanvasElement & {
  requestPaint?: () => void
}

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void
}

let htmlInCanvas: boolean | null = null

export function supportsHtmlInCanvas() {
  if (htmlInCanvas !== null) return htmlInCanvas
  if (typeof document === "undefined") return false
  const probe = document.createElement("canvas") as PaintableCanvas
  const ctx = probe.getContext("2d") as ElementImageContext | null
  htmlInCanvas = Boolean(
    ctx &&
      typeof ctx.drawElementImage === "function" &&
      typeof probe.requestPaint === "function",
  )
  return htmlInCanvas
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return true
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
