import React from "react";
import RagIcon from "./RagIcon.jsx";
import { RAG_LABEL } from "../utils.js";

// Legend for the RAGP status icons on the dashboard cards. Uses the same
// RagIcon (shape + colour) that each card shows, so the mapping is unambiguous.
const LEGEND = [
  { level: "green"},
  { level: "amber"},
  { level: "red"},
  { level: "purple"},
];

export default function RagLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-200/80 bg-white/70 px-6 py-2.5 backdrop-blur">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Status legend
      </span>
      {LEGEND.map((it) => (
        <span key={it.level} className="inline-flex items-center gap-2" title={it.desc}>
          <RagIcon level={it.level} size={15} title={RAG_LABEL[it.level]} />
          <span className="text-xs font-semibold text-slate-700">{RAG_LABEL[it.level]}</span>
          <span className="hidden text-[11px] text-slate-400 lg:inline">· {it.desc}</span>
        </span>
      ))}
    </div>
  );
}
