import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Move, RotateCcw, Undo2 } from "lucide-react";

import PhaseBackground from "./PhaseBackground.jsx";
import { PhaseHeaders, AxisLabels, GMRBadge } from "./Overlays.jsx";
import CategoryCard from "./CategoryCard.jsx";
import TooltipModal from "./TooltipModal.jsx";
import ProgressCircle from "./ProgressCircle.jsx";

import { CANVAS_W, CANVAS_H, PHASE_COLORS } from "../constants.js";
import { flattenForRender, computeStats, getProgressColor } from "../utils.js";

export default function DashboardCanvas({ tree, onReset, fileName }) {
  const [hover, setHover] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [positions, setPositions] = useState({});
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(CANVAS_W);

  const items = useMemo(() => flattenForRender(tree), [tree]);
  const layoutStorageKey = useMemo(
    () => `transformation-dashboard-layout:${fileName || "sample"}`,
    [fileName]
  );

  const totalStats = useMemo(() => {
    const all = items.flatMap((i) => i.tasks);
    return computeStats(all);
  }, [items]);

  const scale = containerWidth / CANVAS_W;
  const scaledHeight = CANVAS_H * scale;
  const hasCustomLayout = Object.keys(positions).length > 0;

  const updateRect = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [updateRect]);

  useEffect(() => {
    setLayoutLoaded(false);
    try {
      const saved = window.localStorage.getItem(layoutStorageKey);
      setPositions(saved ? JSON.parse(saved) : {});
    } catch {
      setPositions({});
    } finally {
      setLayoutLoaded(true);
    }
  }, [layoutStorageKey]);

  useEffect(() => {
    if (!layoutLoaded) return;
    try {
      window.localStorage.setItem(layoutStorageKey, JSON.stringify(positions));
    } catch {
      // The dashboard still works if browser storage is unavailable.
    }
  }, [layoutLoaded, layoutStorageKey, positions]);

  const getPosition = useCallback(
    (key, fallback) => positions[key] || fallback,
    [positions]
  );

  const handleDragStart = useCallback(
    (key, e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const fallback = {
        x: Number(e.currentTarget.dataset.dragX || 0),
        y: Number(e.currentTarget.dataset.dragY || 0),
      };
      const current = getPosition(key, fallback);
      dragRef.current = {
        key,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: current.x,
        startY: current.y,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setHover(null);
      setAnchor(null);
    },
    [getPosition, items]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = (e.clientX - drag.startClientX) / scale;
      const dy = (e.clientY - drag.startClientY) / scale;
      setPositions((current) => ({
        ...current,
        [drag.key]: {
          x: Math.round(drag.startX + dx),
          y: Math.round(drag.startY + dy),
        },
      }));
    },
    [scale]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleHover = (item, e) => {
    if (dragRef.current) return;
    // Anchor in INNER (unscaled) canvas space
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const scale = containerRect.width / CANVAS_W;
    setHover(item);
    setAnchor({
      left: (rect.left - containerRect.left) / scale,
      right: (rect.right - containerRect.left) / scale,
      top: (rect.top - containerRect.top) / scale,
      bottom: (rect.bottom - containerRect.top) / scale,
    });
  };

  const handleLeave = () => {
    setHover(null);
    setAnchor(null);
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)" }}
    >
      {/* Top toolbar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur sticky top-0 z-40">
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
            <div className="text-[20px] font-bold text-slate-900">
              <img src="public\harts-logo.png" alt="llknlk" height= "40px" width="40px"/>HARTS Transformation Maturity Dashboard
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

          {/* <button
            onClick={onReset}
            className="text-[12px] font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Upload New
          </button> */}
        </div>
      </div>

      {/* Canvas */}
      <div className="px-6 py-6">
        <div
          ref={containerRef}
          className="relative mx-auto rounded-xl overflow-hidden bg-white"
          style={{
            width: "100%",
            maxWidth: CANVAS_W,
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
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <PhaseBackground />
            <PhaseHeaders getPosition={getPosition} onDragStart={handleDragStart} />
            <AxisLabels getPosition={getPosition} onDragStart={handleDragStart} />
            <GMRBadge getPosition={getPosition} onDragStart={handleDragStart} />

            {items.map((item, i) => (
              <CategoryCard
                key={item.key}
                item={item}
                position={getPosition(item.key, item.pos)}
                index={i}
                isActive={hover?.key === item.key}
                onDragStart={handleDragStart}
                onHover={handleHover}
                onLeave={handleLeave}
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
        <div className="max-w-[1480px] mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
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
        </div>
      </div>
    </div>
  );
}
