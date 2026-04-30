import React from "react";
import {
  PHASE_COLORS,
  CANVAS_W,
  CANVAS_H,
  HEADER_H,
  LEFT_GUTTER,
  BOTTOM_LABEL,
} from "../constants.js";

export default function PhaseBackground() {
  const top = HEADER_H + 48;
  const bottom = CANVAS_H - BOTTOM_LABEL;
  const left = LEFT_GUTTER;
  const right = CANVAS_W - 58;

  const b1Top = 410;
  const b1Bot = 596;

  const b2Top = 752;
  const b2Bot = 990;

  const boundary1Curve = `
    C 390 ${top + 150},
      420 ${bottom - 168},
      ${b1Bot} ${bottom}
  `;

  const boundary2Curve = `
    C 738 ${top + 154},
      790 ${bottom - 172},
      ${b2Bot} ${bottom}
  `;

  const boundary1 = `M ${b1Top} ${top} ${boundary1Curve}`;
  const boundary2 = `M ${b2Top} ${top} ${boundary2Curve}`;

  const enhanceInnerCurve = `
    M 574 ${top}
    C 562 ${top + 146},
      604 ${bottom - 176},
      762 ${bottom}
  `;

  const pathEstablish = `
    M ${left} ${top}
    L ${b1Top} ${top}
    ${boundary1Curve}
    L ${left} ${bottom}
    Z
  `;

  const pathEnhance = `
    M ${b1Top} ${top}
    L ${b2Top} ${top}
    ${boundary2Curve}
    L ${b1Bot} ${bottom}
    C 420 ${bottom - 168},
      390 ${top + 150},
      ${b1Top} ${top}
    Z
  `;

  const pathOptimize = `
    M ${b2Top} ${top}
    L ${right} ${top}
    L ${right} ${bottom}
    L ${b2Bot} ${bottom}
    C 790 ${bottom - 172},
      738 ${top + 154},
      ${b2Top} ${top}
    Z
  `;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="grad-establish" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PHASE_COLORS.Establish.from} />
          <stop offset="100%" stopColor={PHASE_COLORS.Establish.to} />
        </linearGradient>
        <linearGradient id="grad-enhance" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PHASE_COLORS.Enhance.from} />
          <stop offset="100%" stopColor={PHASE_COLORS.Enhance.to} />
        </linearGradient>
        <linearGradient id="grad-optimize" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PHASE_COLORS.Optimize.from} />
          <stop offset="100%" stopColor={PHASE_COLORS.Optimize.to} />
        </linearGradient>
        <clipPath id="clip-content">
          <rect x={left} y={top} width={right - left} height={bottom - top} />
        </clipPath>
      </defs>

      <path d={pathEstablish} fill="url(#grad-establish)" />
      <path d={pathEnhance} fill="url(#grad-enhance)" />
      <path d={pathOptimize} fill="url(#grad-optimize)" />

      <g
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d={boundary1} />
        <path d={enhanceInnerCurve} />
        <path d={boundary2} />
      </g>

      <g clipPath="url(#clip-content)">
        <line
          x1={left + 10}
          y1={top + 252}
          x2={right - 62}
          y2={top + 52}
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="2.4"
          strokeDasharray="1 6"
          strokeLinecap="round"
        />
        <line
          x1={left + 10}
          y1={bottom - 4}
          x2={right - 28}
          y2={top + 122}
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="2.4"
          strokeDasharray="1 6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
