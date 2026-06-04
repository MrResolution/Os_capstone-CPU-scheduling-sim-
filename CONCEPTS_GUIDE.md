# CPUsim: Concepts & Features Guide

Welcome to **CPUsim**, a high-fidelity interactive CPU scheduling simulation suite. This guide is designed to help you understand the core operating systems concepts, the algorithm scheduling engines, the custom Algorithm Lab sandbox, and the advanced simulation parameters available in this tool.

---

## 📖 Core CPU Scheduling Concepts

In multitasking operating systems, the **CPU Scheduler** is the subsystem that determines which process in the ready queue receives the CPU's execution time. The goal is to maximize efficiency, fairness, and responsiveness.

### ⏱️ Key Performance Metrics
CPUsim calculates and plots these metrics in real-time to compare scheduling efficiency:

*   **Arrival Time ($A$):** The tick at which a process enters the system and becomes ready for execution.
*   **Burst Time ($B$):** The total CPU time required by the process to complete its execution.
*   **Completion Time ($C$):** The tick at which the process finishes execution and leaves the system.
*   **Turnaround Time (TAT):** The total time elapsed from process arrival to completion.
    $$\text{TAT} = C - A$$
*   **Waiting Time (WT):** The cumulative time a process spends waiting in the ready queue.
    $$\text{WT} = \text{TAT} - B$$
*   **Response Time (RT):** The time elapsed between process arrival and its very first execution on the CPU.
    $$\text{RT} = \text{First Exec Time} - A$$
*   **CPU Utilization (%):** The percentage of total simulation time during which the CPU was actively executing process instructions (not idle or performing context-switching overhead).
*   **Throughput:** The rate at which the system completes processes, computed as:
    $$\text{Throughput} = \frac{\text{Total Completed Processes}}{\text{Total Simulation Duration}}$$

### 🔄 Preemption vs. Non-Preemption
*   **Non-Preemptive:** Once a process is allocated the CPU, it holds it until it completes or voluntarily blocks (e.g., FCFS, SJF, non-preemptive Priority).
*   **Preemptive:** The scheduler can interrupt a running process at any tick and assign the CPU to another process based on priority, time slices, or remaining execution time (e.g., SRTF, RR, MLFQ).

---

## ⚙️ The 6 Core Scheduling Algorithms

CPUsim implements identical logic for the six classical operating system scheduling algorithms across both the Web/Electron frontend and the CustomTkinter desktop interface:

| Algorithm | Type | Description / Selection Rule |
| :--- | :--- | :--- |
| **FCFS** (First-Come, First-Served) | Non-Preemptive | Processes are executed in the exact order of their arrival. Simple but prone to the **convoy effect** (short processes stuck behind a long process). |
| **SJF** (Shortest Job First) | Non-Preemptive | Picks the arrived process with the shortest execution burst time. Minimizes average waiting time. |
| **SRTF** (Shortest Remaining Time First) | Preemptive | A preemptive version of SJF. Re-evaluates on every tick; the process with the shortest remaining burst time runs next. |
| **Priority** | Preemptive | Picks the arrived process with the highest priority score (lower numeric value represents higher priority). |
| **Round Robin (RR)** | Preemptive | Cycle processes in a FIFO queue. Each process runs for a maximum of a fixed **Time Quantum**. If it doesn't finish, it is preempted and put back at the tail. |
| **MLFQ** (Multi-Level Feedback Queue) | Preemptive | Uses multiple priority queues ($Q_0, Q_1, Q_2$). New processes start in $Q_0$ (Short Quantum). If they consume their entire quantum, they are demoted to $Q_1$ (Medium Quantum), and then to $Q_2$ (FCFS). Processes yield the CPU if higher-level queues have jobs. |

---

## 🛠️ Advanced Simulator Settings

You can customize the simulation parameters by clicking the **⚙️ Settings** button in the header bar.

### 1. Context Switch Overhead
In real operating systems, switching execution from one process to another is not instantaneous. The CPU must perform a **Context Switch**:
*   Save the registers, program counter, and state of the currently running process.
*   Load the saved state and registers of the next process.

**In CPUsim:**
*   You can set the Context Switch Overhead from **0 to 5 ticks** (default is `0`).
*   When a context switch occurs, a special overhead block (marked **CS** and colored with a hatched/striped pattern) is injected.
*   During this overhead period, time advances but no work is done on the process.
*   Context switches do not occur if the CPU transitions to or from the **IDLE** state.
*   **Performance Impact:** Increasing context switch overhead decreases **CPU Utilization** and increases average **Turnaround Time** and **Waiting Time**.

### 2. Tie-Breaker Strategies
When multiple processes are ready and share the exact same selection priority (e.g., identical remaining burst times in SRTF or identical priority scores in Priority Scheduling), a tie-breaker is required:
*   **PID (Process ID):** Deterministic resolution based on process labels (e.g., `P1` before `P2`, `P2` before `P3`).
*   **FIFO (First-In, First-Out):** Selects the process that has been in the ready queue longest.
*   **LIFO (Last-In, First-Out):** Selects the process that arrived or was queued most recently.

---

## 🧪 The Custom Algorithm Lab

The **Algorithm Lab** is a sandbox designed to let you compose, simulate, and benchmark your own **Custom Hybrid Scheduling Algorithms** in real-time.

```
       ┌────────────────────────┐
       │   Process Ready Queue  │
       └───────────┬────────────┘
                   │
                   ▼
         [ Rule 1: Shortest Burst ]  ── Filter (e.g., keeps P2, P4)
                   │
                   ▼
         [ Rule 2: High Priority ]   ── Tie-breaker (e.g., selects P2)
                   │
                   ▼
            Selected Process
```

### 🧱 How the Rule Pipeline Works
Rather than using a single hardcoded algorithm, you compose a **Rule Pipeline**. Rules are evaluated sequentially from top to bottom:
1.  **Rule 1 (Primary Strategy):** Filters the ready queue. For example, *Shortest Burst* will narrow down the ready queue to only the processes with the shortest burst time.
2.  **Rule 2 (Secondary Strategy / Tie-Breaker):** If Rule 1 leaves multiple candidates, Rule 2 is applied to those candidates. For instance, if two processes have the same shortest burst time, a *Highest Priority* rule can break the tie.
3.  **Default Tie-Breaker:** If multiple candidates still remain after passing through the entire pipeline, the system falls back to the global tie-breaker strategy (e.g., PID).

### ⚙️ Rule Configuration Options
*   **Supported Rules:** Shortest Burst, Longest Burst, Highest Priority, Round Robin, FCFS, and Random Select.
*   **Preemption Toggle:** Each rule can be set to **Preemptive** (re-evaluated on every tick, potentially interrupting the current process) or **Non-Preemptive** (only runs when the CPU becomes idle).
*   **Custom Quantum:** When using a *Round Robin* rule inside your pipeline, you can define a custom quantum specific to that rule.

### 📈 Live Sandbox Benchmarking
In the Lab panel, your custom hybrid algorithm's performance is simulated side-by-side with standard algorithms, plotting their average Turnaround and Waiting times on a unified area comparison chart.

---

## 🖥️ Interactive Controls & Workspace

CPUsim provides several interactive features to help you visualize scheduler execution:

1.  **Playback Controls:** Play, pause, step forward/backward tick-by-tick, reset, and set simulation speeds from $1x$ up to $8x$.
2.  **Interactive Gantt Timeline:** Hovering over timeline segments details start and end ticks. Use the playback slider to jump to any point in time.
3.  **Live State Visualization:** Displays the real-time content of the **Ready Queue** and indicates which processes are currently `Running`, `Ready`, `Done`, or `Pending` at the current tick.
4.  **CSV Export:** Save your full quantitative metrics table to a CSV file.
5.  **Procedural Generator & Presets:** Generate randomized workloads or load specific system behaviors (such as I/O-bound or heavy-load scenarios) instantly.
