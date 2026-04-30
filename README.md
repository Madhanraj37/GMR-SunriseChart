# Transformation Maturity Dashboard

A production-grade SaaS dashboard visualizing the **Establish → Enhance → Optimize** transformation framework across People, Process, and Technology dimensions. Built to match an executive-deck reference layout pixel-for-pixel.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and either:

1. Drop your Excel file on the upload area, or
2. Click **"or load sample data"** to see the dashboard with the bundled reference roadmap

## Excel format

The file must have these columns (case-insensitive):

| Phase     | Dimension  | Category               | Task                | Status     |
| --------- | ---------- | ---------------------- | ------------------- | ---------- |
| Establish | People     | Performance Management | OKRs/KPIs/Goals set | done       |
| Enhance   | Process    | CoE Transition         | HR CoE              | inprogress |
| Optimize  | Technology | Tech-embedded ...      | Develop expertise   | todo       |

- **Phase**: `Establish` | `Enhance` | `Optimize`
- **Dimension**: `People` | `Process` | `Technology`
- **Status**: `done` | `inprogress` | `todo`

## Project structure

```
src/
├── App.jsx                      # Top-level state + Excel parsing
├── main.jsx                     # React entry
├── index.css                    # Tailwind + globals
├── constants.js                 # Theme tokens + coordinate map
├── utils.js                     # Data grouping + stats helpers
├── sampleData.js                # Bundled reference roadmap
└── components/
    ├── FileUpload.jsx           # Drag-and-drop landing
    ├── DashboardCanvas.jsx      # Main canvas orchestrator
    ├── PhaseBackground.jsx      # SVG curves + dotted diagonals
    ├── Overlays.jsx             # Headers, axis labels, GMR badge
    ├── CategoryCard.jsx         # Positioned category cards
    ├── ProgressCircle.jsx       # Animated radial progress
    └── TooltipModal.jsx         # Hover tooltip with task list
```

## Key concepts

### Coordinate mapping
Every `(phase, dimension, category)` triplet maps to a hand-tuned `{x, y}` in `constants.js → CATEGORY_POSITIONS`. The canvas runs at a fixed `1480 × 760` virtual size and scales responsively to fit any container width.

To reposition a card, edit its entry in `CATEGORY_POSITIONS`. Unknown categories fall back to `FALLBACK_REGIONS` keyed by `phase::dimension`.

### Curve geometry
The three phase regions are SVG bezier paths in `PhaseBackground.jsx`. The control points define the smooth S-curve transitions between Establish → Enhance → Optimize. Edit those control points to adjust curve sharpness.

### Status → color mapping
Defined once in `constants.js → STATUS_META`. Progress circle thresholds live in `utils.js → getProgressColor`:
- `< 30%` red
- `30–70%` orange
- `≥ 70%` green

## Build for production

```bash
npm run build
npm run preview
```

The `dist/` folder contains the static deployment-ready bundle.

## Tech stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3** for utility styling
- **Framer Motion** for animations
- **lucide-react** for icons
- **SheetJS (xlsx)** for Excel parsing
