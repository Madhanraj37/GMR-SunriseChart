import React, { useState } from "react";
import * as XLSX from "xlsx";

import FileUpload from "./components/FileUpload.jsx";
import DashboardCanvas from "./components/DashboardCanvas.jsx";
import { groupData } from "./utils.js";
import { sampleRows } from "./sampleData.js";

const HEADER_ALIASES = {
  phase: ["phase", "stage", "maturityphase", "maturitystage"],
  dimension: ["dimension", "dim", "pillar", "track", "stream", "workstream", "area"],
  category: ["category", "theme", "initiative", "capability", "milestone", "title", "heading"],
  task: ["task", "activity", "action", "item", "description", "details", "deliverable"],
  status: ["status", "progress", "state", "completion"],
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
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

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
    const headers = rows[headerRow].map(findAlias);
    const dataRows = rows.slice(headerRow + 1);

    for (const cells of dataRows) {
      const row = {};
      headers.forEach((field, index) => {
        if (field && !row[field]) row[field] = clean(cells[index]);
      });

      const rowPhase = row.phase || findKnownValue(cells, PHASES);
      const rowDimension = row.dimension || findKnownValue(cells, DIMENSIONS);
      if (rowPhase) lastPhase = canonicalPhase(rowPhase);
      if (rowDimension) {
        lastDimension = canonicalDimension(rowDimension);
      }
      if (row.category) lastCategory = row.category;

      const category = row.category || lastCategory || row.task || getFirstText(cells);
      const task = row.task || category;
      if (!category && !task) continue;

      parsed.push({
        phase: lastPhase || "Establish",
        dimension: lastDimension || "People",
        category,
        task,
        status: row.status || "todo",
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
    const category = meaningful[0];
    const task = meaningful.slice(1).join(" - ") || category;
    if (!category) continue;

    parsed.push({
      phase: lastPhase || "Establish",
      dimension: lastDimension || "People",
      category,
      task,
      status: "todo",
    });
  }

  return parsed;
};

const rowsFromWorkbook = (workbook) =>
  workbook.SheetNames.flatMap((sheetName) =>
    rowsFromSheet(workbook.Sheets[sheetName], sheetName)
  );

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

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

  if (!data) {
    return <FileUpload onFile={handleFile} error={error} isLoading={loading} />;
  }

  return (
    <DashboardCanvas
      tree={data}
      onReset={() => {
        setData(null);
        setFileName("");
      }}
      fileName={fileName}
    />
  );
}
