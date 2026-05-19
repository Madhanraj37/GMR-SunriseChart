import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

import DashboardCanvas from "./components/DashboardCanvas.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import { groupData } from "./utils.js";

const HEADER_ALIASES = {
  phase: ["phase", "stage", "maturityphase", "maturitystage"],
  dimension: ["dimension", "dim", "pillar", "track", "stream", "workstream", "area"],
  header: ["header", "topic", "theme", "milestone", "title", "heading"],
  initiative: ["initiative", "subinitiative", "item", "capability"],
  task: ["task", "tasks", "taskname", "activity", "action", "actions", "description", "details", "deliverable"],
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
  // Prefer sheets that actually carry a Status column; reference sheets
  // without statuses would otherwise emit duplicate tasks marked "todo".
  const sheetsWithStatus = workbook.SheetNames.filter((name) =>
    sheetHasStatusColumn(workbook.Sheets[name])
  );
  const targets = sheetsWithStatus.length
    ? sheetsWithStatus
    : workbook.SheetNames;

  for (const sheetName of targets) {
    const rows = rowsFromSheet(workbook.Sheets[sheetName], sheetName);
    if (rows.length) allRows.push(...rows);
    if (allRows.length >= 600) break;
  }

  return allRows;
};

const parseGoogleSheetUrl = (input) => {
  const text = String(input || "").trim();
  if (!text) return null;
  const idMatch = text.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const gidMatch = text.match(/[?#&]gid=(\d+)/);
  return { sheetId: idMatch[1], gid: gidMatch?.[1] || "0" };
};

// Use the /export endpoint rather than gviz/tq, because gviz collapses multi-
// row headers (and our planner sheet relies on banner rows above the data).
const googleSheetCsvUrl = ({ sheetId, gid }) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid || "0")}`;

const rowsFromCsvText = (csvText) => {
  const workbook = XLSX.read(csvText, { type: "string" });
  return rowsFromWorkbook(workbook);
};

const SHEET_URL_STORAGE_KEY = "gmrSheetUrl";
const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1IGrokGDDFAChuZchlMlBdHqpSO4affQYv5_mrFIVfRI/edit?pli=1&gid=305519276#gid=305519276";

// Sheet IDs we've previously shipped as the default. When a user has one of
// these saved in localStorage, migrate them onto the current DEFAULT_SHEET_URL
// so the dashboard immediately points at the live source.
const SUPERSEDED_SHEET_IDS = ["1Dd3X5i8GyC2eMlSSoBM8ZzqGV0l7QfYRcgAsHpKEgQo"];

const resolveInitialSheetUrl = () => {
  const saved = localStorage.getItem(SHEET_URL_STORAGE_KEY);
  if (!saved) return DEFAULT_SHEET_URL;
  if (SUPERSEDED_SHEET_IDS.some((id) => saved.includes(id))) {
    return DEFAULT_SHEET_URL;
  }
  return saved;
};

export default function App() {
  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("Google Sheet");
  const [sheetSyncUrl, setSheetSyncUrl] = useState("");
  const [isSheetSyncing, setIsSheetSyncing] = useState(false);
  const [sheetSyncStatus, setSheetSyncStatus] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sheetSyncRef = useRef(null);

  const fetchAndApplySheet = async (url) => {
    const parsed = parseGoogleSheetUrl(url);
    if (!parsed) {
      throw new Error("Paste a valid Google Sheets URL.");
    }
    setLoading(true);
    try {
      const response = await fetch(googleSheetCsvUrl(parsed), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Google Sheet fetch failed (${response.status})`);
      }

      const csvText = await response.text();
      const rows = rowsFromCsvText(csvText);
      if (!rows.length) {
        throw new Error("No valid rows were found in the Google Sheet.");
      }

      const tree = groupData(rows);
      if (Object.keys(tree).length === 0) {
        throw new Error("No valid rows found in the Google Sheet.");
      }

      setData(tree);
      setFileName("Google Sheet");
      setSheetSyncStatus(`Updated ${new Date().toLocaleTimeString()}`);
    } finally {
      setLoading(false);
    }
  };

  const startGoogleSheetSync = async (url, { persist = true } = {}) => {
    const trimmed = String(url || sheetSyncUrl || "").trim();
    if (!trimmed) {
      const message = "Add your Google Sheet URL in Settings.";
      setError(message);
      throw new Error(message);
    }

    setError(null);
    setSheetSyncUrl(trimmed);
    if (persist) {
      localStorage.setItem(SHEET_URL_STORAGE_KEY, trimmed);
    }

    try {
      setIsSheetSyncing(true);
      await fetchAndApplySheet(trimmed);

      if (sheetSyncRef.current) {
        clearInterval(sheetSyncRef.current);
      }

      sheetSyncRef.current = setInterval(() => {
        fetchAndApplySheet(trimmed).catch((e) => {
          setSheetSyncStatus(e.message || "Google Sheet update failed");
        });
      }, 10000);
    } catch (e) {
      setIsSheetSyncing(false);
      setError(e.message || "Failed to start Google Sheet sync");
      throw e;
    }
  };

  useEffect(() => {
    const initialUrl = resolveInitialSheetUrl();
    setSheetSyncUrl(initialUrl);
    startGoogleSheetSync(initialUrl, { persist: true }).catch(() => {});
    return () => {
      if (sheetSyncRef.current) clearInterval(sheetSyncRef.current);
    };
  }, []);

  return (
    <>
      <DashboardCanvas
        tree={data}
        fileName={fileName}
        googleSheetUrl={sheetSyncUrl}
        onStartSheetSync={(url) => startGoogleSheetSync(url, { persist: false })}
        isSheetSyncing={isSheetSyncing}
        sheetSyncStatus={sheetSyncStatus}
        onOpenSettings={() => setSettingsOpen(true)}
        onRefreshSheet={() => startGoogleSheetSync(sheetSyncUrl, { persist: false })}
        isLoading={loading}
        error={error}
      />
      <SettingsModal
        open={settingsOpen}
        initialUrl={sheetSyncUrl || DEFAULT_SHEET_URL}
        onClose={() => setSettingsOpen(false)}
        isSaving={loading}
        isSheetSyncing={isSheetSyncing}
        onStopSync={() => {
          if (sheetSyncRef.current) {
            clearInterval(sheetSyncRef.current);
            sheetSyncRef.current = null;
          }
          setIsSheetSyncing(false);
          setSheetSyncStatus("");
        }}
        onSave={async (nextUrl) => {
          await startGoogleSheetSync(nextUrl, { persist: true });
          setSettingsOpen(false);
        }}
      />
    </>
  );
}
