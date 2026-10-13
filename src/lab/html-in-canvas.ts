export type PaintableCanvas = HTMLCanvasElement & {
  onpaint: ((event: Event & { changedElements?: Element[] }) => void) | null
  requestPaint: () => void
  captureElementImage: (element: Element) => { width: number; height: number }
  updateElementGeometry: (element: Element) => void
}

export type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage: (element: Element, x: number, y: number, width?: number, height?: number) => DOMMatrix
}

export type ElementImageGL = WebGL2RenderingContext & {
  texElementImage2D: (target: GLenum, level: GLint, element: Element) => void
}

export const supportsHtmlInCanvas = () => {
  if (typeof document === "undefined") return false
  const canvas = document.createElement("canvas") as Partial<PaintableCanvas>
  const ctx = canvas.getContext?.("2d") as Partial<ElementImageContext> | null
  return typeof ctx?.drawElementImage === "function" && typeof canvas.requestPaint === "function"
}
