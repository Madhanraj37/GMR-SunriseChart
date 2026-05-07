import React, { useEffect, useState } from "react";
import { X, Save, Square } from "lucide-react";

export default function SettingsModal({
  open,
  initialUrl,
  onClose,
  onSave,
  isSaving,
  isSheetSyncing,
  onStopSync,
}) {
  const [value, setValue] = useState(initialUrl || "");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialUrl || "");
      setLocalError("");
    }
  }, [open, initialUrl]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      setLocalError("Add a Google Sheet URL first.");
      return;
    }
    setLocalError("");
    try {
      await onSave?.(trimmed);
    } catch (e) {
      setLocalError(e.message || "Failed to save Google Sheet URL.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Settings
            </div>
            <div className="text-lg font-bold text-slate-900">Google Sheet source</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Google Sheet URL</label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Paste the Google Sheet link"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
            <p className="mt-2 text-xs text-slate-500">
              This link is stored locally in your browser and reused each time you open the dashboard.
            </p>
          </div>

          {localError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {localError}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            {isSheetSyncing ? (
              <button
                type="button"
                onClick={onStopSync}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                <Square className="h-3.5 w-3.5" />
                Stop Sync
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save & Sync"}
          </button>
        </div>
      </div>
    </div>
  );
}
