import React from "react";
import { motion } from "framer-motion";
import ProgressCircle from "./ProgressCircle.jsx";
import { PHASE_COLORS, STATUS_META } from "../constants.js";

export default function TooltipModal({ item, anchor, containerRect }) {
  if (!item || !anchor || !containerRect) return null;

  const TT_W = 340;
  const TT_H_MAX = 360;
  const margin = 14;

  // Position tooltip — try right of anchor, flip left if overflow
  let left = anchor.right - containerRect.left + margin;
  let top = anchor.top - containerRect.top;

  if (left + TT_W > containerRect.width - 10) {
    left = anchor.left - containerRect.left - TT_W - margin;
  }
  if (left < 10) left = 10;
  if (top + TT_H_MAX > containerRect.height - 10) {
    top = containerRect.height - TT_H_MAX - 10;
  }
  if (top < 10) top = 10;

  const phaseColor = PHASE_COLORS[item.phase].solid;

  return (
    <motion.div
      className="absolute z-50 pointer-events-none"
      style={{ left, top, width: TT_W }}
      initial={{ opacity: 0, scale: 0.94, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="rounded-xl overflow-hidden border backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.98)",
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.22), 0 4px 14px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3" style={{ background: phaseColor }}>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
            >
              {item.phase} · {item.dimension}
            </span>
          </div>
          <div
            className="text-white font-bold mt-1 leading-tight"
            style={{ fontSize: 14 }}
          >
            {item.category}
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-2.5 flex items-center gap-3 border-b border-slate-100">
          <ProgressCircle pct={item.stats.pct} size={42} />
          <div className="flex-1 grid grid-cols-3 gap-1.5 text-center">
            {["done", "inprogress", "todo"].map((k) => {
              const count =
                k === "done"
                  ? item.stats.done
                  : k === "inprogress"
                  ? item.stats.inprog
                  : item.stats.todo;
              const meta = STATUS_META[k];
              return (
                <div
                  key={k}
                  className="rounded-md py-1 px-1"
                  style={{ background: meta.bg }}
                >
                  <div
                    className="text-[15px] font-bold"
                    style={{ color: meta.color }}
                  >
                    {count}
                  </div>
                  <div
                    className="text-[9px] uppercase tracking-wider font-semibold"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {item.locked ? (
          <div className="px-4 py-4 text-sm text-slate-600">
            {item.lockedMessage || "Yet to begin. Complete the first two phases to unlock this phase."}
          </div>
        ) : (
          <div className="max-h-[260px] overflow-y-auto px-2 py-2 thin-scroll">
            {(item.initiatives || []).map((ini, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                <span
                  className="mt-1.5 inline-block rounded-full shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    background: phaseColor,
                  }}
                />
                <span className="text-[12px] text-slate-700 leading-snug">
                  {ini.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
