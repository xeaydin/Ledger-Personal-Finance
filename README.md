# Personal Finance App (Demo)

Desktop-first **personal finance dashboard** for tracking income, expenses, investments, and a **net worth trajectory** with configurable history and forecast windows. This repository is a **demo / structural baseline** suitable for GitHub: it documents how the app is organized, what it expects from users and environments, and where development can go next.

---

## 1. Structural plan (repository layout)

| Path | Purpose |
|------|---------|
| `src/main.tsx` | React entry; mounts the app root. |
| `src/App.tsx` | `HashRouter` routes, layout shell (`Sidebar` + `main`). |
| `src/index.css` | Global styles and design tokens. |
| `src/context/AppDataContext.tsx` | **Single source of app state**: incomes, spends, assets, schedules, liquid cash; **persists to `localStorage`** (`ledger-app-data-v1`). |
| `src/pages/` | Feature screens: `Overview`, `Income`, `Expenses`, `Investments`, `Settings`. |
| `src/components/` | Shared UI: `ForecastChart`, `Sidebar`, `ui/*` primitives. |
| `src/utils/` | Domain helpers: `netWorthSeries.ts` (chart series, tracking anchor), `scheduleDates.ts` (pending expense windows). |
| `electron/main.ts` | Electron **main** process: window, preload path, dev server URL in development. |
| `electron/preload.ts` | Preload bridge (IPC-ready pattern; expand as needed). |
| `vite.config.ts` | Vite + React + **vite-plugin-electron** + renderer plugin; dev server binding. |
| `dist/` | Web/renderer production build output. |
| `dist-electron/` | Electron main/preload build output (dev watch + production). |

**Data flow (high level):** user actions on pages → React state updaters in `AppDataContext` → `useEffect` persistence → chart/overview read the same state and utilities (`buildNetWorthChartPoints`, etc.).

---

## 2. User requirements

These describe **what end users should be able to do** and **what the product assumes** about them.

- **Single-user, local-first:** one dataset per browser profile / Electron user data; no built-in multi-user or cloud sync in this demo.
- **Track money in and out:** record **fixed** and **variable** income (with dates); record **day spendings** (with optional per-entry date), **fixed costs**, and **installments** (principal over months).
- **See liquidity and risk signals:** liquid cash, portfolio-style holdings, **near-term pending expenses**, and optional warnings when cash is insufficient for near-term dues.
- **Plan visually:** a **net worth trajectory** chart with history ranges (weeks/months) and forecast ranges (weeks/months), summary pills (fixed income, expenses, net/month, projected end).
- **Understand chart semantics:** pre-tracking period is a **fixed baseline** (configurable constant in code); from the **tracking start date**, history is reconstructed backward from **current** net worth using recurring expense spread plus **dated** income and day spendings so transactions affect **their** dates, not arbitrary past samples.
- **Operate in a desktop shell or browser:** dev experience supports **Electron + Vite**; the UI also loads in a browser at the dev server URL for quick UI work (Electron-only features stay minimal in this demo).

---

## 3. Technical requirements

| Area | Requirement |
|------|----------------|
| **Runtime** | Node.js compatible with Vite 7 and Electron 32 (see `package.json` engines implicitly via tooling). |
| **OS** | Windows / macOS / Linux for development; Electron packaging not fully scripted in this demo—`npm run build` produces web + electron artifacts. |
| **Browser / WebView** | Modern Chromium (Electron) or evergreen browser for dev. |
| **Storage** | `localStorage` for app JSON blob; respect quota and private mode limitations in browsers. |
| **Network** | None required for core features (offline-capable UI once loaded). |
| **Build** | TypeScript project references (`tsc -b`) + Vite build for renderer and electron entries. |

**Non-goals in current demo:** hardened security review, production auto-update pipeline, encrypted at-rest storage, and automated backup—listed under roadmap for future work.

---

## 4. Tech stack

| Layer | Technology |
|-------|------------|
| **UI** | React 19, TypeScript ~5.9 |
| **Routing** | React Router 7 (`HashRouter` for static/electron-friendly paths) |
| **Build / dev** | Vite 7, `@vitejs/plugin-react` |
| **Desktop** | Electron 32, `vite-plugin-electron` (+ renderer helper) |
| **Icons** | `lucide-react` |
| **Linting** | ESLint 9 + TypeScript ESLint + React hooks / refresh plugins |
| **Optional native module** | `better-sqlite3` is listed as a dependency (prepared for future persistence); **not wired** in the current UI path—data today is **localStorage**-backed. |

---

## 5. Key features (implemented)

- **Overview:** metrics (liquid cash, near-term pending expenses), **today’s net (variable)** card with show/hide preference, **scheduled workflows** (pending → approve; income/expense behavior on approve), **net worth trajectory** card.
- **Net worth chart:** history intervals (e.g. 4w/8w and 1/3/6/12 months), forecast intervals (4w/8w/6m), fixed-income-driven forecast bands, OLS trend line, Y-axis focus on recent + forecast for readability.
- **Income:** fixed vs variable entries; variable affects **liquid cash** on add/delete; allocations UI.
- **Expenses:** day spendings (with **date**), installments, fixed costs; day spendings adjust liquid on add/delete.
- **Investments:** asset list (units × value) feeding **portfolio** total in overview/chart inputs.
- **Settings:** categories and preferences surfaced from context (extend as needed).
- **Persistence:** automatic save of full `AppDataState` to `localStorage` on change.
- **Chart logic (see `src/utils/netWorthSeries.ts`):** `NET_WORTH_TRACKING_START_ISO`, `PRE_TRACKING_NET_WORTH`, `buildLiquidityDeltaByDate`, `buildNetWorthChartStructure`, `buildNetWorthChartPoints`.

---

## 6. Scripts

```bash
npm install          # dependencies
npm run dev          # Vite dev server + Electron (see vite.config server host/port)
npm run build        # Typecheck + Vite production build (web + electron outputs)
npm run preview      # Preview production web build
npm run lint         # ESLint
```

Dev server defaults are configured in `vite.config.ts` (e.g. `127.0.0.1:5173` with `strictPort: false`); if the port is busy, use the URL printed in the terminal.

---

## 7. Possible updates & development backlog

Use this as a **backlog you can edit** for issues and milestones.

### Product / UX

- [ ] User-editable **tracking start** and **pre-tracking net worth** in Settings (today: constants in `netWorthSeries.ts`).
- [ ] **Export / import** JSON (or CSV) for backup and migration between devices.
- [ ] **Multi-currency** and exchange-rate source (even manual rates per account).
- [ ] **Budgets** per category with alerts vs day spendings.
- [ ] **Recurring rules** (e.g. monthly rent on Nth day) instead of only manual entries.
- [ ] **Dark/light** theme toggle persisted per user.
- [ ] Onboarding / empty states for first-time users.

### Data & architecture

- [ ] Replace or supplement `localStorage` with **SQLite** via `better-sqlite3` in the main process (schema versioning, migrations).
- [ ] Formal **domain layer** (entities + use-cases) decoupled from React components for testability.
- [ ] **Conflict-free** or **sync** strategy if cloud backup is added later.

### Charting & analytics

- [ ] Optional **full transaction ledger** for exact historical net worth instead of reconstructed series.
- [ ] **Scenario sliders** (income/expense stress tests) on the forecast.
- [ ] **Annotations** on chart (major purchases, life events).

### Quality & delivery

- [ ] **Unit tests** for `netWorthSeries` and `scheduleDates` (Vitest).
- [ ] **E2E** smoke tests (Playwright) for critical flows.
- [ ] **CI** (GitHub Actions): `npm run build` + lint on PR.
- [ ] **Electron packaging** scripts (`electron-builder` or similar) and code signing notes for release.
- [ ] **Accessibility** audit (keyboard nav, ARIA on chart controls).

### Security & privacy

- [ ] Document threat model for local vs synced data.
- [ ] Optional **app lock** (PIN) before showing balances.

---

## 8. Contributing & license

This project is marked **private** in `package.json`; adjust visibility and **LICENSE** when publishing to GitHub. For contributions, prefer small PRs aligned with the structure in §1 and keep chart/finance semantics documented when changing `netWorthSeries.ts`.

---

*Last updated: structural README for GitHub / solution-architecture overview.*
