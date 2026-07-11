import React, { useState, useEffect, useRef } from "react";
import { useMsal } from "@azure/msal-react";

import DashboardCanvas from "./components/DashboardCanvas.jsx";
import { groupData, attachFmeaToTree } from "./utils.js";
import { getFileLastModified, downloadFileBuffer } from "./graphExcel.js";
import { EXCEL_FILE_URL, loginRequest } from "./authConfig.js";

const HEADER_ALIASES = {
  phase: ["phase", "stage", "maturityphase", "maturitystage"],
  dimension: ["dimension", "dim", "pillar", "track", "stream", "workstream", "area"],
  header: ["header", "topic", "theme", "milestone", "title", "heading"],
  initiative: ["initiative", "subinitiative", "item", "capability"],
  // "Outcome" is the initiative-level goal in the new sheet layout. Keep it
  // separate from "task" so each Action row stays the leaf item.
  outcome: ["outcome", "outcomes", "result", "objective", "goal"],
  task: ["task", "tasks", "taskname", "activity", "action", "actions", "deliverable"],
  status: ["status", "taskstatus", "progress", "state", "completion"],
  assignee: ["assignee", "owner", "responsible", "assignedto", "accountable"],
};

const PHASES = ["establish", "enhance", "optimize"];
const DIMENSIONS = ["people", "process", "technology"];
const CANONICAL_PHASES = ["Establish", "Enhance", "Optimize"];
const CANONICAL_DIMENSIONS = ["People", "Process", "Technology"];

// Glyphs / emoji that prefix Topic and Initiative cells in the planner sheet.
const LEADING_GLYPHS_RE = /^[\s▸◆◈❖▪▶☝⚡•·–—\- -⁯\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/u;
const stripGlyphs = (value) =>
  String(value || "").replace(LEADING_GLYPHS_RE, "").trim();

const clean = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const headerKey = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");

// "Category" is ambiguous: in some sheets it labels the dimension column
// (People/Process/Technology); in others it labels the header column. We
// resolve it later by peeking at the first non-empty value in the column.
const findAlias = (value) => {
  const key = headerKey(value);
  if (key === "category") return "category";
  return Object.entries(HEADER_ALIASES).find(([, aliases]) =>
    aliases.includes(key)
  )?.[0];
};

const titleCaseKnown = (value, known) => {
  const normalized = clean(value).toLowerCase();
  const match = known.find((item) => item.toLowerCase() === normalized);
  return match || clean(value);
};

const canonicalPhase = (value) => titleCaseKnown(value, CANONICAL_PHASES);
const canonicalDimension = (value) => titleCaseKnown(value, CANONICAL_DIMENSIONS);

const findKnownValue = (cells, known) => {
  for (const cell of cells) {
    const normalized = clean(cell).toLowerCase();
    const match = known.find((item) => item === normalized);
    if (match) return titleCaseKnown(match, known);
  }
  return "";
};

const getFirstText = (cells) => cells.map(clean).find(Boolean) || "";
const MAX_SCAN_ROWS = 600;
const MAX_SCAN_COLS = 40;

const findHeaderRow = (rows) => {
  const searchLimit = Math.min(rows.length, 25);
  let fallback = -1;

  for (let rowIndex = 0; rowIndex < searchLimit; rowIndex += 1) {
    const aliases = rows[rowIndex].map(findAlias).filter(Boolean);
    const unique = new Set(aliases);
    const headerLike =
      unique.has("header") || unique.has("category") || unique.has("task");
    if (headerLike) fallback = rowIndex;
    if (
      unique.size >= 2 &&
      (unique.has("phase") || unique.has("dimension")) &&
      headerLike
    ) {
      return rowIndex;
    }
  }

  return fallback;
};

// Decide what each "category"-labelled column actually means by peeking at
// the first non-empty cell: if it's a dimension keyword (people/process/
// technology) the column holds dimension; otherwise it holds the header.
const resolveCategoryColumns = (headers, dataRows) =>
  headers.map((field, colIndex) => {
    if (field !== "category") return field;
    for (const row of dataRows) {
      const value = clean(row[colIndex]).toLowerCase();
      if (!value) continue;
      return DIMENSIONS.includes(value) ? "dimension" : "header";
    }
    return "header";
  });

const detectBannerPhaseDim = (cells) => {
  const flat = cells.map(clean).join(" ").toLowerCase();
  if (!flat) return {};
  const result = {};
  for (const phase of PHASES) {
    if (flat.includes(phase)) {
      result.phase = canonicalPhase(phase);
      break;
    }
  }
  for (const dim of DIMENSIONS) {
    if (flat.includes(dim)) {
      result.dimension = canonicalDimension(dim);
      break;
    }
  }
  return result;
};

const rowsFromSheet = (sheet, sheetName) => {
  if (!sheet?.["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const endRow = Math.min(range.e.r, range.s.r + MAX_SCAN_ROWS - 1);
  const endCol = Math.min(range.e.c, range.s.c + MAX_SCAN_COLS - 1);
  const rawRows = [];

  for (let rowIndex = range.s.r; rowIndex <= endRow; rowIndex += 1) {
    const row = [];
    let hasValue = false;
    for (let colIndex = range.s.c; colIndex <= endCol; colIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const value = clean(sheet[cellAddress]?.w ?? sheet[cellAddress]?.v);
      row.push(value);
      if (value) hasValue = true;
    }
    if (hasValue) rawRows.push(row);
  }

  const rows = rawRows
    .map((row) => row.map(clean))
    .filter((row) => row.some(Boolean));
  if (!rows.length) return [];

  const headerRow = findHeaderRow(rows);
  const parsed = [];
  let lastPhase = canonicalPhase(findKnownValue([sheetName], PHASES));
  let lastDimension = canonicalDimension(findKnownValue([sheetName], DIMENSIONS));
  let lastCategory = "";
  let lastInitiative = "";

  if (headerRow >= 0) {
    const rawHeaders = rows[headerRow];
    const headers = resolveCategoryColumns(
      rawHeaders.map(findAlias),
      rows.slice(headerRow + 1)
    );
    const dataRows = rows.slice(headerRow + 1);

    // Indices of the columns whose presence makes a row a "data" row.
    // If none of these have a value, the row is treated as a section banner.
    const contentFields = new Set(["header", "initiative", "task", "status"]);
    const contentCols = headers
      .map((field, index) => (contentFields.has(field) ? index : -1))
      .filter((index) => index >= 0);

    for (const cells of dataRows) {
      const isContentRow = contentCols.some((index) => clean(cells[index]));

      if (!isContentRow) {
        // Banner row like " ESTABLISH PHASE" or "👤 PEOPLE" — carry phase/dim forward.
        const banner = detectBannerPhaseDim(cells);
        if (banner.phase) lastPhase = banner.phase;
        if (banner.dimension) lastDimension = banner.dimension;
        continue;
      }

      const row = {};
      const details = {};
      headers.forEach((field, index) => {
        const headerName = clean(rawHeaders[index]);
        const value = clean(cells[index]);
        if (headerName && value) details[headerName] = value;
        if (field && !row[field]) row[field] = value;
      });

      // Only trust phase/dim from explicit columns — never from a stray cell on
      // a data row (the May planner has unreliable per-row dimension values).
      if (row.phase) lastPhase = canonicalPhase(row.phase);
      if (row.dimension) lastDimension = canonicalDimension(row.dimension);

      const explicitHeader = stripGlyphs(row.header);
      const explicitInitiative = stripGlyphs(row.initiative);
      const explicitTask = stripGlyphs(row.task);

      // A new Topic resets the carried-forward initiative scope; a new
      // Initiative cell within the same Topic updates it. Continuation rows
      // (no Topic or Initiative filled) inherit the last seen values.
      if (explicitHeader) {
        lastCategory = explicitHeader;
        lastInitiative = "";
      }
      if (explicitInitiative) {
        lastInitiative = explicitInitiative;
      }

      const header = explicitHeader || lastCategory;
      const initiative =
        explicitInitiative || lastInitiative || explicitTask || header;
      const task = explicitTask || initiative || header;
      if (!header && !initiative && !task) continue;

      parsed.push({
        phase: lastPhase || "Establish",
        dimension: lastDimension || "People",
        header,
        initiative,
        task,
        outcome: row.outcome || "",
        status: row.status || "todo",
        assignee: row.assignee || details.Assignee || details.Accountable || "",
        details,
      });
    }

    return parsed;
  }

  for (const cells of rows) {
    const phase = findKnownValue(cells, PHASES);
    const dimension = findKnownValue(cells, DIMENSIONS);
    if (phase) lastPhase = canonicalPhase(phase);
    if (dimension) {
      lastDimension = canonicalDimension(dimension);
    }

    const meaningful = cells.filter(
      (cell) =>
        cell &&
        !PHASES.includes(cell.toLowerCase()) &&
        !DIMENSIONS.includes(cell.toLowerCase())
    );
    const header = meaningful[0];
    const initiative = meaningful[1] || header;
    const task = meaningful.slice(2).join(" - ") || initiative || header;
    if (!header) continue;

    parsed.push({
      phase: lastPhase || "Establish",
      dimension: lastDimension || "People",
      header,
      initiative,
      task,
      status: "todo",
      assignee: "",
      details: {},
    });
  }

  return parsed;
};

const sheetHasStatusColumn = (sheet) => {
  if (!sheet?.["!ref"]) return false;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const endRow = Math.min(range.e.r, range.s.r + 25);
  const endCol = Math.min(range.e.c, range.s.c + MAX_SCAN_COLS - 1);
  for (let rowIndex = range.s.r; rowIndex <= endRow; rowIndex += 1) {
    for (let colIndex = range.s.c; colIndex <= endCol; colIndex += 1) {
      const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const value = sheet[addr]?.w ?? sheet[addr]?.v;
      if (findAlias(value) === "status") return true;
    }
  }
  return false;
};

const rowsFromWorkbook = (workbook) => {
  const allRows = [];
  // FMEA sheets also carry a Status column but are risk registers, not task
  // lists — keep them out of the Actions parser (they are routed to
  // fmeaFromWorkbook instead).
  const nonFmea = workbook.SheetNames.filter(
    (name) => !isFmeaSheet(workbook.Sheets[name])
  );
  // Prefer sheets that actually carry a Status column; reference sheets
  // without statuses would otherwise emit duplicate tasks marked "todo".
  const sheetsWithStatus = nonFmea.filter((name) =>
    sheetHasStatusColumn(workbook.Sheets[name])
  );
  const targets = sheetsWithStatus.length ? sheetsWithStatus : nonFmea;

  for (const sheetName of targets) {
    const rows = rowsFromSheet(workbook.Sheets[sheetName], sheetName);
    if (rows.length) allRows.push(...rows);
    if (allRows.length >= 600) break;
  }

  return allRows;
};

// ─── FMEA (risk) sheet parsing ──────────────────────────────────────────────
// The FMEA file is a risk register with one row per initiative, detected by its
// "Failure Mode" column. We keep only the nine fields the dashboard shows and
// the initiative identifier used to match it (see attachFmeaToTree). Any extra
// columns (severity/occurrence/detection, revised scores, status, dates…) are
// ignored. Where a column such as RPN appears more than once, the first
// occurrence wins.

const FMEA_STATIC = {
  failuremode: "failureMode",
  effect: "effect",
  effects: "effect",
  cause: "cause",
  causes: "cause",
  currentcontrols: "controls",
  controls: "controls",
  rpn: "rpn",
  risk: "level",
  risklevel: "level",
  recommendedaction: "recommended",
  recommendedactions: "recommended",
  recommended: "recommended",
  accountable: "accountable",
  responsible: "responsible",
  keyprocessinput: "keyProcessInput",
  processinput: "keyProcessInput",
  initiative: "initiative",
  subinitiative: "initiative",
  header: "header",
  topic: "header",
};

// Map a normalized header token to a field, tolerant of trailing "(s)", ":" etc.
// RPN is checked before "risk" so "RPN" never resolves to the Risk column.
const fmeaFieldFor = (token) => {
  if (FMEA_STATIC[token]) return FMEA_STATIC[token];
  if (token.includes("rpn")) return "rpn";
  if (token.startsWith("failuremode")) return "failureMode";
  if (token.startsWith("effect")) return "effect";
  if (token.startsWith("cause")) return "cause";
  if (token.startsWith("currentcontrol") || token === "control") return "controls";
  if (token.startsWith("recommend")) return "recommended";
  if (token.startsWith("accountable")) return "accountable";
  if (token.startsWith("responsible")) return "responsible";
  if (token.startsWith("keyprocessinput")) return "keyProcessInput";
  if (token.startsWith("risk")) return "level";
  return null;
};

const readSheetGrid = (sheet) => {
  if (!sheet?.["!ref"]) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const endRow = Math.min(range.e.r, range.s.r + MAX_SCAN_ROWS - 1);
  const endCol = Math.min(range.e.c, range.s.c + MAX_SCAN_COLS - 1);
  const grid = [];
  for (let r = range.s.r; r <= endRow; r += 1) {
    const row = [];
    let has = false;
    for (let c = range.s.c; c <= endCol; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const v = clean(sheet[addr]?.w ?? sheet[addr]?.v);
      row.push(v);
      if (v) has = true;
    }
    if (has) grid.push(row);
  }
  return grid;
};

// A header row is FMEA if it names a Failure Mode, or has an RPN plus a
// Cause/Recommended column (covers spelling variants of the title column).
const isFmeaHeaderRow = (row) => {
  const keys = row.map(headerKey);
  const failure = keys.some((k) => k.startsWith("failuremode"));
  const rpn = keys.some((k) => k.includes("rpn"));
  const causeOrRec = keys.some((k) => k.startsWith("cause") || k.startsWith("recommend"));
  return failure || (rpn && causeOrRec);
};

const findFmeaHeaderRow = (grid) => {
  const limit = Math.min(grid.length, 25);
  for (let i = 0; i < limit; i += 1) {
    if (isFmeaHeaderRow(grid[i])) return i;
  }
  return -1;
};

const isFmeaSheet = (sheet) => findFmeaHeaderRow(readSheetGrid(sheet)) >= 0;

const fmeaRowsFromSheet = (sheet) => {
  const grid = readSheetGrid(sheet);
  const headerRow = findFmeaHeaderRow(grid);
  if (headerRow < 0) return [];

  const colFields = grid[headerRow].map((cell) => fmeaFieldFor(headerKey(cell)));

  const risks = [];
  for (let i = headerRow + 1; i < grid.length; i += 1) {
    const cells = grid[i];
    const risk = {};
    colFields.forEach((field, idx) => {
      if (!field) return;
      const value = clean(cells[idx]);
      if (value && !risk[field]) risk[field] = value; // first occurrence wins
    });
    // A genuine row must name a failure mode; skip banners / blank rows.
    if (!risk.failureMode) continue;
    if (risk.initiative) risk.initiative = stripGlyphs(risk.initiative);
    if (risk.header) risk.header = stripGlyphs(risk.header);
    if (risk.keyProcessInput) risk.keyProcessInput = stripGlyphs(risk.keyProcessInput);
    risks.push(risk);
  }
  return risks;
};

const fmeaFromWorkbook = (workbook) => {
  const all = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!isFmeaSheet(sheet)) continue;
    all.push(...fmeaRowsFromSheet(sheet));
  }
  return all;
};

// ─── Detailed Risk Profile (FMEA register) parsing ──────────────────────────
// The "Risks" sheet is a full FMEA register with a two-level hierarchy encoded
// in a "Row Type" column: rows marked "Program Outcome (Board Level)" are the
// parent process steps (blue-banded in Excel); the rows that follow each parent
// — until the next parent — are its sub-process-step risks. We map every column
// by header name (tolerant of variants) and keep the before/after RPN profile
// so the Risk view can show mitigation impact.

// Map each header cell to a field. S/O/D/RPN appear twice (before + after
// action): the first occurrence is the "before" score, the second the "after".
const mapRiskColumns = (headerCells) => {
  const counts = {};
  const nth = (name) => (counts[name] = (counts[name] || 0) + 1);
  return headerCells.map((cell) => {
    const raw = clean(cell).toLowerCase();
    const k = headerKey(cell);
    if (!k && !raw) return null;
    if (k === "phase") return "phase";
    if (k === "category") return "category";
    if (k.startsWith("processstep") || k === "process") return "processStep";
    if (k.startsWith("keyprocessinput") || k.startsWith("processinput")) return "keyProcessInput";
    if (k.startsWith("failuremode")) return "failureMode";
    if (k.startsWith("effect")) return "effect";
    if (k.startsWith("cause")) return "cause";
    if (k.startsWith("currentcontrol") || k === "controls" || k === "control") return "controls";
    if (k === "risk" || k === "risklevel") return "level";
    if (k.startsWith("recommend")) return "recommended";
    if (k.includes("actiontaken") || k.includes("update")) return "actionTaken";
    if (k.startsWith("accountable")) return "accountable";
    if (k.startsWith("responsible")) return "responsible";
    if (k.startsWith("target")) return "target";
    if (k.startsWith("status")) return "status";
    if (k === "action") return "action";
    if (k.includes("risktheme") || k.startsWith("programrisk")) return "programRiskTheme";
    if (k.startsWith("rowtype")) return "rowType";
    if (k === "rpn") return nth("rpn") === 1 ? "rpn" : "rpnAfter";
    if (k === "s" || k === "sev" || k.startsWith("severity")) return nth("s") === 1 ? "severity" : "severityAfter";
    if (k === "o" || k === "occ" || k.startsWith("occurrence")) return nth("o") === 1 ? "occurrence" : "occurrenceAfter";
    if (k === "d" || k === "det" || k.startsWith("detection")) return nth("d") === 1 ? "detection" : "detectionAfter";
    if (raw.includes("δ") || raw.includes("%") || raw.includes("delta") || raw.includes("reduction")) return "deltaPct";
    return null;
  });
};

// The header row is the one naming Process Step + Failure Mode / Row Type
// (skips the section-banner row above it).
const findRiskHeaderRow = (grid) => {
  const limit = Math.min(grid.length, 15);
  for (let i = 0; i < limit; i += 1) {
    const keys = grid[i].map(headerKey);
    const has = (p) => keys.some((k) => k.startsWith(p));
    if (
      (has("processstep") && has("failuremode")) ||
      (has("processstep") && has("rowtype")) ||
      (has("failuremode") && has("rowtype"))
    ) {
      return i;
    }
  }
  return -1;
};

// Locate the risk register sheet: prefer one named Risk(s)/FMEA, else the first
// sheet whose header row looks like an FMEA register.
const findRiskGrid = (workbook) => {
  const named = workbook.SheetNames.filter((n) => /risk|fmea/i.test(n));
  const order = [
    ...named,
    ...workbook.SheetNames.filter((n) => !named.includes(n)),
  ];
  for (const name of order) {
    const grid = readSheetGrid(workbook.Sheets[name]);
    if (findRiskHeaderRow(grid) >= 0) return grid;
  }
  return null;
};

const isProgramOutcomeRow = (rowType) => {
  const t = String(rowType || "").toLowerCase();
  return (
    t.includes("program outcome") ||
    t.includes("board level") ||
    t.includes("board-level")
  );
};

// Parse the risk register into a two-level tree:
//   [{ ...parentRisk, children: [ ...subRisk ] }]
// Parents are "Program Outcome (Board Level)" rows; every following row (until
// the next such row) is a child. If the sheet has no Row Type column we fall
// back to the leading glyph (❖ …) / "rolled up from …" marker of parent rows.
export const riskProfileFromWorkbook = (workbook) => {
  const grid = findRiskGrid(workbook);
  if (!grid) return [];
  const headerRow = findRiskHeaderRow(grid);
  const fields = mapRiskColumns(grid[headerRow]);
  const hasRowType = fields.includes("rowType");

  const records = [];
  for (let i = headerRow + 1; i < grid.length; i += 1) {
    const cells = grid[i];
    const rec = {};
    fields.forEach((f, idx) => {
      if (!f) return;
      const v = clean(cells[idx]);
      if (v && !rec[f]) rec[f] = v; // first occurrence wins
    });
    if (!rec.processStep && !rec.failureMode && !rec.rowType) continue;

    const rawStep = rec.processStep || "";
    const stripped = stripGlyphs(rawStep);
    rec.hasGlyph = stripped !== rawStep && !!stripped;
    rec.processStep = stripped;
    if (rec.keyProcessInput) rec.keyProcessInput = stripGlyphs(rec.keyProcessInput);
    records.push(rec);
  }

  const isParent = (rec) =>
    hasRowType
      ? isProgramOutcomeRow(rec.rowType)
      : rec.hasGlyph || /rolled up/i.test(rec.keyProcessInput || "");

  const groups = [];
  let current = null;
  for (const rec of records) {
    if (isParent(rec) || !current) {
      current = { ...rec, children: [] };
      groups.push(current);
    } else {
      current.children.push(rec);
    }
  }
  return groups;
};

// SheetJS is large (~40% of the bundle) and only needed once the user has
// signed in and a workbook has actually been downloaded. Load it on demand so
// it stays out of the initial bundle and the login screen renders instantly.
// The namespace is cached after first use. Every XLSX.* call below runs
// synchronously inside dataFromArrayBuffer, after this await resolves.
let XLSX;

const dataFromArrayBuffer = async (buffer) => {
  if (!XLSX) XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  return {
    rows: rowsFromWorkbook(workbook),
    fmeaRows: fmeaFromWorkbook(workbook),
    riskProfile: riskProfileFromWorkbook(workbook),
  };
};

// How often to check SharePoint for changes (smart polling).
const POLL_INTERVAL_MS = 30000;

export default function App() {
  const { instance, accounts } = useMsal();
  const [activeUsername, setActiveUsername] = useState(
    () => (instance.getActiveAccount() || instance.getAllAccounts()[0])?.username || ""
  );
  const account =
    accounts.find((a) => a.username === activeUsername) ||
    instance.getActiveAccount() ||
    accounts[0];
  const userEmail = account?.username || "";
  const userName = account?.name || "";

  const [data, setData] = useState({});
  const [riskProfile, setRiskProfile] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const pollRef = useRef(null);
  const lastModifiedRef = useRef(null);

  // Fetch from SharePoint via Graph. Cheap last-modified check first; only
  // download + re-parse the workbook when the file has actually changed.
  const refresh = async ({ force = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const lastModified = await getFileLastModified(instance);
      if (!force && lastModified && lastModified === lastModifiedRef.current) {
        setSyncStatus(`Up to date · checked ${new Date().toLocaleTimeString()}`);
        return;
      }

      const buffer = await downloadFileBuffer(instance);
      const {
        rows,
        fmeaRows: workbookFmea,
        riskProfile: mainRiskProfile,
      } = await dataFromArrayBuffer(buffer);
      if (!rows.length) {
        throw new Error("No valid rows were found in the Excel file.");
      }

      const tree = groupData(rows);
      if (Object.keys(tree).length === 0) {
        throw new Error("No valid rows found in the Excel file.");
      }

      // FMEA / risk data comes from the main workbook's own sheets.
      const fmeaRows = workbookFmea;
      const riskProfileData = mainRiskProfile;
      attachFmeaToTree(tree, fmeaRows);

      setData(tree);
      setRiskProfile(riskProfileData);
      lastModifiedRef.current = lastModified;
      setSyncStatus(`Updated ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      setError(e.message || "Failed to load the SharePoint Excel file.");
      setSyncStatus(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh({ force: true });
    pollRef.current = setInterval(() => {
      refresh().catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sign in an additional Microsoft account and make it active.
  const handleAddAccount = async () => {
    try {
      const res = await instance.loginPopup({
        ...loginRequest,
        prompt: "select_account",
      });
      if (res?.account) {
        instance.setActiveAccount(res.account);
        setActiveUsername(res.account.username);
        refresh({ force: true });
      }
    } catch (e) {
      // user closed the popup / cancelled — nothing to do
    }
  };

  // Switch the active account between already signed-in accounts.
  const handleSwitchAccount = (acc) => {
    if (!acc) return;
    instance.setActiveAccount(acc);
    setActiveUsername(acc.username);
    refresh({ force: true });
  };

  return (
    <DashboardCanvas
      tree={data}
      riskProfile={riskProfile}
      fileName="SharePoint Excel"
      sourceUrl={EXCEL_FILE_URL}
      userEmail={userEmail}
      userName={userName}
      accounts={accounts}
      activeUsername={activeUsername}
      onSignOut={() => instance.logoutPopup()}
      onAddAccount={handleAddAccount}
      onSwitchAccount={handleSwitchAccount}
      isSheetSyncing={loading}
      sheetSyncStatus={syncStatus}
      onRefreshSheet={() => refresh({ force: true })}
      isLoading={loading}
      error={error}
    />
  );
}
