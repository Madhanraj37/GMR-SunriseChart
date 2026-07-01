import React from "react";
import {
  Zap,
  Search,
  ShieldCheck,
  Lightbulb,
  UserCheck,
  User,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { riskLevel, RISK_COLORS, RISK_LABEL } from "../utils.js";

// Project brand blue (the "Optimize" phase colour) — used as the single accent.
const BRAND = "#00437A";

// Risk level → distinct shape (matches the RAGP icons) + tint.
const LEVEL_ICON = { high: AlertOctagon, medium: AlertTriangle, low: CheckCircle2 };
const LEVEL_TINT = {
  high: { bg: "#fef2f2", ring: "#f7d4d4" },
  medium: { bg: "#fff8ec", ring: "#f6e2bd" },
  low: { bg: "#effaf1", ring: "#c9ecd2" },
};

// One labelled field row with a meaningful icon. Renders nothing when empty.
function Row({ Icon, label, value, highlight }) {
  if (!value) return null;
  return (
    <div
      className={
        highlight
          ? "-mx-4 mt-1 flex gap-3 rounded-xl px-4 py-3"
          : "flex gap-3 border-b border-slate-100 py-3 last:border-b-0"
      }
      style={highlight ? { background: "#f0f6fb" } : undefined}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: highlight ? "#dcebf6" : "rgba(0,67,122,0.09)", color: BRAND }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <div
          className="text-[10.5px] font-bold uppercase tracking-[0.1em]"
          style={{ color: highlight ? BRAND : "#94a3b8" }}
        >
          {label}
        </div>
        <div className="mt-1 text-[13.5px] leading-relaxed text-slate-700">{value}</div>
      </div>
    </div>
  );
}

// Accountable / Responsible with a person icon.
function Person({ Icon, role, name, bg }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: bg }}
      >
        <Icon className="h-[19px] w-[19px]" />
      </span>
      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400">
          {role}
        </div>
        <div className="text-[13px] font-semibold text-slate-700">{name}</div>
      </div>
    </div>
  );
}

export default function RiskCard({ risk }) {
  const level = riskLevel(risk);
  const color = RISK_COLORS[level];
  const tint = LEVEL_TINT[level];
  const LevelIcon = LEVEL_ICON[level];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* Header: RPN · Failure Mode · Risk level */}
      <div className="flex items-center gap-3.5 border-b border-slate-100 px-4 py-3.5">
        <span
          className="flex h-[60px] w-[60px] shrink-0 flex-col items-center justify-center rounded-2xl"
          style={{ background: tint.bg, boxShadow: `inset 0 0 0 1.5px ${tint.ring}` }}
        >
          <span className="text-xl font-extrabold tabular-nums leading-none" style={{ color }}>
            {risk.rpn || "—"}
          </span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
            RPN
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
            Failure Mode
          </div>
          <div className="mt-0.5 text-[15px] font-bold leading-snug text-slate-900">
            {risk.failureMode}
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ color, background: tint.bg, boxShadow: `inset 0 0 0 1px ${tint.ring}` }}
        >
          <LevelIcon className="h-[15px] w-[15px]" />
          {RISK_LABEL[level]} Risk
        </span>
      </div>

      {/* Fields */}
      <div className="px-4 py-1">
        <Row Icon={Zap} label="Effect on Customer / Process" value={risk.effect} />
        <Row Icon={Search} label="Cause(s)" value={risk.cause} />
        <Row Icon={ShieldCheck} label="Current Controls" value={risk.controls} />
        <Row Icon={Lightbulb} label="Recommended Action" value={risk.recommended} highlight />
      </div>

      {/* People */}
      {(risk.accountable || risk.responsible) && (
        <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3.5">
          <Person Icon={UserCheck} role="Accountable" name={risk.accountable} bg={BRAND} />
          <Person Icon={User} role="Responsible" name={risk.responsible} bg="#64748b" />
        </div>
      )}
    </div>
  );
}
