import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Hourglass,
  ListChecks,
  MoreVertical,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";

import {
  computeStats,
  parseDate,
  taskStartDate,
  taskEndDate,
  isOverdue,
  RAG_COLORS,
  RAG_LABEL,
  initiativeRag,
  headerRag,
  getProgressColor,
} from "../utils.js";
import RagIcon from "./RagIcon.jsx";
import RiskRegister from "./RiskRegister.jsx";

const statusLabel = (status) => {
  if (status === "done") return "Completed";
  if (status === "inprogress") return "In progress";
  return "To do";
};

// Status pill styling — In progress is orange, Done is green, To do is grey.
const STATUS_STYLES = {
  done: { bg: "bg-emerald-100", text: "text-emerald-700", bar: "#10b981", Icon: CheckCircle2 },
  inprogress: { bg: "bg-orange-100", text: "text-orange-700", bar: "#f97316", Icon: Clock },
  todo: { bg: "bg-slate-100", text: "text-slate-600", bar: "#cbd5e1", Icon: Circle },
};

const taskAccountable = (task) =>
  task.assignee ||
  task.details?.Accountable ||
  task.details?.accountable ||
  task.details?.Owner ||
  task.details?.owner ||
  "";

const formatDate = (value) => {
  const d = parseDate(value);
  if (!d) return value || "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Display order for actions: Completed → In progress → Delayed → To do.
// "Delayed" is its own bucket (overdue and not yet done).
const actionRank = (task) => {
  if (task.status === "done") return 0;
  if (isOverdue(task.status, taskEndDate(task))) return 2;
  if (task.status === "inprogress") return 1;
  return 3;
};
const byActionOrder = (a, b) => actionRank(a) - actionRank(b);

const getInitials = (name, email) => {
  const s = String(name || email || "?").trim();
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
};

// Thin progress ring (no fill) used for the overall progress indicator.
function Ring({ pct, size = 46, stroke = 5, color = "#2563eb" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function StatCard({ Icon, value, label, bg, fg }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-5 w-5 ${fg}`} />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-extrabold leading-none text-slate-900">{value}</div>
        <div className="mt-1 text-xs font-medium leading-tight text-slate-500">
          {(() => {
            const [first, ...rest] = label.split(" ");
            return (
              <>
                <div>{first}</div>
                {rest.length ? <div>{rest.join(" ")}</div> : null}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// One action card with a clickable Outcome reveal and an overdue warning.
function ActionRow({ task }) {
  const [showOutcome, setShowOutcome] = useState(false);

  const status = STATUS_STYLES[task.status] || STATUS_STYLES.todo;
  const StatusIcon = status.Icon;
  const start = taskStartDate(task);
  const end = taskEndDate(task);
  const overdue = isOverdue(task.status, end);
  const accountable = taskAccountable(task);
  const outcome = task.outcome || "";

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-3"
      style={{ borderLeft: `4px solid ${status.bar}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[15px] font-bold text-slate-900">{task.task}</div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusLabel(task.status)}
            </span>
            {overdue && (
              <span className="group relative inline-flex items-center">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-max max-w-[220px] -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block">
                  Deadline has passed. Immediate action is required.
                </span>
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              {formatDate(start)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5 text-slate-400" />
              <span className={overdue ? "font-semibold text-rose-600" : ""}>
                {formatDate(end)}
              </span>
            </span>
            {accountable ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{accountable}</span>
                <span className="text-slate-400">(Accountable)</span>
              </span>
            ) : null}
            {outcome ? (
              <button
                type="button"
                onClick={() => setShowOutcome((v) => !v)}
                aria-expanded={showOutcome}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-600 transition-colors hover:text-slate-900"
              >
                <Target className="h-3.5 w-3.5 text-slate-400" />
                Outcome
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    showOutcome ? "rotate-180" : ""
                  }`}
                />
              </button>
            ) : null}
          </div>

          {showOutcome && outcome ? (
            <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {outcome}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="More"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Expanded or collapsed initiative block.
function InitiativeBlock({ initiative, expanded, onToggle }) {
  const [tab, setTab] = useState("actions");
  const stats = initiative.stats || computeStats(initiative.tasks);
  const pct = stats.pct;
  const progressColor = getProgressColor(pct);
  const outcome = initiative.tasks?.[0]?.outcome || "";
  const rag = initiativeRag(initiative);
  const risks = initiative.risks || [];
  const hasRisks = risks.length > 0;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50/70"
      >
        <RagIcon level={rag} size={32} title={RAG_LABEL[rag]} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-900">{initiative.name}</div>
          {outcome ? (
            <div className="truncate text-sm text-slate-500">{outcome}</div>
          ) : null}
        </div>
        <div className="hidden w-44 shrink-0 sm:block">
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm font-bold" style={{ color: progressColor }}>
              {pct}%
            </span>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            {stats.done} / {stats.total} Actions Completed
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: progressColor }}
            />
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
      </button>
    );
  }

  const orderedTasks = [...initiative.tasks].sort(byActionOrder);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white"
      style={{ borderLeft: `4px solid ${RAG_COLORS[rag]}` }}
    >
      <div className="flex items-start gap-4 p-4">
        <RagIcon level={rag} size={32} title={RAG_LABEL[rag]} />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold text-slate-900">{initiative.name}</div>
          {outcome ? <div className="text-sm text-slate-500">{outcome}</div> : null}
        </div>
        <div className="hidden w-56 shrink-0 sm:block">
          <div className="text-right text-2xl font-extrabold" style={{ color: progressColor }}>
            {pct}%
          </div>
          <div className="text-right text-xs text-slate-400">
            {stats.done} / {stats.total} Actions Completed
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: progressColor }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-50"
          aria-label="Collapse"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </div>

      {hasRisks ? (
        <div className="flex gap-1 border-b border-slate-200 px-4">
          <TabButton
            active={tab === "actions"}
            onClick={() => setTab("actions")}
            Icon={ListChecks}
            label="Actions"
            count={stats.total}
          />
          <TabButton
            active={tab === "risks"}
            onClick={() => setTab("risks")}
            Icon={ShieldAlert}
            label="FMEA"
          />
        </div>
      ) : null}

      {hasRisks && tab === "risks" ? (
        <div className="bg-slate-50/60 px-4 py-4">
          <RiskRegister initiative={initiative} />
        </div>
      ) : (
        <div className="space-y-3 px-4 pb-4 pt-4">
          {orderedTasks.map((task, idx) => (
            <ActionRow key={`${initiative.name}-${idx}-${task.task}`} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

// Segmented tab used inside an expanded initiative (Actions | Risks).
function TabButton({ active, onClick, Icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-[#00437A] text-[#00437A]"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count != null ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-[#00437A] text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function HeaderDetailView({ item, onBack, userName, userEmail }) {
  const initiatives = item?.initiatives || [];
  const [openInitiative, setOpenInitiative] = useState(
    initiatives[0]?.name || null
  );

  if (!item) return null;

  const allTasks = item.tasks || [];
  const stats = computeStats(allTasks);
  const delayed = allTasks.filter((t) => isOverdue(t.status, taskEndDate(t))).length;
  const headerLevel = headerRag(initiatives);

  const toggleInitiative = (name) =>
    setOpenInitiative((prev) => (prev === name ? null : name));

  const statCards = [
    { Icon: Briefcase, value: initiatives.length, label: "Initiatives", bg: "bg-violet-100", fg: "text-violet-500" },
    { Icon: ListChecks, value: stats.total, label: "Total Actions", bg: "bg-blue-100", fg: "text-blue-500" },
    { Icon: CheckCircle2, value: stats.done, label: "Action Completed", bg: "bg-emerald-100", fg: "text-emerald-500" },
    { Icon: Clock, value: stats.inprog, label: "Action In Progress", bg: "bg-orange-100", fg: "text-orange-500" },
    { Icon: Hourglass, value: stats.todo, label: "Action Not Started", bg: "bg-amber-100", fg: "text-amber-500" },
    { Icon: AlertCircle, value: delayed, label: "Action Delayed", bg: "bg-rose-100", fg: "text-rose-500" },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 p-2 sm:p-4">
      <div className="mx-auto flex max-w-[1600px] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
        {/* Sidebar */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/40 p-4 lg:flex">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>

          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Initiatives
          </div>

          <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
            {initiatives.map((ini) => {
              const pct = ini.stats?.pct ?? 0;
              const progressColor = getProgressColor(pct);
              const rag = initiativeRag(ini);
              const ragColor = RAG_COLORS[rag];
              const active = openInitiative === ini.name;
              return (
                <button
                  key={ini.name}
                  type="button"
                  onClick={() => setOpenInitiative(ini.name)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? "" : "hover:bg-slate-100"
                  }`}
                  style={
                    active
                      ? { background: `${ragColor}1a`, boxShadow: `inset 3px 0 0 ${ragColor}` }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <RagIcon level={rag} size={20} title={RAG_LABEL[rag]} />
                      <span className="truncate text-sm font-medium text-slate-700">
                        {ini.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold" style={{ color: progressColor }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: progressColor }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 p-5 sm:p-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <RagIcon
                  level={headerLevel}
                  size={34}
                  title={`${RAG_LABEL[headerLevel]} — initiative health`}
                />
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {item.header}
                </h1>
                {/* Overall progress, right after the header */}
                {/* <div className="flex items-center gap-2">
                  <Ring pct={stats.pct} size={44} />
                  <div className="leading-none">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Overall
                    </div>
                    <div className="mt-0.5 text-xl font-extrabold text-blue-600">
                      {stats.pct}%
                    </div>
                  </div>
                </div> */}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Tracking {stats.total} actions across {initiatives.length}{" "}
                {initiatives.length === 1 ? "initiative" : "initiatives"} · {item.phase} ·{" "}
                {item.dimension}
              </p>
            </div>

            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "#1e293b" }}
              title={userEmail || userName || ""}
            >
              {getInitials(userName, userEmail)}
            </span>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {statCards.map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>

          {/* Initiatives */}
          {item.locked ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
              These actions will appear once the earlier phases are fully complete.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {initiatives.map((ini) => (
                <InitiativeBlock
                  key={ini.name}
                  initiative={ini}
                  expanded={openInitiative === ini.name}
                  onToggle={() => toggleInitiative(ini.name)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
