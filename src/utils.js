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

// ── Dates & RAG (Red / Amber / Green) status ─────────────────────────────────

// Pull the first non-empty value among the given detail keys.
export const pickDetail = (details = {}, ...keys) => {
  for (const k of keys) {
    const v = details?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
};

// Parse the assorted Excel date formats (M/D/YYYY, M/D/YY, D-M-YYYY, YYYY-MM-DD).
export const parseDate = (value) => {
  const s = String(value || "").trim();
  if (!s) return null;
  const parts = s.split(/[/\-.]/).map((p) => p.trim());
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    let [a, b, c] = parts.map(Number);
    let year;
    let month;
    let day;
    if (String(parts[0]).length === 4) {
      year = a;
      month = b;
      day = c;
    } else {
      year = c < 100 ? 2000 + c : c;
      if (a > 12) {
        day = a;
        month = b;
      } else {
        month = a;
        day = b;
      }
    }
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

// The task's start date string, across the various sheet column names.
export const taskStartDate = (task) =>
  pickDetail(task.details, "Start Date", "Start", "StartDate", "start date", "start");

// The task's due/end date string, across the various sheet column names.
export const taskEndDate = (task) =>
  pickDetail(
    task.details,
    "End Date",
    "End",
    "Due Date",
    "EndDate",
    "end date",
    "end",
    "due date"
  );

// An action is "delayed" when its deadline has passed and it isn't done.
export const isOverdue = (status, endValue) => {
  if (status === "done") return false;
  const end = parseDate(endValue);
  if (!end) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
};

// An action with no start date and no end date drives the purple state: an
// initiative whose actions are all missing both dates is treated as
// unscheduled / not started.
export const hasNoDates = (task) =>
  !taskStartDate(task) && !taskEndDate(task);

export const RAG_COLORS = {
  green: "#16a34a",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
};
export const RAG_LABEL = {
  green: "On Track",
  amber: "Needs Attention",
  red: "At Risk",
  purple: "Yet to Start",
};

// Tooltip copy for a RAG icon that summarizes a single INITIATIVE rolled up
// from its actions — the detail-view sidebar rows, initiative blocks, and the
// initiative list inside the dashboard hover tooltip.
export const RAG_ACTIONS_DESC = {
  green: "All actions are on track",
  amber: "One action is delayed",
  red: "Multiple actions are delayed",
  purple: "Actions are yet to start",
};
export const getRagColor = (level) => RAG_COLORS[level] || RAG_COLORS.green;

// Number of actions that are overdue and not yet completed.
export const delayedCount = (tasks = []) =>
  tasks.filter((t) => isOverdue(t.status, taskEndDate(t))).length;

// Per-initiative RAG: every action missing both start and end date → purple;
// otherwise no delayed actions → green, exactly one delayed → amber,
// more than one delayed → red.
export const initiativeRag = (initiative) => {
  const tasks = initiative?.tasks || [];
  if (tasks.length > 0 && tasks.every(hasNoDates)) return "purple";
  const d = delayedCount(tasks);
  if (d === 0) return "green";
  if (d === 1) return "amber";
  return "red";
};

// Header RAG from its initiatives:
//   1. any red initiative               → red
//   2. any amber, < 50% of initiatives   → amber
//   3. any amber, ≥ 50% of initiatives   → red
//   4. every initiative purple           → purple
//   5. otherwise                         → green
export const headerRag = (initiatives = []) => {
  const rags = initiatives.map((ini) => initiativeRag(ini));
  const total = rags.length;
  if (rags.some((r) => r === "red")) return "red";
  const amber = rags.filter((r) => r === "amber").length;
  if (amber > 0) return (amber / total) * 100 >= 50 ? "red" : "amber";
  if (total > 0 && rags.every((r) => r === "purple")) return "purple";
  return "green";
};

// Tooltip copy for a TOPIC icon. The icon COLOUR comes from headerRag, but the
// wording is driven by the underlying initiative counts so it names exactly how
// many are affected:
//   • every initiative purple  → "Initiatives are yet to start"
//   • any red initiative       → one / multiple "at risk"
//   • no red but some amber    → one / multiple "needs attention"
//   • otherwise                → "All initiatives are on track"
export const headerRagTooltip = (initiatives = []) => {
  const rags = initiatives.map((ini) => initiativeRag(ini));
  const total = rags.length;
  if (total > 0 && rags.every((r) => r === "purple"))
    return "Initiatives are yet to start";
  const red = rags.filter((r) => r === "red").length;
  const amber = rags.filter((r) => r === "amber").length;
  if (red > 0)
    return red === 1 ? "One initiative at risk" : "Multiple initiatives at risk";
  if (amber > 0)
    return amber === 1
      ? "One initiative needs attention"
      : "Multiple initiatives need attention";
  return "All initiatives are on track";
};

// ── FMEA / risk (Failure Mode & Effects Analysis) ────────────────────────────
//
// Each initiative can carry one FMEA record parsed from the FMEA workbook (any
// initiative matching more than one row keeps them all). A risk looks like:
//   { failureMode, effect, cause, controls, rpn, level,
//     recommended, accountable, responsible }

// Risk level shares the RAG palette: High=red, Medium=amber, Low=green.
export const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#16a34a" };
export const RISK_LABEL = { high: "High", medium: "Medium", low: "Low" };

// Decide High/Medium/Low. Trust the sheet's explicit "Risk" column when present;
// fall back to RPN thresholds (High ≥ 100, Medium 40–99, Low < 40) when blank.
export const riskLevel = (risk) => {
  const raw = String(risk?.level || "").toLowerCase().trim();
  if (/high|critical|severe|^h$/.test(raw)) return "high";
  if (/medium|moderate|^med$|^m$/.test(raw)) return "medium";
  if (/low|minor|^l$/.test(raw)) return "low";
  const rpn = Number(risk?.rpn) || 0;
  if (rpn >= 100) return "high";
  if (rpn >= 40) return "medium";
  return "low";
};

// Similarity between an FMEA row's initiative label and a real initiative name.
// Exact key = 1; one containing the other scores high; otherwise word-overlap
// (Jaccard). Lets near-matches attach (e.g. "Talent ecosystem" ≈
// "Self-sustaining Talent ecosystem").
const STOP_WORDS = new Set(["and", "the", "of", "for", "to", "a", "an", "in", "on"]);
const wordSet = (s) =>
  new Set(
    (String(s || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter(
      (w) => w.length > 1 && !STOP_WORDS.has(w)
    )
  );
const matchScore = (candName, iniName) => {
  const ck = compactKey(candName);
  const ik = compactKey(iniName);
  if (!ck || !ik) return 0;
  if (ck === ik) return 1;
  if (ck.includes(ik) || ik.includes(ck)) {
    return 0.8 + 0.2 * (Math.min(ck.length, ik.length) / Math.max(ck.length, ik.length));
  }
  const a = wordSet(candName);
  const b = wordSet(iniName);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter); // Jaccard 0..1
};

// Attach FMEA rows onto the grouped tree, matching each row to the closest
// initiative by name. Rows that don't clear the similarity threshold are
// dropped rather than mis-attributed.
const MATCH_THRESHOLD = 0.5;
export function attachFmeaToTree(tree, fmeaRows = []) {
  if (!fmeaRows || !fmeaRows.length) return tree;

  const index = [];
  for (const phase of Object.keys(tree)) {
    for (const dim of Object.keys(tree[phase])) {
      for (const header of Object.keys(tree[phase][dim])) {
        const node = tree[phase][dim][header];
        node.risksByInitiative ??= {};
        for (const name of Object.keys(node.initiatives || {})) {
          index.push({ node, name });
        }
      }
    }
  }
  if (!index.length) return tree;

  for (const r of fmeaRows) {
    const label = r.initiative || r.keyProcessInput || r.header || "";
    if (!label) continue;
    let best = null;
    let bestScore = 0;
    for (const e of index) {
      const score = matchScore(label, e.name);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (!best || bestScore < MATCH_THRESHOLD) continue;
    best.node.risksByInitiative[best.name] ??= [];
    best.node.risksByInitiative[best.name].push(r);
  }
  return tree;
}

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

// Index CATEGORY_POSITIONS by a casing/spacing/punctuation-insensitive key so
// the same coordinates resolve regardless of how the topic is spelled in the
// source sheet (e.g. "S4HANA" ↔ "S/4 HANA", "Brand campaign" ↔ "Brand
// Campaign", "Move from projects toContinuous Improvementculture" ↔ "Move
// from Projects to Continuous Improvement Culture").
const CATEGORY_POSITIONS_BY_KEY = Object.entries(CATEGORY_POSITIONS).reduce(
  (acc, [key, pos]) => {
    acc[compactKey(key)] = pos;
    return acc;
  },
  {}
);

const lookupCategoryPosition = (phase, dim, header) =>
  CATEGORY_POSITIONS[normKey(phase, dim, header)] ||
  CATEGORY_POSITIONS_BY_KEY[compactKey(`${phase}${dim}${header}`)];

const canonicalCategory = (value) => {
  const text = String(value || "").trim();
  const key = compactKey(text);
  // These aliases either drive phase routing below (CoE / Reposition Tech) or
  // pin variant spellings onto a single canonical title that already has a
  // position in CATEGORY_POSITIONS. Position resolution falls back to a
  // compact-key match (see CATEGORY_POSITIONS_BY_KEY), so adding aliases here
  // is only needed to control the *displayed* title text.
  const aliases = {
    coetransition: "CoE Transition",
    continuousimprovement: "Continuous Improvement become a way of life",
    continuousimprovementbecomeawayoflife:
      "Continuous Improvement become a way of life",
    techembeddedcapability: "Tech-embedded Capability building",
    techembeddedcapabilitybuilding: "Tech-embedded Capability building",
    corebusinessfunctionpilot: "Core Business Function Pilot",
    repositiontech: "Reposition Tech",
    repositiontechasenabler: "Reposition Tech",
    repositiontechasenablerandalign: "Reposition Tech",
    repositiontechasenablerandaligntechprocesspeople: "Reposition Tech",
    portfolioexpansioninhouseconsulting: "Portfolio Expansion",
  };
  return aliases[key] || text;
};

// Group flat rows into phase → dimension → header → initiative → tasks structure
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
    const header = canonicalCategory(r.header || r.Header || r.category || r.Category);
    const initiative = canonicalCategory(
      r.initiative || r.Initiative || r.category || r.Category || header
    );
    let finalPhase = phase;
    let finalDim = dim;
    if (header === "CoE Transition") {
      finalPhase = "Enhance";
      finalDim = "Process";
    } else if (header === "Reposition Tech") {
      finalPhase = "Optimize";
      finalDim = "Technology";
    }
    const task = String(r.task || r.Task || initiative || header).trim();
    const status = normStatus(r.status || r.Status);
    if (!phase || !dim || !header) continue;
    const rowKey = `${finalPhase}::${finalDim}::${header}::${initiative}::${task}::${status}`.toLowerCase();
    if (seen.has(rowKey)) continue;
    seen.add(rowKey);

    tree[finalPhase] ??= {};
    tree[finalPhase][finalDim] ??= {};
    tree[finalPhase][finalDim][header] ??= { initiatives: {} };
    tree[finalPhase][finalDim][header].initiatives[initiative] ??= [];
    tree[finalPhase][finalDim][header].initiatives[initiative].push({
      task,
      status,
      phase: finalPhase,
      dimension: finalDim,
      header,
      initiative,
      outcome: r.outcome || r.Outcome || r.details?.Outcome || "",
      assignee: r.assignee || r.Assignee || r.details?.Assignee || "",
      details: r.details || {},
    });
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
      for (const header of Object.keys(tree[phase][dim])) {
        const initiatives = tree[phase][dim][header].initiatives || {};
        const risksByInitiative = tree[phase][dim][header].risksByInitiative || {};
        const initiativeEntries = Object.entries(initiatives).map(([initiativeName, tasks]) => ({
          name: initiativeName,
          tasks,
          stats: computeStats(tasks),
          risks: risksByInitiative[initiativeName] || [],
        }));
        const tasks = initiativeEntries.flatMap((entry) => entry.tasks);
        const key = normKey(phase, dim, header);
        const regionKey = `${phase}::${dim}`;
        const slot = fallbackSlots[regionKey] || 0;
        const fixedPos = lookupCategoryPosition(phase, dim, header);
        const pos = fixedPos || getFallbackPosition(phase, dim, slot);
        if (!fixedPos) fallbackSlots[regionKey] = slot + 1;

        items.push({
          key,
          phase,
          dimension: dim,
          category: header,
          header,
          initiatives: initiativeEntries,
          tasks,
          pos,
          stats: computeStats(tasks),
          hasFixedPosition: !!fixedPos,
        });
      }
    }
  }

  // Dev helper: print the EXACT key string for every topic so the values used
  // in CATEGORY_POSITIONS can be matched 1:1. "fixed: false" means the chart is
  // auto-placing it (your x/y won't apply until the key matches this string).
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(
      "[dashboard] topic position keys — copy these EXACT strings into CATEGORY_POSITIONS:\n" +
        items
          .map((i) => `${i.hasFixedPosition ? "✓ matched " : "✗ AUTO    "} "${i.key}"`)
          .join("\n")
    );
  }

  return items;
}
