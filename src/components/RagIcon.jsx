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
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `0 0 0 ${ring}px rgba(255,255,255,0.9), 0 1px 3px rgba(15,23,42,0.28)`,
      }}
      title={tip}
      aria-label={tip}
    />
  );
}
