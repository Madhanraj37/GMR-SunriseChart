import React from "react";
import { getRagColor, RAG_LABEL, RAG_ACTIONS_DESC } from "../utils.js";

// RAGP status indicator — a solid colored dot per state:
//   green → On track · amber → Needs attention · red → At risk · purple → Not started
//
// A thin white ring plus a soft shadow keeps the dot readable on ANY
// background, including when it sits over a same-colored fill (e.g. a red dot
// on the red phase band of the sunrise chart).

// Tooltip text: an explicit `title` always wins (topic icons pass one computed
// from their initiative counts). Otherwise scope="actions" describes a single
// initiative rolled up from its actions; failing that we use the short label.
const SCOPE_DESC = {
  actions: RAG_ACTIONS_DESC,
};

export default function RagIcon({ level, size = 40, title, scope }) {
  const color = getRagColor(level);
  const tip =
    title || SCOPE_DESC[scope]?.[level] || RAG_LABEL[level] || `${level} status`;
  const ring = Math.max(1, Math.round(size * 0.08)); // white separator ring
  const drop = Math.max(1, Math.round(size * 0.09)); // drop-shadow offset/blur
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        // Layered gradients turn the flat dot into a glossy 3D sphere and work
        // for ANY base color (no per-color math): a top-left specular
        // highlight and a bottom-right shade sit over the solid RAG color.
        backgroundColor: color,
        backgroundImage: [
          "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9), rgba(255,255,255,0) 42%)",
          "radial-gradient(circle at 68% 80%, rgba(0,0,0,0.45), rgba(0,0,0,0) 58%)",
        ].join(","),
        boxShadow: [
          `inset 0 ${Math.round(size * 0.05)}px ${Math.round(size * 0.1)}px rgba(255,255,255,0.35)`, // top inner glow
          `inset 0 -${Math.round(size * 0.06)}px ${Math.round(size * 0.14)}px rgba(0,0,0,0.35)`, // bottom inner shade
          `0 0 0 ${ring}px rgba(255,255,255,0.9)`, // white separator ring
          `0 ${drop}px ${drop * 2}px rgba(15,23,42,0.45)`, // drop shadow for lift
        ].join(","),
      }}
      title={tip}
      aria-label={tip}
    />
  );
}
