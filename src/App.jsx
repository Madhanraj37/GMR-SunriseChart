import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

import FileUpload from "./components/FileUpload.jsx";
import DashboardCanvas from "./components/DashboardCanvas.jsx";
import { groupData } from "./utils.js";
import { sampleRows } from "./sampleData.js";

const HEADER_ALIASES = {
  phase: ["phase", "stage", "maturityphase", "maturitystage"],
  dimension: ["dimension", "dim", "pillar", "track", "stream", "workstream", "area"],
  header: ["header", "category", "theme", "milestone", "title", "heading"],
  initiative: ["initiative", "subinitiative", "workstream", "item", "capability"],
  task: ["task", "taskname", "activity", "action", "description", "details", "deliverable"],
  status: ["status", "taskstatus", "progress", "state", "completion"],
  assignee: ["assignee", "owner", "responsible", "assignedto"],
};

const PHASES = ["establish", "enhance", "optimize"];
const DIMENSIONS = ["people", "process", "technology"];
const CANONICAL_PHASES = ["Establish", "Enhance", "Optimize"];
const CANONICAL_DIMENSIONS = ["People", "Process", "Technology"];

const clean = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const headerKey = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");

const findAlias = (value) => {
  const key = headerKey(value);
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
    if (unique.has("category") || unique.has("task")) fallback = rowIndex;
    if (
      unique.size >= 2 &&
      (unique.has("phase") || unique.has("dimension")) &&
      (unique.has("category") || unique.has("task"))
    ) {
      return rowIndex;
    }
  }

  return fallback;
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

  if (headerRow >= 0) {
    const rawHeaders = rows[headerRow];
    const headers = rawHeaders.map(findAlias);
    const dataRows = rows.slice(headerRow + 1);

    for (const cells of dataRows) {
      const row = {};
      const details = {};
      headers.forEach((field, index) => {
        const headerName = clean(rawHeaders[index]);
        const value = clean(cells[index]);
        if (headerName && value) details[headerName] = value;
        if (field && !row[field]) row[field] = value;
      });

      const rowPhase = row.phase || findKnownValue(cells, PHASES);
      const rowDimension = row.dimension || findKnownValue(cells, DIMENSIONS);
      if (rowPhase) lastPhase = canonicalPhase(rowPhase);
      if (rowDimension) {
        lastDimension = canonicalDimension(rowDimension);
      }
      const header = row.header || row.category || lastCategory || row.initiative || getFirstText(cells);
      if (header) lastCategory = header;

      const initiative = row.initiative || row.category || row.task || header;
      const task = row.task || initiative || header;
      if (!header && !initiative && !task) continue;

      parsed.push({
        phase: lastPhase || "Establish",
        dimension: lastDimension || "People",
        header,
        initiative,
        task,
        status: row.status || "todo",
        assignee: row.assignee || details.Assignee || "",
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

const rowsFromWorkbook = (workbook) => {
  const allRows = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = rowsFromSheet(workbook.Sheets[sheetName], sheetName);
    if (rows.length) allRows.push(...rows);
    if (allRows.length >= 120) break;
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

const googleSheetCsvUrl = ({ sheetId, gid }) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid || "0")}`;

const rowsFromCsvText = (csvText) => {
  const workbook = XLSX.read(csvText, { type: "string" });
  return rowsFromWorkbook(workbook);
};

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sheetSyncUrl, setSheetSyncUrl] = useState("");
  const [isSheetSyncing, setIsSheetSyncing] = useState(false);
  const [sheetSyncStatus, setSheetSyncStatus] = useState("");
  const sheetSyncRef = useRef(null);

  const handleFile = async (file) => {
    setError(null);
    setLoading(true);
    try {
      let rows;
      if (file === "__SAMPLE__") {
        rows = sampleRows;
        setFileName("Sample roadmap data");
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        rows = rowsFromWorkbook(wb);
        if (!rows.length) {
          throw new Error(
            "I could not find dashboard rows in this Excel file. Add at least a category or task column, or include roadmap text in the sheet."
          );
        }
        setFileName(file.name);
      }

      const tree = groupData(rows);
      if (Object.keys(tree).length === 0) {
        throw new Error("No valid rows found in the file.");
      }

      // Brief processing delay for UX
      await new Promise((r) => setTimeout(r, 350));
      setData(tree);
    } catch (e) {
      setError(e.message || "Failed to parse file. Please check the format.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAndApplySheet = async (url) => {
    const parsed = parseGoogleSheetUrl(url);
    if (!parsed) {
      throw new Error("Paste a valid Google Sheets URL.");
    }

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
    setFileName("Google Sheet sync");
    setSheetSyncStatus(`Updated ${new Date().toLocaleTimeString()}`);
  };

  const startGoogleSheetSync = async (url) => {
    const trimmed = String(url || sheetSyncUrl || "").trim();
    if (!trimmed) {
      setError("Paste your Google Sheets URL first.");
      return;
    }

    setError(null);
    setSheetSyncUrl(trimmed);

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
    }
  };

  const stopGoogleSheetSync = () => {
    if (sheetSyncRef.current) {
      clearInterval(sheetSyncRef.current);
      sheetSyncRef.current = null;
    }
    setIsSheetSyncing(false);
    setSheetSyncStatus("");
  };

  useEffect(() => {
    return () => {
      if (sheetSyncRef.current) clearInterval(sheetSyncRef.current);
    };
  }, []);

  if (!data) {
    return <FileUpload onFile={handleFile} error={error} isLoading={loading} />;
  }

  return (
    <DashboardCanvas
      tree={data}
      onReset={() => {
        stopGoogleSheetSync();
        setData(null);
        setFileName("");
      }}
      fileName={fileName}
      googleSheetUrl={sheetSyncUrl}
      onGoogleSheetUrlChange={setSheetSyncUrl}
      onStartSheetSync={startGoogleSheetSync}
      onStopSheetSync={stopGoogleSheetSync}
      isSheetSyncing={isSheetSyncing}
      sheetSyncStatus={sheetSyncStatus}
    />
  );
}
