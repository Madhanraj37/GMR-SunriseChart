import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, RefreshCcw } from "lucide-react";

import PhaseBackground from "./PhaseBackground.jsx";
import { PhaseHeaders, AxisLabels, GMRBadge } from "./Overlays.jsx";
import CategoryCard from "./CategoryCard.jsx";
import TooltipModal from "./TooltipModal.jsx";
import HeaderDetailView from "./HeaderDetailView.jsx";
import AccountMenu from "./AccountMenu.jsx";

import { CANVAS_W, CANVAS_H } from "../constants.js";
import { flattenForRender, computeStats, getProgressColor } from "../utils.js";

export default function DashboardCanvas({
  tree,
  fileName,
  sourceUrl,
  isAdmin = false,
  userEmail,
  userName,
  accounts = [],
  activeUsername,
  onSignOut,
  onAddAccount,
  onSwitchAccount,
  isSheetSyncing,
  sheetSyncStatus,
  onRefreshSheet,
  isLoading,
  error,
}) {
  const [hover, setHover] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [localTree, setLocalTree] = useState(tree);
  const [selected, setSelected] = useState(null);
  const [availableWidth, setAvailableWidth] = useState(CANVAS_W);
  const [availableHeight, setAvailableHeight] = useState(CANVAS_H);
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
    if (!isAdmin) return; // view-only users cannot change task status
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

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  👉 CHANGE THESE NUMBERS TO RESIZE THE DASHBOARD                       ║
  // ║                                                                        ║
  // ║  DASHBOARD_SIZE   = overall size (width + height together)             ║
  // ║     1 = fit screen · 1.15 = 15% bigger · 0.9 = smaller                 ║
  // ║                                                                        ║
  // ║  DASHBOARD_HEIGHT = height ONLY (1 = normal, 0.9 = 10% shorter,        ║
  // ║     0.8 = 20% shorter). Lower it to reduce the dashboard's height.     ║
  // ║                                                                        ║
  // ║  TOP_BOTTOM_SPACE = white space (px) added above AND below the chart   ║
  // ║     inside the card. Raise it to match the left/right gutters.         ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  const DASHBOARD_SIZE = 1.0;
  const DASHBOARD_HEIGHT = 0.89;
  const TOP_BOTTOM_SPACE = 20;

  // Uniform scale (keeps the chart's aspect ratio — no horizontal stretch).
  // First the largest scale that still fits inside the available area…
  const fitScale = Math.max(
    0.2,
    Math.min(availableWidth / CANVAS_W, availableHeight / CANVAS_H)
  );
  // …then, when there's spare room, pick the scale whose leftover space is
  // identical on the horizontal and vertical axes. Because the chart is
  // centered, that makes the white margin equal on all four sides while
  // keeping the dashboard as large as an even frame allows.
  const equalMarginScale =
    (availableWidth - availableHeight) / (CANVAS_W - CANVAS_H);
  const baseScale =
    equalMarginScale > 0 && equalMarginScale < fitScale
      ? equalMarginScale
      : fitScale;
  const scaleX = baseScale * DASHBOARD_SIZE;
  const scaleY = baseScale * DASHBOARD_SIZE * DASHBOARD_HEIGHT;
  const scaledWidth = CANVAS_W * scaleX;
  const scaledHeight = CANVAS_H * scaleY;

  const updateRect = useCallback(() => {
    if (!canvasAreaRef.current) return;
    const rect = canvasAreaRef.current.getBoundingClientRect();
    // Subtract the safety gutter (matches the canvas area's padding) so the
    // framed chart never touches the edges but is otherwise as large as the
    // equal-margin frame allows.
    setAvailableWidth(Math.max(320, rect.width - 16));
    setAvailableHeight(Math.max(260, rect.height - 16));
  }, []);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    let observer;
    if (canvasAreaRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateRect);
      observer.observe(canvasAreaRef.current);
    }
    return () => {
      window.removeEventListener("resize", updateRect);
      if (observer) observer.disconnect();
    };
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
        canEdit={isAdmin}
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
      className="flex h-screen w-full flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)" }}
    >
      {/* Compact header */}
      <header className="relative z-50 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-6 py-2 backdrop-blur">
        {/* Brand + two-line title */}
        <div className="flex items-center gap-3">
          <img
            src="/gmr-logo.png"
            alt="GMR"
            className="h-10 w-auto object-contain"
          />
          <div className="leading-none">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Transformation Maturity
            </div>
            <div className="mt-1 text-[21px] font-extrabold tracking-tight text-slate-900">
              Dashboard
            </div>
          </div>
        </div>

        {/* Stats + actions + account */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
              Overall
            </span>
            <span
              className="text-[14px] font-bold"
              style={{ color: getProgressColor(totalStats.pct) }}
            >
              {totalStats.pct}%
            </span>
            <span className="text-[12px] font-medium text-slate-400">
              {totalStats.done}/{totalStats.total}
            </span>
          </div>

          {sheetSyncStatus ? (
            <span className="hidden max-w-[150px] truncate text-[11px] text-slate-400 xl:inline">
              {sheetSyncStatus}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => onRefreshSheet?.()}
            disabled={isLoading}
            title={isSheetSyncing ? "Syncing…" : "Refresh data"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isSheetSyncing ? "animate-spin" : ""}`}
            />
          </button>

          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              title="Open source file"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}

          <AccountMenu
            userName={userName}
            userEmail={userEmail}
            isAdmin={isAdmin}
            accounts={accounts}
            activeUsername={activeUsername}
            onSignOut={onSignOut}
            onAddAccount={onAddAccount}
            onSwitchAccount={onSwitchAccount}
          />
        </div>
      </header>

      {/* Canvas */}
      <div
        ref={canvasAreaRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2"
      >
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="chart-font relative overflow-hidden rounded-xl bg-white"
          style={{
            width: scaledWidth,
            height: scaledHeight + 2 * TOP_BOTTOM_SPACE,
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
              transform: `translateY(${TOP_BOTTOM_SPACE}px) scale(${scaleX}, ${scaleY})`,
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
        </motion.div>
      </div>
    </div>
  );
}
