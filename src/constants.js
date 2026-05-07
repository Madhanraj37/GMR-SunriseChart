export const PHASE_COLORS = {
  Establish: { from: "#F51A2C", to: "#F51A2C", solid: "#F51A2C", header: "#F51A2C" },
  Enhance: { from: "#FF9216", to: "#FF9216", solid: "#FF9216", header: "#FF9216" },
  Optimize: { from: "#00437A", to: "#00437A", solid: "#00437A", header: "#00437A" },
};

export const STATUS_META = {
  done: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", label: "Done" },
  inprogress: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", label: "In Progress" },
  todo: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", label: "To Do" },
};

export const CANVAS_W = 1480;
export const CANVAS_H = 650;
export const HEADER_H = 34;
export const LEFT_GUTTER = 64;
export const BOTTOM_LABEL = 34;

export const PHASE_BANDS = {
  Establish: { x0: LEFT_GUTTER, x1: 430 },
  Enhance: { x0: 430, x1: 775 },
  Optimize: { x0: 775, x1: CANVAS_W - 92 },
};

// Hand-tuned against the second reference image. Coordinates are in canvas
// space, and the task renderer adds HEADER_H below the phase header band.
export const CATEGORY_POSITIONS = {
  "Establish::People::Stable, Credible leadership pipeline": { x: 90, y: 35 },
  "Establish::People::Self-sustaining Talent ecosystem": { x: 255, y: 46 },
  "Establish::People::Performance Management": { x: 90, y: 168 },
  "Establish::People::Design and Execute an attractive EVP": { x: 220, y: 150 },
  "Establish::Process::Move from projects toContinuous Improvementculture": { x: 110, y: 304 },
  "Establish::Process::Portfolio Expansion": { x: 270, y: 304 },
  "Establish::Technology::S4HANA": { x: 330, y: 498 },

  "Enhance::People::Brand campaign": { x: 438, y: 38 },
  "Enhance::People::New Ways of Working": { x: 446, y: 122 },
  "Enhance::People::People Development": { x: 620, y: 62 },
  "Enhance::Process::CoE Transition": { x: 680, y: 220 },
  "Enhance::Process::Continuous improvement becomes a way of life": { x: 456, y: 264 },
  "Enhance::Process::Continuous Improvement": { x: 456, y: 264 },
  "Enhance::Process::Core Business Function Pilot": { x: 516, y: 334 },
  "Enhance::Technology::Automation Strategy": { x: 570, y: 430 },
  "Enhance::Technology::Reposition Tech": { x: 742, y: 392 },

  "Optimize::People::Performance Culture": { x: 812, y: 24 },
  "Optimize::People::Learning Organization": { x: 962, y: 24 },
  "Optimize::People::Employee Experience": { x: 1114, y: 24 },
  "Optimize::Process::Core Business Transitions": { x: 842, y: 206 },
  "Optimize::Process::Process Excellence": { x: 1052, y: 158 },
  "Optimize::Technology::Tech-embedded Capability building": { x: 1158, y: 308 },
  "Optimize::Technology::Tech-embedded Capability": { x: 1158, y: 308 },
};

export const FALLBACK_REGIONS = {
  "Establish::People": { x: 92, y: 80 },
  "Establish::Process": { x: 92, y: 300 },
  "Establish::Technology": { x: 260, y: 470 },
  "Enhance::People": { x: 450, y: 80 },
  "Enhance::Process": { x: 480, y: 260 },
  "Enhance::Technology": { x: 580, y: 430 },
  "Optimize::People": { x: 820, y: 80 },
  "Optimize::Process": { x: 850, y: 225 },
  "Optimize::Technology": { x: 1160, y: 320 },
};
