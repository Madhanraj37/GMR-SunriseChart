import React from "react";
import {
  PHASE_COLORS,
  PHASE_BANDS,
  CANVAS_W,
  CANVAS_H,
  HEADER_H,
  LEFT_GUTTER,
  BOTTOM_LABEL,
} from "../constants.js";

export function PhaseHeaders({ getPosition, onDragStart }) {
  return (
    <>
      {["Establish", "Enhance", "Optimize"].map((phase) => {
        const band = PHASE_BANDS[phase];
        const width = band.x1 - band.x0;
        const key = `overlay::phase::${phase}`;
        const position = getPosition(key, { x: band.x0, y: 28 });
        return (
          <div
            key={phase}
            className="absolute flex items-center justify-center font-bold tracking-wide text-white cursor-move select-none"
            style={{
              left: position.x,
              top: position.y,
              width,
              height: HEADER_H,
              background: PHASE_COLORS[phase].header,
              fontSize: 22,
              letterSpacing: "0.02em",
              boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)",
              touchAction: "none",
              zIndex: 12,
            }}
            data-drag-x={position.x}
            data-drag-y={position.y}
            onPointerDown={(e) => onDragStart(key, e)}
          >
            {phase}
          </div>
        );
      })}
    </>
  );
}

export function AxisLabels({ getPosition, onDragStart }) {
  const people = getPosition("overlay::axis::people", { x: 38, y: HEADER_H + 154 });
  const process = getPosition("overlay::axis::process", { x: 38, y: HEADER_H + 356 });
  const technology = getPosition("overlay::axis::technology", {
    x: LEFT_GUTTER + 60,
    y: CANVAS_H - BOTTOM_LABEL + 12,
  });

  return (
    <>
      <div
        className="absolute font-bold tracking-[0.2em] text-[#1A2F5C] cursor-move select-none"
        style={{
          left: people.x,
          top: people.y,
          fontSize: 13,
          transform: "rotate(-90deg)",
          transformOrigin: "left top",
          touchAction: "none",
          zIndex: 14,
        }}
        data-drag-x={people.x}
        data-drag-y={people.y}
        onPointerDown={(e) => onDragStart("overlay::axis::people", e)}
      >
        PEOPLE
      </div>
      <div
        className="absolute font-bold tracking-[0.2em] text-[#1A2F5C] cursor-move select-none"
        style={{
          left: process.x,
          top: process.y,
          fontSize: 13,
          transform: "rotate(-90deg)",
          transformOrigin: "left top",
          touchAction: "none",
          zIndex: 14,
        }}
        data-drag-x={process.x}
        data-drag-y={process.y}
        onPointerDown={(e) => onDragStart("overlay::axis::process", e)}
      >
        PROCESS
      </div>
      <div
        className="absolute font-bold tracking-[0.2em] text-[#1A2F5C] cursor-move select-none"
        style={{
          left: technology.x,
          top: technology.y,
          fontSize: 13,
          touchAction: "none",
          zIndex: 14,
        }}
        data-drag-x={technology.x}
        data-drag-y={technology.y}
        onPointerDown={(e) => onDragStart("overlay::axis::technology", e)}
      >
        TECHNOLOGY
      </div>
    </>
  );
}

export function GMRBadge({ getPosition, onDragStart }) {
  const position = getPosition("overlay::badge::gmr", {
    x: CANVAS_W - 180,
    y: HEADER_H + 26,
  });

  return (
    <div
      className="absolute rounded-full flex flex-col items-center justify-center text-white font-bold shadow-2xl cursor-move select-none"
      style={{
        left: position.x,
        top: position.y,
        width: 152,
        height: 152,
        background:
          "radial-gradient(circle at 30% 30%, #FFB347, #EE8A1A 70%, #D67200)",
        fontSize: 23,
        lineHeight: 1.05,
        letterSpacing: "0.02em",
        boxShadow:
          "0 12px 32px rgba(238,138,26,0.45), inset 0 -4px 12px rgba(0,0,0,0.15)",
        touchAction: "none",
        zIndex: 16,
      }}
      data-drag-x={position.x}
      data-drag-y={position.y}
      onPointerDown={(e) => onDragStart("overlay::badge::gmr", e)}
    >
      <span>GMR</span>
      <span>GCC</span>
    </div>
  );
}
