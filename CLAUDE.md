# CLAUDE.md

## Project Purpose

IurisVision is a visual analytics app for the Iconocracy doctoral research corpus. Built with React 19 and Vite, it provides interactive visualizations (D3, Recharts) of allegorical figures in legal-political iconography. Includes Gemini AI integration for image analysis.

## Architecture Overview

```
iurisvision/
├── src/
│   ├── components/       # React components (TSX)
│   ├── data/             # Static data files
│   └── lib/              # Utility functions (utils.ts)
├── tools/
│   └── scripts/          # Python automation scripts
├── vite.config.ts        # Vite config (port 3000, React plugin, Tailwind)
├── tsconfig.json         # TypeScript config (ES2022, path alias @/*)
├── package.json          # Dependencies and scripts
└── firebase-*.json       # Firebase configuration
```

**Frontend:** React 19 + TypeScript, bundled by Vite 6.2.
**Styling:** Tailwind CSS 4 (via @tailwindcss/vite plugin) + tailwind-merge + clsx.
**Visualization:** D3.js + Recharts for data charts.
**Animation:** Motion library.
**AI:** Google Generative AI SDK (@google/genai) for image analysis.
**Backend:** Express.js server (API layer).
**Icons:** Lucide React.

## Build & Test Commands

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# TypeScript type-check (no emit)
npm run lint

# Clean build artifacts
npm run clean
```

**Environment setup:** Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.

## Languages & Frameworks

- **TypeScript / TSX** — 15 files, primary application language
- **JavaScript** — config files (vite.config.ts compiles to JS)
- **CSS** — Tailwind utility classes + custom styles
- **HTML** — index.html entry point
- **Python** — automation scripts in tools/scripts/
- **JSON** — config and data files

## Coding Conventions

- Path alias: `@/*` maps to `src/*` (configured in tsconfig.json)
- Components in `src/components/`, utilities in `src/lib/`
- Tailwind class merging via `cn()` utility (clsx + tailwind-merge pattern)
- TypeScript strict mode with ES2022 target
- Vite dev server binds to `0.0.0.0:3000` for network access
- No test framework configured
- No ESLint or Prettier config

## Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Root React component |
| `src/main.tsx` | Application entry point |
| `src/components/` | UI components |
| `src/lib/utils.ts` | Shared utilities (cn helper) |
| `vite.config.ts` | Build configuration |
| `tsconfig.json` | TypeScript settings |
| `.env.example` | Required environment variables template |
