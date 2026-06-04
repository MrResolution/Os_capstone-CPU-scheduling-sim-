import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, BarChart2, Play, Pause, SkipForward, SkipBack, RotateCcw, Download, Shuffle, ChevronDown, Info, Clock, Settings, LayoutGrid, Bell, Search, FolderOpen, FlaskConical } from "lucide-react";
import { type ProcessInput, type Algorithm, type SimulatorSettings, runSimulation, getStateAtTick } from "./lib/scheduler";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer } from "recharts";
import { ALGORITHMS, COLORS, ALGORITHM_INFO, PRESETS, generateRandomProcesses, exportCSV } from "./constants";
import logoUrl from "./assets/logo.png";
import Lab from "./Lab";
import { type LabConfig, runLabSimulation } from "./lib/labScheduler";

export default function App() {
  const [view, setView] = useState<"dashboard" | "lab">("dashboard");
  const [processes, setProcesses] = useState<ProcessInput[]>([]);
  const [algorithm, setAlgorithm] = useState<string>("FCFS");
  const [quantumRR, setQuantumRR] = useState(2);
  const [quantumQ0, setQuantumQ0] = useState(2);
  const [quantumQ1, setQuantumQ1] = useState(4);
  const [newArr, setNewArr] = useState(0);
  const [newBur, setNewBur] = useState(1);
  const [newPri, setNewPri] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [customAlgorithms, setCustomAlgorithms] = useState<LabConfig[]>([]);
  const [selectedCompAlgos, setSelectedCompAlgos] = useState<string[]>([
    "FCFS", "SJF", "SRTF", "Priority", "RR", "MLFQ"
  ]);

  const removeCustomAlgorithm = (name: string) => {
    setCustomAlgorithms((prev) => prev.filter((a) => a.name !== name));
    setSelectedCompAlgos((prev) => prev.filter((x) => x !== name));
    if (algorithm === name) {
      setAlgorithm("FCFS");
    }
  };

  const [settings, setSettings] = useState<SimulatorSettings>({
    contextSwitchTime: 0,
    tieBreaker: "PID",
  });

  const result = useMemo(() => {
    const customAlgo = customAlgorithms.find((ca) => ca.name === algorithm);
    if (customAlgo) {
      return runLabSimulation(processes, customAlgo);
    }
    return runSimulation(processes, algorithm as Algorithm, { rr: quantumRR, q0: quantumQ0, q1: quantumQ1 }, settings);
  }, [processes, algorithm, quantumRR, quantumQ0, quantumQ1, settings, customAlgorithms]);
  
  const totalTime = result.executionLog.length > 0 ? result.executionLog[result.executionLog.length - 1].endTime : 0;
  
  const compData = useMemo(() => {
    const data: Array<{ name: string; avgTAT: number; avgWT: number }> = [];
    
    ALGORITHMS.forEach((a) => {
      if (selectedCompAlgos.includes(a)) {
        const r = runSimulation(processes, a, { rr: quantumRR, q0: quantumQ0, q1: quantumQ1 }, settings);
        data.push({ name: a, avgTAT: +r.avgTurnaroundTime.toFixed(2), avgWT: +r.avgWaitingTime.toFixed(2) });
      }
    });

    customAlgorithms.forEach((ca) => {
      if (selectedCompAlgos.includes(ca.name)) {
        const r = runLabSimulation(processes, ca);
        data.push({
          name: ca.name,
          avgTAT: +r.avgTurnaroundTime.toFixed(2),
          avgWT: +r.avgWaitingTime.toFixed(2),
        });
      }
    });
    
    return data;
  }, [processes, quantumRR, quantumQ0, quantumQ1, settings, customAlgorithms, selectedCompAlgos]);
  
  const pColors = useMemo(() => {
    const m: Record<string, string> = {};
    processes.forEach((p, i) => (m[p.id] = COLORS[i % COLORS.length]));
    m["IDLE"] = "transparent";
    m["SWITCH"] = "transparent";
    return m;
  }, [processes]);
  
  const state = useMemo(() => getStateAtTick(tick, processes, result.executionLog), [tick, processes, result]);
  
  const info = useMemo(() => {
    const customAlgo = customAlgorithms.find((ca) => ca.name === algorithm);
    if (customAlgo) {
      return {
        name: customAlgo.name,
        type: customAlgo.rules.some((r) => r.preemptive) ? "Preemptive" : "Non-Preemptive",
        desc: `Custom hybrid algorithm composed of rules: ${customAlgo.rules.map((r) => r.type).join(" → ")}.`,
      };
    }
    return ALGORITHM_INFO[algorithm as Algorithm];
  }, [algorithm, customAlgorithms]);

  const showPri = algorithm === "Priority" || algorithm === "MLFQ";

  useEffect(() => {
    setTick(0);
    setPlaying(false);
  }, [processes, algorithm, quantumRR, quantumQ0, quantumQ1, settings]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTick((t) => {
        if (t >= totalTime) {
          setPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, 500 / speed);
    return () => clearInterval(id);
  }, [playing, speed, totalTime]);

  const addProcess = (e: React.FormEvent) => {
    e.preventDefault();
    setProcesses([...processes, { id: `P${processes.length + 1}`, arrivalTime: newArr, burstTime: newBur, priority: newPri }]);
    setNewArr(newArr + 1);
  };
  
  const removeProcess = (id: string) => {
    setProcesses(processes.filter((p) => p.id !== id));
  };
  
  const loadPreset = (key: string) => {
    setProcesses(PRESETS[key].processes);
    setShowPresets(false);
  };

  if (view === "lab") {
    return (
      <Lab
        onBack={() => setView("dashboard")}
        onSaveAlgorithm={(algo) => {
          setCustomAlgorithms((prev) => {
            const filtered = prev.filter((a) => a.name !== algo.name);
            return [...filtered, algo];
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen md:h-screen w-screen bg-[#f0f2f5] p-0 flex items-center justify-center overflow-y-auto md:overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full h-full min-h-screen md:min-h-0 bg-[#f8fafc] rounded-none border-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        


        {/* MAIN CONTAINER */}
        <div className="flex-1 flex flex-col md:overflow-hidden min-w-0">
          {/* HEADER */}
          <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0">
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt="CPUsim Logo" className="h-10 object-contain" />
              <div className="h-5 w-px bg-slate-200 mx-2" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Scheduler Core</span>
            </div>
            
            {/* Center navigation links */}
            <div className="hidden sm:flex items-center gap-6 text-[13px] font-bold">
              <span className="px-3 py-1.5 bg-[#f1f5f9] text-[#00875a] rounded-none cursor-pointer">Dashboard</span>
              <span className="text-[#94a3b8] hover:text-[#475569] cursor-pointer transition-colors" onClick={() => setShowSettings(true)}>Settings</span>
              <span className="text-[#94a3b8] hover:text-[#475569] cursor-pointer transition-colors" onClick={() => exportCSV(result, processes)}>Export</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setView("lab")} className="w-8 h-8 flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-[#d97706] transition-colors" title="Algorithm Lab">
                <FlaskConical className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* SETTINGS MODAL */}
          {showSettings && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
              <div className="glass-card w-[340px] rounded-none p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#00875a]" />
                    <h3 className="text-xs font-bold text-[#1e293b] uppercase tracking-wider">Simulation Settings</h3>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="text-[#94a3b8] hover:text-[#1e293b] text-sm">✕</button>
                </div>
                
                {/* Context Switch */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-[#94a3b8]">Context Switch Overhead</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={5}
                      value={settings.contextSwitchTime}
                      onChange={(e) => setSettings({ ...settings, contextSwitchTime: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono font-bold text-[#00875a] min-w-[20px] text-right">{settings.contextSwitchTime}</span>
                  </div>
                  <span className="text-[9px] text-[#94a3b8]">Ticks delay added when switching executing processes.</span>
                </div>

                {/* Tie Breaker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-[#94a3b8]">Tie-Breaker Strategy</label>
                  <select
                    value={settings.tieBreaker}
                    onChange={(e) => setSettings({ ...settings, tieBreaker: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-none text-xs p-2 text-[#1e293b] outline-none focus:border-[#00875a] transition-colors"
                  >
                    <option value="PID">Smallest PID (P1 &lt; P2)</option>
                    <option value="FIFO">FIFO (First Arrived)</option>
                    <option value="LIFO">LIFO (Last Arrived)</option>
                  </select>
                  <span className="text-[9px] text-[#94a3b8]">Determines which process runs if arrival times and selection criteria are equal.</span>
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2 bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold rounded-none transition-colors mt-2"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          )}

          {/* CONTENT AREA */}
          <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto gap-6 bg-[#f8fafc] custom-scrollbar">
            {/* Title / Action row */}
            <div className="flex justify-end items-center gap-4 shrink-0">
              <div className="flex items-center gap-3">
                {/* Presets Button Wrapper */}
                <div className="relative">
                  <button 
                    onClick={() => setShowPresets(!showPresets)} 
                    className="btn-ghost text-xs font-bold px-4 py-2 rounded-none flex items-center gap-1.5"
                  >
                    <ChevronDown className="w-4 h-4" /> Load Workload Preset
                  </button>
                  {showPresets && (
                    <div className="preset-dropdown mt-2">
                      {Object.entries(PRESETS).map(([k, v]) => (
                        <button key={k} onClick={() => loadPreset(k)}>
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Add process quick action */}
                <button 
                  onClick={() => setProcesses(generateRandomProcesses(Math.floor(Math.random() * 5) + 3))} 
                  className="btn-primary text-xs font-bold px-4 py-2.5 rounded-none shadow-lg shadow-[#00875a]/10"
                >
                  <Shuffle className="w-4 h-4" /> Randomize Workload
                </button>
              </div>
            </div>

            {/* Active Algorithm Horizontal Status Bar */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#00875a] to-[#005c3d] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-[#00875a]/10 shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-4">
                {/* Micro-chip representation */}
                <div className="hidden md:flex w-10 h-7 bg-white/20 border border-white/10 items-center justify-center text-[9px] font-mono tracking-widest text-white/70">
                  CORE
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#a3ffd6]/85">Active Algorithm</p>
                  <h3 className="text-lg font-bold tracking-tight">{algorithm}</h3>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-white/15" />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#a3ffd6]/65">Parameters</p>
                <p className="text-sm font-mono font-bold">
                  {algorithm === "RR" && `Time Quantum = ${quantumRR}`}
                  {algorithm === "MLFQ" && `Q0 = ${quantumQ0}, Q1 = ${quantumQ1}`}
                  {algorithm !== "RR" && algorithm !== "MLFQ" && "Default Core Parameters"}
                </p>
              </div>

              <div className="hidden sm:block h-8 w-px bg-white/15" />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#a3ffd6]/65">Mode</p>
                <span className="text-xs font-bold bg-white/10 px-2 py-0.5">{info.type}</span>
              </div>

              <div className="hidden sm:block h-8 w-px bg-white/15" />

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#a3ffd6]/65 uppercase">Status</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white/90">v1.0.0</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 min-h-0">
              {/* SIDEBAR COLUMN (Left side of content area) */}
              <aside className="w-full lg:w-80 grid grid-cols-1 md:grid-cols-3 lg:flex lg:flex-col gap-6 shrink-0">

                {/* Card 2: Configuration */}
                <div className="glass-card rounded-none p-5 flex flex-col gap-4">
                  <h2 className="section-label">Configuration</h2>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold uppercase text-[#5c6378] tracking-wide">Algorithm</label>
                    <div className="flex gap-1.5">
                      <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="select-field flex-1">
                        <optgroup label="Standard Algorithms">
                          {ALGORITHMS.map((a) => (
                            <option key={a} value={a}>
                              {a} — {ALGORITHM_INFO[a].name}
                            </option>
                          ))}
                        </optgroup>
                        {customAlgorithms.length > 0 && (
                          <optgroup label="Custom Saved Algorithms">
                            {customAlgorithms.map((ca) => (
                              <option key={ca.name} value={ca.name}>
                                {ca.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {customAlgorithms.some((ca) => ca.name === algorithm) && (
                        <button
                          onClick={() => removeCustomAlgorithm(algorithm)}
                          className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors text-xs font-bold border border-rose-200"
                          title="Delete Custom Algorithm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {algorithm === "RR" && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold uppercase text-[#5c6378] tracking-wide">Time Quantum</label>
                      <input type="number" min="1" value={quantumRR} onChange={(e) => setQuantumRR(+e.target.value)} className="input-field" />
                    </div>
                  )}
                  {algorithm === "MLFQ" && (
                    <div className="flex gap-3">
                      {[
                        ["Q0", quantumQ0, setQuantumQ0],
                        ["Q1", quantumQ1, setQuantumQ1],
                      ].map(([l, v, s]: any) => (
                        <div key={l} className="flex-1 flex flex-col gap-2">
                          <label className="text-[11px] font-bold uppercase text-[#5c6378] tracking-wide">{l} Quantum</label>
                          <input type="number" min="1" value={v} onChange={(e) => s(+e.target.value)} className="input-field" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card 3: Process Workload List */}
                <div className="glass-card rounded-none p-5 flex flex-col gap-3">
                  <h2 className="section-label">Process Workload</h2>
                  <div className={`grid ${showPri ? "grid-cols-5" : "grid-cols-4"} gap-2 text-[10px] uppercase font-bold text-[#5c6378] px-3`}>
                    <span>ID</span>
                    <span className="text-center">Arrival</span>
                    <span className="text-center">Burst</span>
                    {showPri && <span className="text-center">Priority</span>}
                    <span />
                  </div>
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                    {processes.map((p) => (
                      <div key={p.id} className={`process-row group grid ${showPri ? "grid-cols-5" : "grid-cols-4"} gap-2 items-center text-[13px]`}>
                        <span className="font-bold font-mono" style={{ color: pColors[p.id] }}>
                          {p.id}
                        </span>
                        <span className="text-center text-[#475569] font-mono">{p.arrivalTime}</span>
                        <span className="text-center text-[#475569] font-mono">{p.burstTime}</span>
                        {showPri && <span className="text-center text-[#475569] font-mono">{p.priority}</span>}
                        <button onClick={() => removeProcess(p.id)} disabled={processes.length <= 1} className="ml-auto bg-slate-100 hover:bg-red-500 hover:text-white text-[#475569] p-1 rounded-none opacity-0 group-hover:opacity-100 transition-all disabled:hidden">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={addProcess} className="flex flex-col gap-2 mt-1">
                    <div className={`process-row grid ${showPri ? "grid-cols-5" : "grid-cols-4"} gap-2 items-center`}>
                      <span className="text-[#5c6378] font-mono font-bold text-xs">NEW</span>
                      <input type="number" min="0" value={newArr} onChange={(e) => setNewArr(+e.target.value)} className="w-full bg-[#f8fafc] border border-slate-200 rounded-none text-center text-[13px] p-2 text-slate-800 outline-none focus:border-[#00875a] transition-colors" required />
                      <input type="number" min="1" value={newBur} onChange={(e) => setNewBur(+e.target.value)} className="w-full bg-[#f8fafc] border border-slate-200 rounded-none text-center text-[13px] p-2 text-slate-800 outline-none focus:border-[#00875a] transition-colors" required />
                      {showPri && <input type="number" min="1" value={newPri} onChange={(e) => setNewPri(+e.target.value)} className="w-full bg-[#f8fafc] border border-slate-200 rounded-none text-center text-[13px] p-2 text-slate-800 outline-none focus:border-[#00875a] transition-colors" required />}
                    </div>
                    <button type="submit" className="w-full py-2.5 flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-none text-[12px] font-bold uppercase text-[#5c6378] hover:bg-slate-50 hover:text-[#1e293b] hover:border-slate-300 transition-all">
                      <Plus className="w-4 h-4" />Add Process
                    </button>
                  </form>
                </div>

                {/* Card 4: Simulator Stats */}
                <div className="stats-panel rounded-none p-5 flex flex-col gap-4">
                  <h2 className="section-label text-[#00875a]">Simulation Metrics</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center pb-2 border-b border-[#10b981]/10">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#00875a] mb-1">Avg Wait Time</div>
                      <div className="text-2xl font-black text-[#1e293b]">{result.avgWaitingTime.toFixed(2)}</div>
                      <span className="text-[9px] font-bold text-[#00875a] bg-[#00875a]/10 px-1.5 py-0.5 rounded-none mt-1 inline-block">Ticks</span>
                    </div>
                    <div className="text-center pb-2 border-b border-[#10b981]/10">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#00875a] mb-1">Avg Turnaround</div>
                      <div className="text-2xl font-black text-[#1e293b]">{result.avgTurnaroundTime.toFixed(2)}</div>
                      <span className="text-[9px] font-bold text-[#00875a] bg-[#00875a]/10 px-1.5 py-0.5 rounded-none mt-1 inline-block">Ticks</span>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#00875a] mb-1">Avg Response</div>
                      <div className="text-2xl font-black text-[#1e293b]">{result.avgResponseTime.toFixed(2)}</div>
                      <span className="text-[9px] font-bold text-[#00875a] bg-[#00875a]/10 px-1.5 py-0.5 rounded-none mt-1 inline-block">Ticks</span>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#00875a] mb-1">CPU Utilization</div>
                      <div className="text-2xl font-black text-[#00875a]">{result.cpuUtilization.toFixed(0)}%</div>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-none mt-1 inline-block">Active</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-[11px] text-[#475569] font-mono border-t border-[#10b981]/15 pt-3">
                    <div className="flex justify-between">
                      <span className="font-bold">Throughput:</span>
                      <span className="text-[#00875a] font-bold">{result.throughput.toFixed(3)} p/ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Context Switches:</span>
                      <span className="text-amber-600 font-bold">{result.contextSwitches}</span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* MAIN CONTENT AREA */}
              <div className="flex-1 flex flex-col gap-6 min-w-0">
                {/* Algorithm Info */}
                {showInfo && (
                  <div className="glass-card rounded-none p-5 flex items-start gap-4 animate-slide-up">
                    <Info className="w-6 h-6 text-[#00875a] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-base font-bold text-[#1e293b]">{info.name}</span>
                        <span className={`badge text-[10px] ${info.type === "Preemptive" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700" : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-700"}`}>{info.type}</span>
                      </div>
                      <p className="text-[13px] text-[#475569] leading-relaxed">{info.desc}</p>
                    </div>
                    <button onClick={() => setShowInfo(false)} className="text-[#94a3b8] hover:text-[#1e293b] text-sm transition-colors">✕</button>
                  </div>
                )}
                {!showInfo && (
                  <button onClick={() => setShowInfo(true)} className="text-[11px] text-[#94a3b8] hover:text-[#475569] self-start transition-colors font-bold uppercase tracking-wider">
                    Show algorithm info ↓
                  </button>
                )}

                {/* Gantt Card */}
                <div className="glass-card rounded-none p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h2 className="section-label">Gantt Chart Timeline</h2>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTick((t) => Math.max(0, t - 1))} className="p-1 rounded-none hover:bg-slate-100 text-[#475569] transition-colors">
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (tick >= totalTime) setTick(0); setPlaying(!playing); }} className={`p-1.5 rounded-none transition-colors ${playing ? "bg-[#00875a] text-white" : "hover:bg-slate-100 text-[#475569]"}`}>
                        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setTick((t) => Math.min(totalTime, t + 1))} className="p-1 rounded-none hover:bg-slate-100 text-[#475569] transition-colors">
                        <SkipForward className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setTick(0); setPlaying(false); }} className="p-1 rounded-none hover:bg-slate-100 text-[#475569] transition-colors">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <select value={speed} onChange={(e) => setSpeed(+e.target.value)} className="bg-slate-50 border border-slate-200 rounded-none text-xs px-2.5 py-1 text-[#475569] ml-2 outline-none font-bold">
                        {[1, 2, 4, 8].map((s) => (
                          <option key={s} value={s}>
                            {s}x Speed
                          </option>
                        ))}
                      </select>
                      <span className="text-xs font-mono text-[#475569] font-bold ml-3 bg-slate-100 px-2 py-1 rounded-none">
                        t = {tick} / {totalTime}
                      </span>
                    </div>
                  </div>

                  {result.executionLog.length > 0 ? (
                    <div className="w-full overflow-x-auto custom-scrollbar border border-slate-100 bg-slate-50">
                      <div className="relative h-24 flex min-w-[768px] lg:min-w-0 w-full">
                        {totalTime > 0 && <div className="gantt-cursor" style={{ left: `${(tick / totalTime) * 100}%`, transition: playing ? "none" : "left 0.15s ease" }} />}
                        {result.executionLog.map((b, i) => {
                          const w = ((b.endTime - b.startTime) / totalTime) * 100;
                          const idle = b.processId === "IDLE";
                          const cs = b.processId === "SWITCH";
                          const past = b.endTime <= tick;
                          const active = b.startTime <= tick && tick < b.endTime;
                          
                          const bgStyle = cs 
                            ? { background: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, #e2e8f0 4px, #e2e8f0 8px)' } 
                            : { backgroundColor: idle ? "transparent" : pColors[b.processId] };

                          return (
                            <div
                              key={`${b.processId}-${b.startTime}-${i}`}
                              style={{ width: `${w}%`, ...bgStyle, opacity: past ? 0.95 : active ? 1 : 0.2 }}
                              className={`h-full border-r border-black/5 flex flex-col items-center justify-center transition-opacity duration-200 ${(idle || cs) ? "border border-dashed border-slate-200" : ""} ${active && !(idle || cs) ? "ring-2 ring-[#00875a] ring-inset" : ""}`}
                              title={`${b.processId}: ${b.startTime}→${b.endTime}`}
                            >
                              {!(idle || cs) && w > 3 && (
                                <div className="flex flex-col items-center justify-center min-w-0 w-full px-0.5 truncate">
                                  <span className="text-[10px] font-black text-white drop-shadow-sm truncate">{b.processId}</span>
                                  <span className="text-[8px] text-white/90 font-mono font-bold truncate">
                                    {b.startTime}-{b.endTime}
                                  </span>
                                </div>
                              )}
                              {idle && w > 3 && <span className="text-[8px] font-black text-[#94a3b8] uppercase truncate">Idle</span>}
                              {cs && w > 3 && <span className="text-[8px] font-black text-amber-600 uppercase truncate">CS</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 bg-slate-50 border border-dashed border-slate-200 rounded-none flex items-center justify-center">
                      <span className="text-xs font-bold uppercase text-[#94a3b8]">No simulation data — add processes to begin</span>
                    </div>
                  )}

                  {/* Playback slider */}
                  <input type="range" min={0} max={totalTime} value={tick} onChange={(e) => { setTick(+e.target.value); setPlaying(false); }} className="w-full mt-1" />

                  {/* Ready Queue Viz */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">State @t={tick}:</span>
                    {state.running && (
                      <span className="status-chip text-white" style={{ backgroundColor: pColors[state.running] + "E6" }}>
                        <span className="w-2 h-2 rounded-full bg-white dot-running inline-block" />
                        Running: {state.running}
                      </span>
                    )}
                    {state.readyQueue.length > 0 && (
                      <span className="status-chip bg-yellow-50 border border-yellow-200 text-yellow-700">
                        <Clock className="w-3.5 h-3.5" />Ready: {state.readyQueue.join(", ")}
                      </span>
                    )}
                    {state.completed.length > 0 && <span className="status-chip bg-emerald-50 border border-emerald-200 text-emerald-700">✓ Done: {state.completed.join(", ")}</span>}
                    {state.notArrived.length > 0 && <span className="status-chip bg-slate-50 border border-slate-200 text-[#94a3b8]">Pending: {state.notArrived.join(", ")}</span>}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 text-[11px] font-mono text-[#94a3b8] flex-wrap border-t border-slate-100 pt-2.5">
                    {processes.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5 font-bold">
                        <span className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: pColors[p.id] }} />
                        {p.id}
                      </span>
                    ))}
                    {settings.contextSwitchTime > 0 && (
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 2px, #e2e8f0 2px, #e2e8f0 4px)' }} />
                        CS (Overhead)
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Stats & Data */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Table */}
                  <div className="glass-card rounded-none overflow-hidden flex flex-col min-h-[300px]">
                    <div className="p-4 border-b border-slate-100 bg-[#f8fafc]">
                      <h2 className="section-label">Quantitative Analysis</h2>
                    </div>
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Process</th>
                            <th>Arrival</th>
                            <th>Burst</th>
                            {showPri && <th>Priority</th>}
                            <th>Finish</th>
                            <th>Wait</th>
                            <th>TAT</th>
                            <th>Response</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.metrics.map((m) => {
                            const p = processes.find((x) => x.id === m.id)!;
                            return (
                              <tr key={m.id}>
                                <td className="font-bold" style={{ color: pColors[m.id] }}>
                                  {m.id}
                                </td>
                                <td className="text-[#475569]">{p.arrivalTime}</td>
                                <td className="text-[#475569]">{p.burstTime}</td>
                                {showPri && <td className="text-[#475569]">{p.priority}</td>}
                                <td className="text-[#1e293b] font-bold">{m.completionTime}</td>
                                <td className="text-[#475569]">{m.waitingTime}</td>
                                <td className="text-[#00875a] font-bold">{m.turnaroundTime}</td>
                                <td className="text-purple-600 font-bold">{m.responseTime}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="glass-card rounded-none p-5 flex flex-col gap-4 min-h-[300px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-[#475569]" />
                        <h2 className="section-label">Algorithm Comparison</h2>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ALGORITHMS.map((a) => {
                          const active = selectedCompAlgos.includes(a);
                          return (
                            <button
                              key={a}
                              onClick={() => {
                                setSelectedCompAlgos((prev) =>
                                  prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                                );
                              }}
                              className={`px-2 py-0.5 text-[9px] font-black tracking-wider uppercase transition-colors ${
                                active
                                  ? "bg-[#00875a]/10 text-[#00875a] border border-[#00875a]/30"
                                  : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {a}
                            </button>
                          );
                        })}
                        {customAlgorithms.map((ca) => {
                          const active = selectedCompAlgos.includes(ca.name);
                          return (
                            <button
                              key={ca.name}
                              onClick={() => {
                                setSelectedCompAlgos((prev) =>
                                  prev.includes(ca.name) ? prev.filter((x) => x !== ca.name) : [...prev, ca.name]
                                );
                              }}
                              className={`px-2 py-0.5 text-[9px] font-black tracking-wider uppercase transition-colors ${
                                active
                                  ? "bg-amber-50 text-[#d97706] border border-amber-200"
                                  : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {ca.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={compData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAvgTAT" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00875a" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#00875a" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="colorAvgWT" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} />
                          <RTooltip cursor={{ stroke: '#00875a', strokeWidth: 1 }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0px', border: '1px solid rgba(0,0,0,0.06)', color: '#1e293b', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                          <Legend wrapperStyle={{ paddingTop: '12px', fontSize: 11, fontWeight: 'bold' }} />
                          <Area type="monotone" dataKey="avgTAT" name="Avg TAT" stroke="#00875a" strokeWidth={2} fillOpacity={1} fill="url(#colorAvgTAT)" />
                          <Area type="monotone" dataKey="avgWT" name="Avg WT" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorAvgWT)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </main>

          <footer className="h-auto md:h-10 bg-white border-t border-slate-100 px-4 md:px-8 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between gap-2.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] shrink-0 font-mono">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5 text-center">
              <span>CPU Scheduling Simulator</span>
              <span className="text-[#00875a]">
                {algorithm} — {info.name}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
              <span>Ticks: {totalTime}</span>
              <span>Processes: {processes.length}</span>
              <span>CPU: {result.cpuUtilization.toFixed(0)}%</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
