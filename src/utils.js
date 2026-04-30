import { CATEGORY_POSITIONS, FALLBACK_REGIONS } from "./constants.js";

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

// Group flat rows into phase → dimension → category structure
export function groupData(rows) {
  const tree = {};
  for (const r of rows) {
    const phase = closestKnown(r.phase || r.Phase, CANONICAL_PHASES, "Establish");
    const dim = closestKnown(
      r.dimension || r.Dimension,
      CANONICAL_DIMENSIONS,
      "People"
    );
    const cat = String(r.category || r.Category || "").trim();
    const task = String(r.task || r.Task || cat).trim();
    const status = normStatus(r.status || r.Status);
    if (!phase || !dim || !cat) continue;
    tree[phase] ??= {};
    tree[phase][dim] ??= {};
    tree[phase][dim][cat] ??= [];
    tree[phase][dim][cat].push({ task, status });
  }
  return tree;
}

export function flattenForRender(tree) {
  const items = [];
  for (const phase of Object.keys(tree)) {
    for (const dim of Object.keys(tree[phase])) {
      for (const cat of Object.keys(tree[phase][dim])) {
        const tasks = tree[phase][dim][cat];
        const key = normKey(phase, dim, cat);
        const pos =
          CATEGORY_POSITIONS[key] ||
          FALLBACK_REGIONS[`${phase}::${dim}`] ||
          { x: 100, y: 100 };
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
