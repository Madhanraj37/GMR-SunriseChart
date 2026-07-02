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

// Overall timeline duration shown as a single band above all phase headers.
const TIMELINE_LABEL = "12 to 18 Months";

export function PhaseHeaders() {
  // The duration band spans the full width of the three phase headers.
  const spanX0 = PHASE_BANDS.Establish.x0;
  const spanX1 = PHASE_BANDS.Optimize.x1;
  return (
    <>
      {/* Overall duration — a single band directly above the phase headers */}
      <div
        className="absolute flex items-center justify-center font-bold tracking-wide text-[#1A2F5C] select-none"
        style={{
          left: spanX0,
          top: -8,
          width: spanX1 - spanX0,
          height: 34,
          background: "#EFF1F4",
          fontSize: 15,
          letterSpacing: "0.02em",
          zIndex: 12,
        }}
      >
        {TIMELINE_LABEL}
      </div>

      {["Establish", "Enhance", "Optimize"].map((phase) => {
        const band = PHASE_BANDS[phase];
        const width = band.x1 - band.x0;
        return (
          <React.Fragment key={phase}>
            {/* Phase header */}
            <div
              className="absolute flex items-center justify-center font-bold tracking-wide text-white select-none"
              style={{
                left: band.x0,
                top: 28,
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
          </React.Fragment>
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
          top: HEADER_H + 450,
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
