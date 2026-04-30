// ────────────────────────────────────────────────────────────────────────────
//  THEME TOKENS
// ────────────────────────────────────────────────────────────────────────────
export const PHASE_COLORS = {
  Establish: { from: "#F51A2C", to: "#F51A2C", solid: "#F51A2C", header: "#F51A2C" },
  Enhance:   { from: "#FF9216", to: "#FF9216", solid: "#FF9216", header: "#FF9216" },
  Optimize:  { from: "#00437A", to: "#00437A", solid: "#00437A", header: "#00437A" },
};

export const STATUS_META = {
  done:       { color: "#22c55e", bg: "rgba(34,197,94,0.15)",  label: "Done" },
  inprogress: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", label: "In Progress" },
  todo:       { color: "#ef4444", bg: "rgba(239,68,68,0.15)",  label: "To Do" },
};

// Canvas dimensions — drives ALL coordinate math (1480 x 760 virtual)
export const CANVAS_W = 1480;
export const CANVAS_H = 690;
export const HEADER_H = 34;
export const LEFT_GUTTER = 86;
export const BOTTOM_LABEL = 64;

// Phase header band horizontal divisions
export const PHASE_BANDS = {
  Establish: { x0: LEFT_GUTTER, x1: 410 },
  Enhance:   { x0: 410,         x1: 750 },
  Optimize:  { x0: 750,         x1: CANVAS_W - 58 },
};

// ────────────────────────────────────────────────────────────────────────────
//  COORDINATE MAPPING (phase + dimension + category → x,y)
//  Hand-tuned to match the reference image precisely.
//  Coordinates are in CANVAS space (1480×760).
//  y = 0 is just below the header band (HEADER_H is added at render time).
// ────────────────────────────────────────────────────────────────────────────
export const CATEGORY_POSITIONS = {
  // ── ESTABLISH (red zone) ──────────────────────────────────────────────
  "Establish::People::Stable, Credible leadership pipeline": { x: 95,  y: 70 },
  "Establish::People::Self-sustaining Talent ecosystem":      { x: 245, y: 70 },
  "Establish::People::Performance Management":                { x: 95,  y: 230 },
  "Establish::People::Design and Execute EVP":                { x: 245, y: 195 },
  "Establish::Process::Move from projects toContinuous Improvementculture": { x: 95,  y: 360 },
  "Establish::Process::Portfolio Expansion":                  { x: 280, y: 340 },
  "Establish::Technology::S4HANA":                            { x: 360, y: 510 },

  // ── ENHANCE (orange zone) ─────────────────────────────────────────────
  "Enhance::People::Brand Campaign":                          { x: 470, y: 70 },
  "Enhance::People::New Ways of Working":                     { x: 470, y: 175 },
  "Enhance::People::People Development":                      { x: 615, y: 70 },
  "Enhance::Process::CoE Transition":                         { x: 615, y: 220 },
  "Enhance::Process::Continuous Improvement become a way of life": { x: 480, y: 280 },
  "Enhance::Process::Continuous Improvement":                 { x: 480, y: 280 },
  "Enhance::Process::Core Business Function Pilot":           { x: 510, y: 380 },
  "Enhance::Technology::Automation Strategy":                 { x: 620, y: 490 },
  "Enhance::Technology::Reposition Tech":                     { x: 750, y: 405 },

  // ── OPTIMIZE (dark blue zone) ─────────────────────────────────────────
  "Optimize::People::Performance Culture":                    { x: 850,  y: 70 },
  "Optimize::People::Learning Organization":                  { x: 1010, y: 70 },
  "Optimize::People::Employee Experience":                    { x: 1145, y: 70 },
  "Optimize::Process::Core Business Transitions":             { x: 870,  y: 220 },
  "Optimize::Process::Process Excellence":                    { x: 1080, y: 195 },
  "Optimize::Technology::Tech-embedded Capability building":  { x: 1190, y: 360 },
  "Optimize::Technology::Tech-embedded Capability":           { x: 1190, y: 360 },
};

// Fallback layout when categories don't match a known key
export const FALLBACK_REGIONS = {
  "Establish::People":     { x: 95,   y: 80 },
  "Establish::Process":    { x: 95,   y: 360 },
  "Establish::Technology": { x: 250,  y: 510 },
  "Enhance::People":       { x: 470,  y: 80 },
  "Enhance::Process":      { x: 480,  y: 295 },
  "Enhance::Technology":   { x: 510,  y: 525 },
  "Optimize::People":      { x: 870,  y: 80 },
  "Optimize::Process":     { x: 870,  y: 260 },
  "Optimize::Technology":  { x: 1190, y: 360 },
};
