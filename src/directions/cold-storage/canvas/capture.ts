// Shared html-in-canvas capture hub.
// Frost and Magnify both need the same live DOM snapshot. Chrome gives one
// `onpaint` slot per canvas, so this class owns the source canvas and fans
// the paint event out to every subscriber.

export type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null
  requestPaint?: () => void
}

export type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void
}

export function supportsHtmlInCanvas() {
  if (typeof document === "undefined") return false
  const probe = document.createElement("canvas") as PaintableCanvas
  const ctx = probe.getContext("2d") as ElementImageContext | null
  return Boolean(
    ctx &&
      typeof ctx.drawElementImage === "function" &&
      typeof probe.requestPaint === "function",
  )
}

export class SourceCapture {
  private ctx: ElementImageContext | null
  private paintable: PaintableCanvas
  private listeners = new Set<() => void>()

  constructor(
    private source: HTMLCanvasElement,
    private content: HTMLElement,
  ) {
    this.paintable = source as PaintableCanvas
    this.ctx = source.getContext("2d") as ElementImageContext | null
    this.paintable.onpaint = () => {
      try {
        if (!this.ctx) return
        this.ctx.reset()
        this.ctx.drawElementImage?.(this.content, 0, 0)
        for (const listener of this.listeners) listener()
      } catch {
        // A failed paint keeps the last frame. That is safe to ignore.
      }
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  syncSize() {
    const width = Math.max(1, Math.round(this.source.clientWidth))
    const height = Math.max(1, Math.round(this.source.clientHeight))
    if (this.source.width !== width || this.source.height !== height) {
      this.source.width = width
      this.source.height = height
    }
    this.paintable.requestPaint?.()
  }

  destroy() {
    this.listeners.clear()
    this.paintable.onpaint = null
  }
}
