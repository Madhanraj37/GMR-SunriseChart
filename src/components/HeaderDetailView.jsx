import React from "react";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Circle,
  Clock,
  LayoutGrid,
  ListChecks,
} from "lucide-react";

import ProgressCircle from "./ProgressCircle.jsx";
import { computeStats, getProgressColor } from "../utils.js";
import { PHASE_COLORS } from "../constants.js";

const statusLabel = (status) => {
  if (status === "done") return "Completed";
  if (status === "inprogress") return "In progress";
  return "To do";
};

// Status pill styling — In progress is orange, Done is green, To do is grey.
const STATUS_STYLES = {
  done: { bg: "bg-emerald-100", text: "text-emerald-700", Icon: CheckCircle2 },
  inprogress: { bg: "bg-orange-100", text: "text-orange-700", Icon: Clock },
  todo: { bg: "bg-slate-100", text: "text-slate-600", Icon: Circle },
};

// Display order for actions: To do first, then In progress, then Completed.
const STATUS_ORDER = { todo: 0, inprogress: 1, done: 2 };
const byStatusOrder = (a, b) =>
  (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);

const fieldLabel = (key) =>
  String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const pickDetail = (details = {}, ...keys) => {
  for (const k of keys) {
    const v = details?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
};

// Hide keys already shown elsewhere on the card (task title, status chip,
// assignee chip, dedicated date row, section header). Anything else from the
// spreadsheet — Notes, etc. — renders as a labelled detail card.
const HIDDEN_DETAIL_KEYS = new Set([
  "phase",
  "dimension",
  "header",
  "topic",
  "category",
  "initiative",
  "task",
  "tasks",
  "action",
  "actions",
  "status",
  "assignee",
  "accountable",
  "owner",
  "start date",
  "startdate",
  "start",
  "end date",
  "enddate",
  "end",
  "due date",
  "duedate",
]);

const visibleDetails = (details = {}) =>
  Object.entries(details).filter(
    ([key, value]) =>
      key &&
      value &&
      !HIDDEN_DETAIL_KEYS.has(
        String(key).toLowerCase().replace(/\s+/g, " ").trim()
      )
  );

export default function HeaderDetailView({ item, onBack, onToggle, canEdit = true }) {
  if (!item) return null;

  const allTasks = item.tasks || [];
  const stats = computeStats(allTasks);
  const progressColor = getProgressColor(stats.pct);
  const initiatives = item.initiatives || [];
  const headerDetails = visibleDetails(allTasks[0]?.details);
  const phaseColor = PHASE_COLORS[item.phase]?.solid || "#00437A";

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="h-1 w-full" style={{ background: phaseColor }} />
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to headers
          </button>

          <div className="text-center">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Header details
            </div>
            <div className="text-[17px] font-bold text-slate-900">{item.header}</div>
            <div className="text-[13px] text-slate-500">
              {item.phase} · {item.dimension}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Progress
              </div>
              <div className="text-[18px] font-bold" style={{ color: progressColor }}>
                {stats.pct}%
              </div>
            </div>
            <ProgressCircle pct={stats.pct} size={44} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-5 py-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <LayoutGrid className="h-4 w-4" />
              Header overview
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{item.header}</div>
            <div className="mt-1 text-sm text-slate-500">
              {item.locked
                ? "Yet to begin. Complete the first two phases to unlock this phase."
                : "Review the initiatives and actions tracked under this header."}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ListChecks className="h-4 w-4 text-slate-400" />
              Status summary
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total actions
                </div>
                <div className="mt-0.5 text-3xl font-bold text-slate-900">{stats.total}</div>
              </div>
              <ProgressCircle pct={stats.pct} size={52} />
            </div>

            {/* Distribution bar (To do · In progress · Completed) */}
            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{
                  width: `${stats.total ? (stats.todo / stats.total) * 100 : 0}%`,
                  background: "#cbd5e1",
                }}
              />
              <div
                style={{
                  width: `${stats.total ? (stats.inprog / stats.total) * 100 : 0}%`,
                  background: "#f97316",
                }}
              />
              <div
                style={{
                  width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%`,
                  background: "#10b981",
                }}
              />
            </div>

            {/* Breakdown — To do, In progress, Completed (each shown once) */}
            <div className="mt-4 space-y-2.5 text-sm">
              {[
                { label: "To do", count: stats.todo, dot: "#94a3b8" },
                { label: "In progress", count: stats.inprog, dot: "#f97316" },
                { label: "Completed", count: stats.done, dot: "#10b981" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: row.dot }}
                    />
                    {row.label}
                  </span>
                  <span className="font-semibold text-slate-900">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {headerDetails.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-700">Excel fields</div>
              <div className="mt-3 space-y-2">
                {headerDetails.map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {fieldLabel(key)}
                    </div>
                    <div className="mt-1 text-sm text-slate-800">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Initiative breakdown
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                Actions grouped under each initiative
              </div>
            </div>
          </div>
          {item.locked ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              Optimize tasks will appear once Establish and Enhance are fully complete.
            </div>
          ) : (
            <div className="grid gap-4">
              {initiatives.map((initiative) => {
                const sectionStats = computeStats(initiative.tasks);
                const sectionColor = getProgressColor(sectionStats.pct);

                return (
                  <section
                    key={initiative.name}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    style={{ borderLeft: `4px solid ${phaseColor}` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Initiative
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{initiative.name}</div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-wider text-slate-500">
                            Progress
                          </div>
                          <div className="text-lg font-bold" style={{ color: sectionColor }}>
                            {sectionStats.pct}%
                          </div>
                        </div>
                        <ProgressCircle pct={sectionStats.pct} size={42} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {[...initiative.tasks].sort(byStatusOrder).map((task, idx) => {
                        const status = STATUS_STYLES[task.status] || STATUS_STYLES.todo;
                        const StatusIcon = status.Icon;
                        const taskDetails = visibleDetails(task.details);
                        const startDate = pickDetail(
                          task.details,
                          "Start Date",
                          "Start",
                          "StartDate",
                          "start date",
                          "start"
                        );
                        const endDate = pickDetail(
                          task.details,
                          "End Date",
                          "End",
                          "Due Date",
                          "EndDate",
                          "end date",
                          "end",
                          "due date"
                        );

                        return (
                          <div
                            key={`${initiative.name}-${idx}-${task.task}`}
                            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-base font-semibold text-slate-900">{task.task}</div>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}
                                >
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {statusLabel(task.status)}
                                </span>
                                {(() => {
                                  const assignee =
                                    task.assignee ||
                                    task.Assignee ||
                                    task.details?.Assignee ||
                                    task.details?.assignee ||
                                    task.details?.Owner ||
                                    task.details?.owner ||
                                    "";
                                  return assignee ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                      {assignee}
                                    </span>
                                  ) : null;
                                })()}
                              </div>

                              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                                <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
                                <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
                                  Start
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {startDate || "—"}
                                </span>
                                <span className="mx-1 text-slate-300">·</span>
                                <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
                                  End
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {endDate || "—"}
                                </span>
                              </div>

                              {taskDetails.length > 0 && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {taskDetails.map(([key, value]) => (
                                    <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        {fieldLabel(key)}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-700">{String(value)}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
