"use client";

import type { CSSProperties, ReactNode, ElementType, JSX } from "react";

/* ============================================================
   HEAT GLOW
   Portable, self-contained composite-gradient surface used as
   the hero treatment on this site. Copy the whole file into
   any React project (Next.js / Vite / CRA — no extra config).
   Theme by passing a palette, or use one of the exported ones.

   Three stacked layers do the work:
     1. Base linear gradient (3 stops, configurable angle).
     2. Two radial highlights — a warm one anchored bottom-right
        and a soft-white "specular" one anchored top-left.
     3. SVG fractal-noise overlay at `mix-blend-mode: overlay`
        so the gradient gets organic texture instead of looking
        flat / digital.

   The component uses real DOM layers (not ::before/::after)
   so it has zero CSS-module / Tailwind / global-CSS dependency
   — drop it into anything.

   USAGE
   -----
   import { HeatGlow, HEAT_PALETTE, OCEAN_PALETTE } from "./HeatGlow";

   <HeatGlow style={{ padding: 80, borderRadius: 24 }}>
     <h1>Hello.</h1>
   </HeatGlow>

   <HeatGlow palette={OCEAN_PALETTE}>...</HeatGlow>

   <HeatGlow
     palette={{
       base: ["#5fb14a", "#2e7d32", "#0b3d0b"],
       warmHighlight: "#a5d68a",
     }}
   >
     ...
   </HeatGlow>

   Any extra props (`as`, `className`, `onClick`, etc) pass
   through to the outer element.
   ============================================================ */

export type GlowPalette = {
  /** Three-stop linear gradient base. Stops sit at 0% / 50% / 100%. */
  base: [string, string, string];
  /** Angle (deg) for the base linear gradient. Default 135. */
  baseAngle?: number;
  /**
   * Warm radial highlight anchored bottom-right. This is the
   * colour that gives the gradient its glow.
   */
  warmHighlight: string;
  /**
   * Soft "specular" highlight anchored top-left. Usually a
   * white-tinted rgba so the panel has a subtle glass feel.
   * Default: rgba(255, 255, 255, 0.12).
   */
  brightHighlight?: string;
  /**
   * Noise overlay opacity (0–1). Default 0.7. Drop to 0 to
   * disable the noise layer.
   */
  noiseOpacity?: number;
};

/* ---------- Preset palettes ---------- */

/** The MakersForge heat palette. Default. */
export const HEAT_PALETTE: GlowPalette = {
  base: ["#ff7a2b", "#ff3c00", "#7a1f00"],
  baseAngle: 135,
  warmHighlight: "#ffb347",
  brightHighlight: "rgba(255, 255, 255, 0.12)",
  noiseOpacity: 0.7,
};

/** Cool blue. */
export const OCEAN_PALETTE: GlowPalette = {
  base: ["#2bc7ff", "#0066ff", "#001f7a"],
  baseAngle: 135,
  warmHighlight: "#47c2ff",
  brightHighlight: "rgba(255, 255, 255, 0.12)",
};

/** Deep green. */
export const FOREST_PALETTE: GlowPalette = {
  base: ["#5fb14a", "#2e7d32", "#0b3d0b"],
  baseAngle: 135,
  warmHighlight: "#a5d68a",
  brightHighlight: "rgba(255, 255, 255, 0.12)",
};

/** Royal purple → indigo. */
export const NIGHT_PALETTE: GlowPalette = {
  base: ["#5b41a1", "#2e1a6b", "#0a052e"],
  baseAngle: 135,
  warmHighlight: "#9d72ff",
  brightHighlight: "rgba(255, 255, 255, 0.12)",
};

/** Pink → magenta. */
export const ROSE_PALETTE: GlowPalette = {
  base: ["#ff7eb3", "#d6336c", "#5a0a2d"],
  baseAngle: 135,
  warmHighlight: "#ffb3d1",
  brightHighlight: "rgba(255, 255, 255, 0.12)",
};

/**
 * Shiftly calling-card palette. Brand pink (#FF1F7D) drives the
 * gradient stops and warm highlight, deepening to near-maroon.
 */
export const SHIFTLY_PALETTE: GlowPalette = {
  // Bottom-right stop stays a vivid deep pink (was a dark maroon #4D0026, which
  // blended muddily under the warm glow). Brighter warm highlight so the corner
  // reads slightly lighter than the main pink, like the reference.
  base: ["#FF5BA0", "#FF1F7D", "#C20D5C"],
  baseAngle: 135,
  warmHighlight: "#FFA8C7",
  brightHighlight: "rgba(255, 255, 255, 0.12)",
  noiseOpacity: 0.6,
};

/* ---------- SVG noise ---------- */
/**
 * Inline SVG noise data URL. Self-contained, no external file.
 * Encoded once here so the component has no asset dependency.
 */
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E" +
  "%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3'/%3E" +
  "%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0'/%3E%3C/filter%3E" +
  "%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/* ---------- Component ---------- */

type HeatGlowProps = {
  children?: ReactNode;
  palette?: GlowPalette;
  className?: string;
  style?: CSSProperties;
  /** Wrapper element. Defaults to `div`. */
  as?: keyof JSX.IntrinsicElements;
};

export function HeatGlow({
  children,
  palette = HEAT_PALETTE,
  className,
  style,
  as = "div",
  ...rest
}: HeatGlowProps & Record<string, unknown>) {
  const angle = palette.baseAngle ?? 135;
  const [c1, c2, c3] = palette.base;
  const warm = palette.warmHighlight;
  const bright = palette.brightHighlight ?? "rgba(255, 255, 255, 0.12)";
  const noiseOp = palette.noiseOpacity ?? 0.7;

  const wrapperStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    color: "#fff",
    background: `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`,
    ...style,
  };

  const layerBase: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
  };

  const Tag = as as ElementType;

  return (
    <Tag className={className} style={wrapperStyle} {...rest}>
      {/* 1. Highlight layer, warm bottom-right + soft white top-left. */}
      <div
        aria-hidden="true"
        style={{
          ...layerBase,
          background: [
            `radial-gradient(ellipse at 80% 110%, ${warm} 0%, transparent 50%)`,
            `radial-gradient(ellipse at 0% 0%, ${bright} 0%, transparent 40%)`,
          ].join(", "),
        }}
      />
      {/* 2. Noise layer. SVG turbulence, overlay-blended. */}
      <div
        aria-hidden="true"
        style={{
          ...layerBase,
          backgroundImage: `url("${NOISE_SVG}")`,
          mixBlendMode: "overlay",
          opacity: noiseOp,
        }}
      />
      {/* 3. Content sits above the gradient/noise layers. */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </Tag>
  );
}
