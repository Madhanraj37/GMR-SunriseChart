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

export function PhaseHeaders() {
  return (
    <>
      {["Establish", "Enhance", "Optimize"].map((phase) => {
        const band = PHASE_BANDS[phase];
        const width = band.x1 - band.x0;
        return (
          <div
            key={phase}
            className="absolute flex items-center justify-center font-bold tracking-wide text-white select-none"
            style={{
              left: band.x0,
              top: 16,
              width,
              height: HEADER_H,
              background: PHASE_COLORS[phase].header,
              fontSize: 22,
              letterSpacing: "0.02em",
              boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)",
              zIndex: 12,
            }}
          >
            {phase}
          </div>
        );
      })}
    </>
  );
}

export function AxisLabels() {
  return (
    <>
      <div
        className="absolute font-bold tracking-[0.2em] text-[#1A2F5C] select-none"
        style={{
          left: 38,
          top: HEADER_H + 160,
          fontSize: 16,
          transform: "rotate(-90deg)",
          transformOrigin: "left top",
          zIndex: 14,
        }}
      >
        PEOPLE
      </div>
      <div
        className="absolute font-bold tracking-[0.2em] text-[#1A2F5C] select-none"
        style={{
          left: 38,
          top: HEADER_H + 365,
          fontSize: 16,
          transform: "rotate(-90deg)",
          transformOrigin: "left top",
          zIndex: 14,
        }}
      >
        PROCESS
      </div>
      <div
        className="absolute font-bold tracking-[0.2em] text-[#1A2F5C] select-none"
        style={{
          left: LEFT_GUTTER + 60,
          top: CANVAS_H - BOTTOM_LABEL + 10,
          fontSize: 16,
          zIndex: 14,
        }}
      >
        TECHNOLOGY
      </div>
    </>
  );
}

export function GMRBadge() {
  return (
    <div
      className="absolute rounded-full flex flex-col items-center justify-center text-white font-bold shadow-2xl select-none"
      style={{
        left: CANVAS_W - 180,
        top: HEADER_H + 28,
        width: 152,
        height: 152,
        background:
          "radial-gradient(circle at 30% 30%, #FFB347, #EE8A1A 70%, #D67200)",
        fontSize: 23,
        lineHeight: 1.05,
        letterSpacing: "0.02em",
        boxShadow:
          "0 12px 32px rgba(238,138,26,0.45), inset 0 -4px 12px rgba(0,0,0,0.15)",
        zIndex: 16,
      }}
    >
      <span>GMR</span>
      <span>GCC</span>
    </div>
  );
}
