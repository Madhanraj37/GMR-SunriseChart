import {
  CANVAS_H,
  CANVAS_W,
  CATEGORY_POSITIONS,
} from "./constants.js";

const CANONICAL_PHASES = ["Establish", "Enhance", "Optimize"];
const CANONICAL_DIMENSIONS = ["People", "Process", "Technology"];

export const normKey = (phase, dim, cat) => `${phase}::${dim}::${cat}`;

export const getProgressColor = (pct) => {
  if (pct < 30) return "#ef4444";
  if (pct < 70) return "#f59e0b";
  return "#22c55e";
};

export const computeStats = (tasks) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inprog = tasks.filter((t) => t.status === "inprogress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, inprog, todo, pct };
};

// Normalize status strings (handles "In Progress", "in_progress", etc.)
const normStatus = (s) => {
  const v = String(s || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
  if (v === "done" || v === "complete" || v === "completed") return "done";
  if (v === "inprogress" || v === "ongoing" || v === "wip") return "inprogress";
  return "todo";
};

const closestKnown = (value, known, fallback) => {
  const text = String(value || "").toLowerCase().trim();
  if (!text) return fallback;

  const exact = known.find((item) => item.toLowerCase() === text);
  if (exact) return exact;

  const contains = known.find((item) => text.includes(item.toLowerCase()));
  return contains || fallback;
};

const compactKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const canonicalCategory = (value) => {
  const text = String(value || "").trim();
  const key = compactKey(text);
  const aliases = {
    coetransition: "CoE Transition",
    continuousimprovement: "Continuous Improvement become a way of life",
    continuousimprovementbecomeawayoflife:
      "Continuous Improvement become a way of life",
    techembeddedcapability: "Tech-embedded Capability building",
    techembeddedcapabilitybuilding: "Tech-embedded Capability building",
    corebusinessfunctionpilot: "Core Business Function Pilot",
  };
  return aliases[key] || text;
};

// Group flat rows into phase → dimension → category structure
export function groupData(rows) {
  const tree = {};
  const seen = new Set();
  for (const r of rows) {
    const phase = closestKnown(r.phase || r.Phase, CANONICAL_PHASES, "Establish");
    const dim = closestKnown(
      r.dimension || r.Dimension,
      CANONICAL_DIMENSIONS,
      "People"
    );
    const cat = canonicalCategory(r.category || r.Category);
    const finalPhase = cat === "CoE Transition" ? "Enhance" : phase;
    const finalDim = cat === "CoE Transition" ? "Process" : dim;
    const task = String(r.task || r.Task || cat).trim();
    const status = normStatus(r.status || r.Status);
    if (!phase || !dim || !cat) continue;
    const rowKey = `${finalPhase}::${finalDim}::${cat}::${task}::${status}`.toLowerCase();
    if (seen.has(rowKey)) continue;
    seen.add(rowKey);

    tree[finalPhase] ??= {};
    tree[finalPhase][finalDim] ??= {};
    tree[finalPhase][finalDim][cat] ??= [];
    tree[finalPhase][finalDim][cat].push({ task, status });
  }
  return tree;
}

const REGION_LAYOUT = {
  "Establish::People": { x: 105, y: 78, cols: 2, colW: 170, rowH: 124 },
  "Establish::Process": { x: 105, y: 300, cols: 2, colW: 185, rowH: 128 },
  "Establish::Technology": { x: 360, y: 510, cols: 1, colW: 145, rowH: 92 },
  "Enhance::People": { x: 500, y: 78, cols: 2, colW: 220, rowH: 124 },
  "Enhance::Process": { x: 555, y: 240, cols: 2, colW: 195, rowH: 128 },
  "Enhance::Technology": { x: 680, y: 492, cols: 2, colW: 155, rowH: 92 },
  "Optimize::People": { x: 950, y: 78, cols: 3, colW: 132, rowH: 112 },
  "Optimize::Process": { x: 980, y: 232, cols: 2, colW: 190, rowH: 130 },
  "Optimize::Technology": { x: 1220, y: 380, cols: 1, colW: 130, rowH: 100 },
};

const getFallbackPosition = (phase, dim, slot) => {
  const region =
    REGION_LAYOUT[`${phase}::${dim}`] ||
    REGION_LAYOUT[`${phase}::People`] ||
    { x: 120, y: 100, cols: 3, colW: 160, rowH: 105 };
  const col = slot % region.cols;
  const row = Math.floor(slot / region.cols);
  const maxX = CANVAS_W - 210;
  const maxY = CANVAS_H - 118;

  return {
    x: Math.min(region.x + col * region.colW, maxX),
    y: Math.min(region.y + row * region.rowH, maxY),
  };
};

const getOverflowPosition = (slot) => {
  const cols = 6;
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  return {
    x: 120 + col * 205,
    y: 96 + row * 106,
  };
};

const estimateBox = (item, pos) => ({
  left: pos.x,
  top: pos.y,
  right: pos.x + (item.phase === "Optimize" ? 138 : 154),
  bottom: pos.y + 88,
});

const overlaps = (a, b) =>
  a.left < b.right + 20 &&
  a.right + 20 > b.left &&
  a.top < b.bottom + 18 &&
  a.bottom + 18 > b.top;

const resolveOverlaps = (items) => {
  const placed = [];
  const retrySlots = {};
  let overflowSlot = 0;

  return items
    .sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x)
    .map((item) => {
      const regionKey = `${item.phase}::${item.dimension}`;
      let pos = item.pos;
      let box = estimateBox(item, pos);
      let collision = placed.some((placedBox) => overlaps(box, placedBox));
      let attempts = 0;

      while (collision && attempts < 36) {
        const slot = retrySlots[regionKey] || 0;
        retrySlots[regionKey] = slot + 1;
        pos = getFallbackPosition(item.phase, item.dimension, slot);
        box = estimateBox(item, pos);
        collision = placed.some((placedBox) => overlaps(box, placedBox));
        attempts += 1;
      }

      while (collision && attempts < 72) {
        pos = getOverflowPosition(overflowSlot);
        overflowSlot += 1;
        box = estimateBox(item, pos);
        collision = placed.some((placedBox) => overlaps(box, placedBox));
        attempts += 1;
      }

      if (collision) {
        pos = {
          x: 120 + ((overflowSlot * 37) % 1180),
          y: 96 + ((overflowSlot * 53) % 470),
        };
        box = estimateBox(item, pos);
        overflowSlot += 1;
      }

      placed.push(box);
      return { ...item, pos };
    });
};

export function flattenForRender(tree) {
  const items = [];
  const fallbackSlots = {};
  for (const phase of Object.keys(tree)) {
    for (const dim of Object.keys(tree[phase])) {
      for (const cat of Object.keys(tree[phase][dim])) {
        const tasks = tree[phase][dim][cat];
        const key = normKey(phase, dim, cat);
        const regionKey = `${phase}::${dim}`;
        const slot = fallbackSlots[regionKey] || 0;
        const pos = CATEGORY_POSITIONS[key] || getFallbackPosition(phase, dim, slot);
        if (!CATEGORY_POSITIONS[key]) fallbackSlots[regionKey] = slot + 1;

        items.push({
          key,
          phase,
          dimension: dim,
          category: cat,
          tasks,
          pos,
          stats: computeStats(tasks),
        });
      }
    }
  }
  return items;
}
