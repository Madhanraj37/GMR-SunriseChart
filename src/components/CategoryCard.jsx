import React from "react";
import { motion } from "framer-motion";
import ProgressCircle from "./ProgressCircle.jsx";
import { HEADER_H } from "../constants.js";

/**
 * CategoryCard
 * Compact card rendering only the title + progress circle.
 * Task list and statuses are revealed via TooltipModal on hover.
 */
export default function CategoryCard({
  item,
  position,
  onDragStart,
  onHover,
  onLeave,
  isActive,
  index,
}) {
  const { category, stats } = item;

  // Width caps prevent overlap with curves
  const maxWidth =
    item.phase === "Optimize" ? 150 : item.phase === "Enhance" ? 145 : 145;

  return (
    <motion.div
      className="absolute cursor-pointer select-none"
      style={{
        left: position.x,
        top: position.y + HEADER_H,
        width: maxWidth,
        zIndex: isActive ? 30 : 5,
        touchAction: "none",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.05 * index,
        ease: [0.16, 1, 0.3, 1],
      }}
      data-drag-x={position.x}
      data-drag-y={position.y}
      onPointerDown={(e) => onDragStart(item.key, e)}
      onMouseEnter={(e) => onHover(item, e)}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.06 }}
    >
      {/* Title */}
      <div
        className="text-white font-semibold decoration-white/70 underline-offset-0 leading-tight italic mx-10 -mt-2"
        style={{
          fontSize: 13,
          textShadow: "0 1px 2px rgba(0,0,0,0.35)",
        }}
      >
        {category}
      </div>

      {/* Progress + condensed counts */}
      <div className="mt-2 flex items-center gap-2">
        <ProgressCircle pct={stats.pct} size={42} />
        <div className="flex flex-col" style={{ fontSize: 9.5 }}>
          <span className="text-white/90 font-semibold">
            {stats.total} task{stats.total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-1 mt-0.5">
            <span
              className="px-1.5 rounded font-bold"
              title="Done"
              style={{
                background: "rgba(34,197,94,0.9)",
                color: "#fff",
                fontSize: 9,
              }}
            >
              {stats.done}
            </span>
            <span
              className="px-1.5 rounded font-bold"
              title="In Progress"
              style={{
                background: "rgba(245,158,11,0.9)",
                color: "#fff",
                fontSize: 9,
              }}
            >
              {stats.inprog}
            </span>
            <span
              className="px-1.5 rounded font-bold"
              title="To Do"
              style={{
                background: "rgba(239,68,68,0.9)",
                color: "#fff",
                fontSize: 9,
              }}
            >
              {stats.todo}
            </span>
          </div>
        </div>
      </div>

      {/* Hover glow */}
      <div
        className="absolute -inset-2 rounded-lg pointer-events-none transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.22), transparent 70%)",
          opacity: isActive ? 1 : 0,
        }}
      />
    </motion.div>
  );
}
