# CPU<span style="color:#3B82F6">Sim</span>.OS — CPU Scheduling Simulator

<div align="center">
  <img src="logo.png" width="128" height="128" alt="CPUSim.OS Logo" />
  <p><em>A modern, high-fidelity, hybrid CPU scheduling simulator featuring React/Electron & Python/CustomTkinter desktop UIs.</em></p>
</div>

---

## 📖 Introduction

**CPUSim.OS** is a comprehensive educational simulation tool designed to model, visualize, and analyze classical Operating System CPU scheduling algorithms. 

The project stands out with its **dual-engine, hybrid architecture**, allowing you to run it either as a state-of-the-art Web/Electron application styled with modern glassmorphic elements, or as a native, lightweight Python Tkinter desktop application. Both engines share identical execution behavior and mathematical precision.

---

## 🚀 Quick Start

### Web / Electron Desktop Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Launch Web Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.
3. **Launch in Electron (Desktop mode)**:
   ```bash
   npm run electron:dev
   ```

---

### Python Desktop Application

1. **Install Prerequisites**:
   ```bash
   pip install customtkinter matplotlib numpy pillow
   ```
2. **Launch Application**:
   ```bash
   python app.py
   ```

---

## 🛠️ Project Core Documentation

To make it easy to navigate the design, math, and code structures of the simulator, we have divided our documentation into detailed guides:

### 📂 [DOCUMENTATION.md](./DOCUMENTATION.md)
* **Algorithm Guide**: Mathematical details, characteristics, preemption behaviors, and pros/cons of **FCFS, SJF, SRTF, Priority, Round Robin (RR), and Multi-Level Feedback Queue (MLFQ)**.
* **Math Formulas**: Turnaround Time, Waiting Time, Response Time, CPU Utilization, and Throughput calculations.
* **Project Architecture**: Structural layout showing how the React/TypeScript frontend and Python components map together.
* **Build & Deployment instructions**.

### 📂 [DEVLOG.md](./DEVLOG.md)
* **Chronological Milestones**: Step-by-step breakdown of how the mathematical models, python GUI, React UI, and Electron wrappers were designed and built.
* **Engineering Challenges**: Deeper insights into how we resolved problems like context-switch count inflation, high-performance real-time Matplotlib rendering, and cross-language ready queue states.
* **Lessons Learned**: Reflections on implementing complex queues (MLFQ) in multiple languages.

---

## 🎨 Supported Algorithms

| Algorithm | Type | Description |
| :--- | :--- | :--- |
| **FCFS** | Non-Preemptive | First Come First Served — executes tasks in exact order of arrival. |
| **SJF** | Non-Preemptive | Shortest Job First — prioritizes processes with shortest burst times. |
| **SRTF** | Preemptive | Shortest Remaining Time First — preemptive SJF based on remaining burst at each tick. |
| **Priority** | Non-Preemptive | Priority Scheduling — runs tasks based on priority ranks (lower is higher). |
| **RR** | Preemptive | Round Robin — cycles through processes with a fixed time slice (quantum). |
| **MLFQ** | Preemptive | Multi-Level Feedback Queue — adapts priority dynamic queues ($Q_0, Q_1, Q_2$). |

---

## 📊 Shared Metrics Output

For any input process workload, both simulation engines track and display:
- **Average Turnaround Time (TAT)**
- **Average Waiting Time (WT)**
- **Average Response Time (RT)**
- **CPU Utilization (%)**
- **System Throughput (processes/ms)**
- **Total Context Switches**

---

## 📝 License
This project is licensed under the MIT License. See [LICENSE](LICENSE) (if present) for details.
