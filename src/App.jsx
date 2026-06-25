import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { useMsal } from "@azure/msal-react";

import DashboardCanvas from "./components/DashboardCanvas.jsx";
import { groupData } from "./utils.js";
import { getFileLastModified, downloadFileBuffer } from "./graphExcel.js";
import { isAdminEmail, EXCEL_FILE_URL, loginRequest } from "./authConfig.js";

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

const rowsFromArrayBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "array" });
  return rowsFromWorkbook(workbook);
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
  const isAdmin = isAdminEmail(userEmail);

  const [data, setData] = useState({});
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
      const rows = rowsFromArrayBuffer(buffer);
      if (!rows.length) {
        throw new Error("No valid rows were found in the Excel file.");
      }

      const tree = groupData(rows);
      if (Object.keys(tree).length === 0) {
        throw new Error("No valid rows found in the Excel file.");
      }

      setData(tree);
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
      fileName="SharePoint Excel"
      sourceUrl={EXCEL_FILE_URL}
      isAdmin={isAdmin}
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
