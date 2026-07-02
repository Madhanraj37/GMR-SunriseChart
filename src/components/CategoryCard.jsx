import React from "react";
import { motion } from "framer-motion";
import RagIcon from "./RagIcon.jsx";
import { HEADER_H } from "../constants.js";
import { headerRag, headerRagTooltip } from "../utils.js";

/**
 * CategoryCard
 * Compact card rendering only the title + progress circle.
 * Task list and statuses are revealed via TooltipModal on hover.
 */
export default function CategoryCard({
  item,
  position,
  onHover,
  onLeave,
  isActive,
  index,
  onClick,
}) {
  const { category, locked, lockedMessage } = item;
  const rag = headerRag(item.initiatives);

  // Width caps prevent overlap with curves
  const maxWidth =
    item.phase === "Optimize" ? 130 : item.phase === "Enhance" ? 140 : 142;

  return (
    <motion.div
      className="absolute cursor-pointer select-none"
      style={{
        left: position.x,
        top: position.y + HEADER_H,
        width: maxWidth,
        zIndex: isActive ? 30 : 5,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.05 * index,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={(e) => onHover(item, e)}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.06 }}
    >
      {/* RAG dot to the left of the title, vertically centered on the FIRST
          line. The wrapper's height matches the first line box (fontSize 14 ×
          leading-tight 1.25 = 17.5px) so the dot centers on line 1 even when
          the title wraps. items-start on the row keeps it pinned to line 1. */}
      <div className="flex items-start gap-1.5">
        <span
          className="flex shrink-0 items-center"
          style={{ height: 17.5, fontSize: 14 }}
        >
          <RagIcon
            level={rag}
            size={17}
            title={headerRagTooltip(item.initiatives)}
          />
        </span>
        <div
          className="flex-1 text-white font-semibold decoration-white/70 underline-offset-0 leading-tight italic"
          style={{
            fontSize: 14,
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            textDecorationLine: "underline",
          }}
          onClick={() => onClick?.(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClick?.(item);
          }}
        >
          {category}
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
