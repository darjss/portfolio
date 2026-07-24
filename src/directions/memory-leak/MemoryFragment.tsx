import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import {
  brightness,
  hashSeed,
  initFragment,
  onTick,
  touchFragment,
} from "./memory";

/**
 * A piece of the page that decays to dust unless someone touches it.
 * Touches keep it lit for `ttl` milliseconds; enough touches fossilize it.
 */
export function MemoryFragment(props: {
  id: string;
  base?: number;
  ttl?: number;
  seed?: number;
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
}) {
  const [opacity, setOpacity] = createSignal(1);

  onMount(() => {
    initFragment({
      id: props.id,
      base: props.base ?? 0.14,
      ttl: props.ttl ?? 20000,
      seed: props.seed ?? hashSeed(props.id),
    });
    const refresh = () => setOpacity(brightness(props.id));
    refresh();
    const stop = onTick(refresh);
    onCleanup(stop);
  });

  const touch = () => touchFragment(props.id);

  return (
    <div
      class={props.class}
      style={{ ...props.style, opacity: opacity() }}
      data-fragment={props.id}
      onPointerMove={touch}
      onPointerDown={touch}
    >
      {props.children}
    </div>
  );
}
