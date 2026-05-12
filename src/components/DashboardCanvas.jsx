import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ExternalLink, RefreshCcw, Settings } from "lucide-react";

import PhaseBackground from "./PhaseBackground.jsx";
import { PhaseHeaders, AxisLabels, GMRBadge } from "./Overlays.jsx";
import CategoryCard from "./CategoryCard.jsx";
import TooltipModal from "./TooltipModal.jsx";
import HeaderDetailView from "./HeaderDetailView.jsx";

import { CANVAS_W, CANVAS_H } from "../constants.js";
import { flattenForRender, computeStats, getProgressColor } from "../utils.js";

export default function DashboardCanvas({
  tree,
  fileName,
  googleSheetUrl,
  onStartSheetSync,
  isSheetSyncing,
  sheetSyncStatus,
  onOpenSettings,
  onRefreshSheet,
  isLoading,
  error,
}) {
  const [hover, setHover] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [localTree, setLocalTree] = useState(tree);
  const [selected, setSelected] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [availableWidth, setAvailableWidth] = useState(CANVAS_W);
  const toolbarRef = useRef(null);
  const canvasAreaRef = useRef(null);
  const containerRef = useRef(null);
  useEffect(() => setLocalTree(tree), [tree]);
  const items = useMemo(() => flattenForRender(localTree), [localTree]);

  const currentSelected = selected
    ? items.find((i) => i.key === selected)
    : null;

  const totalStats = useMemo(() => {
    const all = items.flatMap((i) => i.tasks);
    return computeStats(all);
  }, [items]);

  const onCategoryClick = (item) => {
    if (item.locked) return;
    setSelected(item.key);
  };

  const toggleTaskStatus = (phase, dimension, header, initiative, taskIndex) => {
    setLocalTree((prev) => {
      try {
        const next = JSON.parse(JSON.stringify(prev || {}));
        const headerNode = next[phase]?.[dimension]?.[header];
        const tasks = headerNode?.initiatives?.[initiative];
        if (!tasks) return prev;
        const t = tasks[taskIndex];
        if (!t) return prev;
        t.status = t.status === "done" ? "todo" : "done";
        return next;
      } catch (e) {
        return prev;
      }
    });
  };

  const toolbarHeight = toolbarRef.current?.getBoundingClientRect().height || 0;
  const availableHeight = Math.max(360, viewportHeight - toolbarHeight - 24);
  const scaleX = availableWidth / CANVAS_W;
  const scaleY = availableHeight / CANVAS_H;
  const scaledWidth = CANVAS_W * scaleX;
  const scaledHeight = CANVAS_H * scaleY;

  const updateRect = useCallback(() => {
    setViewportHeight(window.innerHeight);
    if (canvasAreaRef.current) {
      setAvailableWidth(canvasAreaRef.current.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [updateRect]);

  const handleHover = (item, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const scaleX = containerRect.width / CANVAS_W;
    const scaleY = containerRect.height / CANVAS_H;
    setHover(item);
    setAnchor({
      left: (rect.left - containerRect.left) / scaleX,
      right: (rect.right - containerRect.left) / scaleX,
      top: (rect.top - containerRect.top) / scaleY,
      bottom: (rect.bottom - containerRect.top) / scaleY,
    });
  };

  const handleLeave = () => {
    setHover(null);
    setAnchor(null);
  };

  if (currentSelected) {
    return (
      <HeaderDetailView
        item={currentSelected}
        onBack={() => setSelected(null)}
        onToggle={(initiativeName, idx) =>
          toggleTaskStatus(
            currentSelected.phase,
            currentSelected.dimension,
            currentSelected.header,
            initiativeName,
            idx
          )
        }
      />
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)" }}
    >
      {/* Top toolbar */}
      <div
        ref={toolbarRef}
        className="px-6 py-3 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur sticky top-0 z-40"
      >
        <div className="flex items-center gap-3">
          {/* <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #E63946, #EE8A1A 50%, #1A2F5C)",
            }}
          >
            <span className="text-white font-bold text-[12px]"></span>
          </div> */}
          <div>
            <div className="flex items-center gap-3 text-[20px] font-bold text-slate-900">
              <img
                src="/harts-logo.png"
                alt="HARTS"
                className="h-10 w-auto object-contain"
              />
              <span>HARTS - GMR Tranformation Maturity Dashboard</span>
            </div>
            <div className="text-[13px] text-slate-500">{fileName}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[15px] font-semibold text-slate-500 uppercase tracking-wider">
              Overall
            </div>
            <div
              className="text-[15px] font-bold"
              style={{ color: getProgressColor(totalStats.pct) }}
            >
              {totalStats.pct}%
            </div>
            <div className="text-[15px] text-slate-500">
              ({totalStats.done}/{totalStats.total})
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[15px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> In Progress
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> To Do
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            className="text-[12px] font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-slate-200/50 bg-white/50 backdrop-blur sticky top-[64px] z-40 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
          <span className="font-semibold uppercase tracking-wider text-slate-500">Google Sheet</span>
          {googleSheetUrl ? (
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Open sheet
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-[11px] text-slate-400">No sheet selected</span>
          )}
          {sheetSyncStatus ? (
            <span className="text-[11px] text-slate-500">{sheetSyncStatus}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRefreshSheet?.()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {isSheetSyncing ? "Syncing" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasAreaRef}
        className="px-0 py-2"
      >
        <div
          ref={containerRef}
          className="relative mx-auto rounded-xl overflow-hidden bg-white"
          style={{
            width: scaledWidth,
            maxWidth: "100%",
            height: scaledHeight,
            boxShadow:
              "0 18px 48px rgba(15,35,72,0.14), 0 4px 12px rgba(15,35,72,0.06)",
            border: "1px solid rgba(163, 168, 179, 0.08)",
          }}
          onMouseLeave={handleLeave}
        >
          {/* Inner unscaled canvas — scaled to fit container */}
          <div
            className="relative"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${scaleX}, ${scaleY})`,
              transformOrigin: "top left",
            }}
          >
            <PhaseBackground />
            <PhaseHeaders />
            <AxisLabels />
            <GMRBadge />

            {items.map((item, i) => (
              <CategoryCard
                key={item.key}
                item={item}
                position={item.pos}
                index={i}
                isActive={hover?.key === item.key}
                onHover={handleHover}
                onLeave={handleLeave}
                onClick={onCategoryClick}
              />
            ))}

            <AnimatePresence>
              {hover && (
                <TooltipModal
                  item={hover}
                  anchor={anchor}
                  containerRect={{
                    left: 0,
                    top: 0,
                    width: CANVAS_W,
                    height: CANVAS_H,
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* <div className="max-w-[1480px] mx-auto mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5" />
            Drag any header, label, badge, or category block to arrange the dashboard.
          </span>
          <button
            type="button"
            onClick={() => setPositions({})}
            disabled={!hasCustomLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Reset Layout
          </button>
        </div> */}

        {/* Phase summary cards */}
        {/* <div className="max-w-[1480px] mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Establish", "Enhance", "Optimize"].map((phase) => {
            const phaseItems = items.filter((i) => i.phase === phase);
            const allTasks = phaseItems.flatMap((i) => i.tasks);
            const stats = computeStats(allTasks);
            return (
              <div
                key={phase}
                className="rounded-xl p-4 text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${PHASE_COLORS[phase].from}, ${PHASE_COLORS[phase].to})`,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
                }}
              >
                <div className="flex items-start justify-between">
                    </div>

                    {!displayItems.length && (isLoading || error) ? (
                      <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-6 py-6 text-center shadow-sm">
                        <div className="text-lg font-bold text-slate-900">
                          {isLoading ? "Loading Google Sheet…" : "Unable to load Google Sheet"}
                        </div>
                        <div className="text-sm text-slate-600">
                          {error || "Waiting for your data to sync from the Google Sheet."}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={onOpenSettings}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Open settings
                          </button>
                          <button
                            type="button"
                            onClick={() => onStartSheetSync?.(googleSheetUrl)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Retry sync
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="text-[11px] uppercase tracking-[0.15em] opacity-80 font-semibold">
                      Phase
                    </div>
                    <div className="text-[20px] font-bold mt-0.5">{phase}</div>
                    <div className="text-[12px] opacity-90 mt-1">
                      {phaseItems.length} categories · {stats.total} tasks
                    </div>
                  </div>
                  <ProgressCircle pct={stats.pct} size={52} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-white/20">
                    ✓ {stats.done} done
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/20">
                    ⏱ {stats.inprog} in progress
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/20">
                    ○ {stats.todo} to do
                  </span>
                </div>
              </div>
            );
          })}
        </div> */}
      </div>
    </div>
  );
}
