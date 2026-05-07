import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export default function FileUpload({ onFile, error, isLoading }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (isLoading) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-8"
      style={{
        background:
          "radial-gradient(ellipse at top, #fef9f0 0%, #fff 50%, #f5f7fb 100%)",
      }}
    >
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            HARTS - GMR Tranformation Maturity Framework
          </div>
          <h1
            className="text-4xl font-bold text-slate-900 mb-3"
            style={{ letterSpacing: "-0.025em" }}
          >
            Establish · <span className="text-orange-500">Enhance</span> ·{" "}
            <span className="text-blue-900">Optimize</span>
          </h1>
          <p className="text-slate-600 text-[15px] max-w-md mx-auto leading-relaxed">
            Upload your transformation roadmap to visualize progress across
            People, Process, and Technology dimensions.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!isLoading) inputRef.current?.click();
          }}
          className="relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden"
          style={{
            borderColor: drag ? "#EE8A1A" : "#cbd5e1",
            background: drag ? "rgba(238,138,26,0.06)" : "white",
            padding: "60px 32px",
            boxShadow: drag
              ? "0 12px 36px rgba(238,138,26,0.18)"
              : "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: drag
                  ? "linear-gradient(135deg, #EE8A1A, #E63946)"
                  : "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
                transition: "background 0.3s",
              }}
            >
              {isLoading ? (
                <RotateCcw className="w-7 h-7 text-white animate-spin" />
              ) : (
                <Upload
                  className={`w-7 h-7 ${drag ? "text-white" : "text-slate-500"}`}
                />
              )}
            </div>
            <div className="text-slate-900 font-semibold text-lg mb-1">
              {isLoading
                ? "Processing..."
                : drag
                ? "Drop your file here"
                : "Drop Excel file or click to browse"}
            </div>
            <div className="text-slate-500 text-[13px] mb-4">
              Supports .xlsx, .xls — status is optional and headers can be flexible
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={isLoading}
              onChange={(e) => {
                if (e.target.files?.[0]) onFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoading) inputRef.current?.click();
              }}
            >
              <FileSpreadsheet className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Choose File
            </button>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px]"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sample data */}
        <div className="mt-5 text-center">
          <button
            onClick={() => onFile("__SAMPLE__")}
            className="text-[13px] text-slate-500 hover:text-orange-600 font-medium transition-colors underline-offset-4 hover:underline"
          >
            or load sample data →
          </button>
        </div>
      </div>
    </div>
  );
}
