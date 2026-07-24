// Capture — the canvasui html-in-canvas wrapper pattern.
// When the experimental API is available, children render inside a layoutsubtree
// source canvas and the effect factory gets { source, content, output }.
// When it is not, children render as ordinary DOM and the factory receives a
// detached dummy source — effects with a pure-WebGL fallback keep working.

import { onCleanup, onMount, Show, type JSX, type ParentProps } from "solid-js"

export interface CaptureElements {
  source: HTMLCanvasElement
  content: HTMLElement
  output: HTMLCanvasElement
}

interface CaptureProps extends ParentProps {
  /** html-in-canvas available. Static — computed once by the caller. */
  enabled: boolean
  wrapperClass?: string
  wrapperStyle?: JSX.CSSProperties
  contentClass?: string
  /** Keep the source canvas in flow (sizes to content) instead of absolute fill. */
  sourceInFlow?: boolean
  onInit: (els: CaptureElements) => (() => void) | void
}

export default function Capture(props: CaptureProps) {
  let source!: HTMLCanvasElement
  let content!: HTMLDivElement
  let fallbackContent!: HTMLDivElement
  let output!: HTMLCanvasElement

  onMount(() => {
    const els: CaptureElements = props.enabled
      ? { source, content, output }
      : { source: document.createElement("canvas"), content: fallbackContent, output }
    const cleanup = props.onInit(els)
    if (typeof cleanup === "function") onCleanup(cleanup)
  })

  return (
    <div class={props.wrapperClass} style={props.wrapperStyle}>
      <Show
        when={props.enabled}
        fallback={
          <div ref={fallbackContent} class={props.contentClass}>
            {props.children}
          </div>
        }
      >
        <canvas
          ref={(el) => {
            source = el
            el.setAttribute("layoutsubtree", "true")
          }}
          class={
            props.sourceInFlow ? "block w-full" : "absolute inset-0 block h-full w-full"
          }
        >
          <div ref={content} class={props.contentClass}>
            {props.children}
          </div>
        </canvas>
      </Show>
      <canvas
        ref={output}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  )
}
