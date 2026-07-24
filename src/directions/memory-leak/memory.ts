// The memory store. It simulates the future collective Durable-Object memory
// with localStorage: every touch keeps a fragment lit for a while, and a
// fragment touched often enough stays lit forever ("fossilized").

import { createSignal } from "solid-js";

export interface FragmentDef {
  id: string;
  /** Resting opacity when nobody remembers the fragment (0 to 1). */
  base: number;
  /** Milliseconds a touch keeps the fragment fully lit. */
  ttl: number;
  /** Seeded past touches, so the world feels older than this visit. */
  seed: number;
}

interface FragmentState {
  def: FragmentDef;
  touches: number;
  litUntil: number;
  lastTouch: number;
}

interface Persisted {
  touches: Record<string, number>;
  lit: Record<string, number>;
  total: number;
}

const STORAGE_KEY = "memory-leak:v1";
const FOSSILIZE_AT = 5;
const BASE_REMEMBERED = 1284;
const TOUCH_THROTTLE_MS = 600;
const TICK_MS = 250;

let plainMode = false;
const fragments = new Map<string, FragmentState>();
const tickCallbacks = new Set<() => void>();
let tickTimer: number | undefined;
let persistTimer: number | undefined;
let totalTouches = 0;
let loaded = false;

const [remembered, setRemembered] = createSignal(BASE_REMEMBERED);
export { remembered };

let persisted: Persisted | null = null;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) persisted = JSON.parse(raw) as Persisted;
    totalTouches = persisted?.total ?? 0;
    setRemembered(BASE_REMEMBERED + totalTouches);
  } catch {
    // A broken store only means the site forgot more. That fits the theme.
  }
}

function schedulePersist() {
  if (persistTimer !== undefined) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = undefined;
    try {
      const touches: Record<string, number> = {};
      const lit: Record<string, number> = {};
      for (const state of fragments.values()) {
        touches[state.def.id] = state.touches;
        lit[state.def.id] = state.litUntil;
      }
      const data: Persisted = { touches, lit, total: totalTouches };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be full or blocked. The visit still counts on screen.
    }
  }, 400);
}

/** Small deterministic hash, used to seed plausible past touches. */
export function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 3;
}

/** In plain mode (fallback or reduced motion) everything is fully lit. */
export function setPlainMode(value: boolean) {
  plainMode = value;
}

export function initFragment(def: FragmentDef) {
  if (fragments.has(def.id)) return;
  load();
  // A stored count already contains the seed, so prefer it as-is.
  fragments.set(def.id, {
    def,
    touches: persisted?.touches[def.id] ?? def.seed,
    litUntil: persisted?.lit[def.id] ?? 0,
    lastTouch: 0,
  });
}

export function touchFragment(id: string) {
  const state = fragments.get(id);
  if (!state) return;
  const now = Date.now();
  const fresh = now - state.lastTouch >= TOUCH_THROTTLE_MS;
  state.lastTouch = now;
  state.litUntil = now + state.def.ttl;
  if (fresh) {
    state.touches += 1;
    totalTouches += 1;
    setRemembered(BASE_REMEMBERED + totalTouches);
    schedulePersist();
    notify();
  }
}

export function brightness(id: string): number {
  if (plainMode) return 1;
  const state = fragments.get(id);
  if (!state) return 1;
  if (state.touches >= FOSSILIZE_AT) return 1;
  const { base, ttl } = state.def;
  let value = base;
  const now = Date.now();
  if (state.litUntil > now) {
    const t = Math.min(1, ((state.litUntil - now) / ttl) * 1.15);
    value = Math.max(value, base + (1 - base) * t);
  }
  // Quantized steps: memory crumbles in visible grains, and the DOM repaints
  // less often, which keeps the canvas captures cheap.
  return Math.round(value * 16) / 16;
}

function notify() {
  for (const cb of tickCallbacks) cb();
}

function tick() {
  notify();
  if (tickCallbacks.size === 0 && tickTimer !== undefined) {
    window.clearInterval(tickTimer);
    tickTimer = undefined;
  }
}

/** Register a brightness refresh callback. Returns an unregister function. */
export function onTick(callback: () => void): () => void {
  tickCallbacks.add(callback);
  if (tickTimer === undefined) {
    tickTimer = window.setInterval(tick, TICK_MS);
  }
  return () => {
    tickCallbacks.delete(callback);
  };
}
