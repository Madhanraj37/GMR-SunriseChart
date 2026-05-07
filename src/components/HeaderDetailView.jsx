import React from "react";
import { ArrowLeft, CheckCircle2, Circle, LayoutGrid, ListChecks } from "lucide-react";

import ProgressCircle from "./ProgressCircle.jsx";
import { computeStats, getProgressColor } from "../utils.js";

const statusLabel = (status) => {
  if (status === "done") return "Completed";
  if (status === "inprogress") return "In progress";
  return "To do";
};

const fieldLabel = (key) =>
  String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const visibleDetails = (details = {}) =>
  Object.entries(details).filter(
    ([key, value]) =>
      key &&
      value &&
      !["phase", "dimension", "header", "initiative", "task", "status"].includes(
        key.toLowerCase()
      )
  );

export default function HeaderDetailView({ item, onBack, onToggle }) {
  if (!item) return null;

  const allTasks = item.tasks || [];
  const stats = computeStats(allTasks);
  const progressColor = getProgressColor(stats.pct);
  const initiatives = item.initiatives || [];
  const headerDetails = visibleDetails(allTasks[0]?.details);

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to headers
          </button>

          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Header details
            </div>
            <div className="text-lg font-bold text-slate-900">{item.header}</div>
            <div className="text-sm text-slate-500">
              {item.phase} · {item.dimension}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Progress</div>
              <div className="text-xl font-bold" style={{ color: progressColor }}>
                {stats.pct}%
              </div>
            </div>
            <ProgressCircle pct={stats.pct} size={48} />
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
                : "Click tasks below to update initiative progress."}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tasks
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Done
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.done}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ListChecks className="h-4 w-4" />
              Status summary
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Done</span>
                <span className="font-semibold text-emerald-600">{stats.done}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>In progress</span>
                <span className="font-semibold text-amber-600">{stats.inprog}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>To do</span>
                <span className="font-semibold text-rose-600">{stats.todo}</span>
              </div>
            </div>
          </div>

          {headerDetails.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-700">Excel fields</div>
              <div className="mt-3 space-y-2">
                {headerDetails.map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-white px-3 py-2">
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
                Tasks grouped under each initiative
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Each initiative completes when all of its tasks are checked.
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
                  <section key={initiative.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Initiative
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{initiative.name}</div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
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
                      {initiative.tasks.map((task, idx) => {
                        const checked = task.status === "done";
                        const taskDetails = visibleDetails(task.details);

                        return (
                          <label
                            key={`${initiative.name}-${idx}-${task.task}`}
                            className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggle(initiative.name, idx)}
                              className="mt-1 h-5 w-5 accent-emerald-600"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-base font-semibold text-slate-900">{task.task}</div>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    checked
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {checked ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5" />
                                  )}
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
                          </label>
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
