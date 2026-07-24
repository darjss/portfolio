// Bubble cursor trail — canvasui Bubble wrapped around the whole desktop content.
// With html-in-canvas it refracts the live desktop; without it the published
// pure-WebGL fallback still renders the glassy droplet trail. Topmost effect layer.

import type { ParentProps } from "solid-js"
import { createBubble } from "../canvas/bubble"
import Capture from "./Capture"

export default function BubbleLayer(props: ParentProps<{
  capture: boolean
  reduced: boolean
}>) {
  return (
    <Capture
      enabled={props.capture}
      wrapperClass="absolute inset-0 z-10"
      contentClass="h-full w-full"
      onInit={(els) => {
        if (props.reduced) return
        const instance = createBubble(els, {
          size: 26,
          trail: 20,
          follow: 0.35,
          blend: 16,
          speed: 2,
          refraction: 70,
          dispersion: 1,
          shine: 0.3,
          rim: 0.6,
          iridescence: 1,
          intensity: 0.9,
          tint: [0.957, 0.247, 0.369],
          tintStrength: 0.22,
          fallbackOpacity: 0.85,
        })
        if (!instance) return
        return () => instance.destroy()
      }}
    >
      {props.children}
    </Capture>
  )
}
