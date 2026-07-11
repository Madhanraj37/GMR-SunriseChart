import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogOut, UserPlus } from "lucide-react";

// Two-letter initials from a display name (preferred) or email.
const getInitials = (name, email) => {
  const source = String(name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const Avatar = ({ name, email, size = 32 }) => (
  <span
    className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.38,
      background: "linear-gradient(135deg, #00437A, #1A6FB0 55%, #FF9216)",
      boxShadow: "0 2px 6px rgba(0,67,122,0.35)",
    }}
  >
    {getInitials(name, email)}
  </span>
);

/**
 * AccountMenu
 * Professional account control: an avatar button that opens a dropdown to
 * view the signed-in identity, switch between signed-in accounts, add another
 * account, or sign out.
 */
export default function AccountMenu({
  userName,
  userEmail,
  accounts = [],
  activeUsername,
  onSignOut,
  onAddAccount,
  onSwitchAccount,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const others = accounts.filter((a) => a.username !== activeUsername);
  const displayName = userName || userEmail || "Account";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-1.5 pr-2 transition-colors hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={userName} email={userEmail} size={26} />
        <span className="hidden max-w-[150px] truncate text-[13px] font-semibold text-slate-700 sm:inline">
          {displayName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            role="menu"
          >
            {/* Identity */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
              <Avatar name={userName} email={userEmail} size={38} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold text-slate-900">
                  {displayName}
                </div>
                <div className="truncate text-[12px] text-slate-500">
                  {userEmail}
                </div>
              </div>
            </div>

            {/* Switch accounts */}
            {others.length > 0 && (
              <div className="border-b border-slate-100 py-1.5">
                <div className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch account
                </div>
                {others.map((acc) => (
                  <button
                    key={acc.homeAccountId || acc.username}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      onSwitchAccount?.(acc);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-slate-50"
                  >
                    <Avatar name={acc.name} email={acc.username} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-slate-700">
                        {acc.name || acc.username}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {acc.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="py-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onAddAccount?.();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4 text-slate-500" />
                Add another account
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut?.();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
