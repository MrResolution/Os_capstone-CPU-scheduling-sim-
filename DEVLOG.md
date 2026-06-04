# 🪵 CPUSim.OS — Development Log

A chronological journey of building a modern CPU Scheduling Simulator.

---

## 📅 Chronology of Development

### Phase 1: Core Mathematical Model & Engine Parity
- **Goal**: Write robust simulation engines in both Python and TypeScript that output mathematically identical results for all workloads.
- **Milestones**:
  - Defined strict type definitions / dataclasses (`ProcessInput`, `ExecBlock`, `ProcessMetrics`, `SimulationResult`) to guarantee identical state signatures.
  - Implemented core scheduling algorithms:
    - **FCFS** (First-Come, First-Served)
    - **SJF** (Shortest Job First)
    - **SRTF** (Shortest Remaining Time First)
    - **Priority Scheduling**
    - **Round Robin (RR)** with dynamic time quantums.
    - **Multi-Level Feedback Queue (MLFQ)** using a three-tier queue system ($Q_0, Q_1, Q_2$).
  - Developed a deterministic algorithm to resolve tie-breakers (e.g., if arrival times and burst times match, prioritize by numerical process ID $P1 < P2 < P3$).
  - Verified math parity using complex workload presets.

---

### Phase 2: Native Python Interface (CustomTkinter + Matplotlib)
- **Goal**: Implement a clean, responsive, dark-themed native desktop interface in Python.
- **Milestones**:
  - Leveraged `customtkinter` to step away from traditional, outdated Tkinter styling.
  - Configured a clean grid layout separating config sidebars, stats cards, and timeline areas.
  - Embedded `matplotlib` charts directly into Tkinter canvas widgets (`FigureCanvasTkAgg`).
  - Added timer-based playback (`self.after()`) with adjustable speed settings ($1x, 2x, 4x, 8x$) and slider scrubbers.
  - Integrated ready queue chips that render dynamically as the user scrubs through time.

---

### Phase 3: Web-Based Interface (React + TypeScript + Tailwind)
- **Goal**: Develop a stunning, glassmorphic web UI that provides an immersive and interactive user experience.
- **Milestones**:
  - Setup a modern build system using Vite, React 19, and Tailwind CSS.
  - Designed a high-fidelity dashboard incorporating modern visual elements:
    - Sleek dark background (`#0A0A0B`) with subtle borders.
    - Status chips displaying active execution state (Running, Ready, Completed, Pending).
    - Glowing logo drop-shadows.
  - Integrated `recharts` to render responsive bar charts comparing Average Turnaround Time and Average Waiting Time across all algorithms simultaneously.
  - Built an SVG-based, fluid Gantt Chart timeline that highlights the active executing process and updates dynamically with CSS transitions.

---

### Phase 4: Desktop Packaging & Electron Wrapper
- **Goal**: Wrap the web application into a native desktop package for distribute-ready desktop applications.
- **Milestones**:
  - Configured Electron in `electron/main.cjs` to launch a window reading the production-built Vite bundle.
  - Updated `package.json` with scripts to build, test, and package Electron.
  - Added `electron-builder` configurations supporting cross-platform packaging:
    - Linux builds producing standard Debian packages (`.deb`) and standalone `AppImage` files.
    - Windows builds using the NSIS installer framework.

---

## ⚡ Challenges, Discoveries & Technical Solutions

### 1. The Context Switch Counting Problem
* **Problem**: Standard definitions of context switches count transitions between processes. However, naive implementations counted transitions to and from the `IDLE` state as context switches, artificially doubling the count. Additionally, back-to-back blocks of the same process (which can happen under some quantum boundaries) were miscounted.
* **Solution**: Before counting context switches, the simulation log is filtered to compress consecutive blocks of the identical process ID. Transitions to and from the `IDLE` state are explicitly ignored when computing the final `contextSwitches` metric.

### 2. State-at-Tick Parity
* **Problem**: Rendering the ready queue in real-time as the simulation plays required reconstructing the scheduler's internal state (which processes were in the ready queue, which were completed, which hadn't arrived) at any arbitrary tick $t$. Redoing the scheduling loop from scratch for every frame was inefficient.
* **Solution**: Designed a unified historical parsing helper (`getStateAtTick`) in both TypeScript and Python. This helper calculates the cumulative execution time for each process up to tick $t$ based solely on the final Gantt Chart log, making UI scrubbing extremely fast and lag-free.

### 3. Matplotlib Rendering Overhead
* **Problem**: In the Python customtkinter app, calling `ax.clear()` and redrawing the Gantt Chart and comparison graphs at every timer tick during playback created noticeable lag, especially when playing at $8x$ speed.
* **Solution**: Optimized the matplotlib draw calls by strictly formatting tick labels, using tight layout paddings, and capping the maximum playback rate to ensure the Tkinter event loop remains fluid.

---

## 🚀 Lessons Learned
1. **Engine Parity**: Having a dual implementation is a great way to verify correctness. When debugging complex scheduling loops like MLFQ, comparing TypeScript's ready-queue arrays with Python's list queues immediately highlighted logic edge cases.
2. **Unified Assets**: Using standard SVGs, clean fonts (Inter), and matching HEX color palettes across both customtkinter and CSS styles helped maintain a consistent visual identity.
