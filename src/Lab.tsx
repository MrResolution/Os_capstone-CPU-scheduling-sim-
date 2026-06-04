import React, { useState, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Shuffle, FlaskConical, Zap } from "lucide-react";
import { type ProcessInput, type SimulationResult, runSimulation, type SimulatorSettings } from "./lib/scheduler";
import { type LabRule, type LabConfig, type RuleType, RULE_INFO, runLabSimulation, generateRuleId } from "./lib/labScheduler";
import { ALGORITHMS, COLORS, PRESETS } from "./constants";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer } from "recharts";

interface LabProps {
  onBack: () => void;
  onSaveAlgorithm: (algo: LabConfig) => void;
}

const RULE_TYPES: RuleType[] = ["shortest-burst", "longest-burst", "highest-priority", "round-robin", "fcfs", "random"];

export default function Lab({ onBack, onSaveAlgorithm }: LabProps) {
  const [rules, setRules] = useState<LabRule[]>([]);
  const [algoName, setAlgoName] = useState("My Custom Algorithm");
  const [contextSwitchTime, setContextSwitchTime] = useState(0);
  const [processes, setProcesses] = useState<ProcessInput[]>([]);
  const [newArr, setNewArr] = useState(0);
  const [newBur, setNewBur] = useState(1);
  const [newPri, setNewPri] = useState(1);
  const [showAddRule, setShowAddRule] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedCompAlgos, setSelectedCompAlgos] = useState<string[]>([
    "FCFS", "SJF", "SRTF", "Priority", "RR", "MLFQ", "Custom"
  ]);

  const config: LabConfig = useMemo(() => ({
    name: algoName,
    rules,
    contextSwitchTime,
  }), [algoName, rules, contextSwitchTime]);

  const labResult = useMemo(() => runLabSimulation(processes, config), [processes, config]);

  const settings: SimulatorSettings = { contextSwitchTime, tieBreaker: "PID" };

  const compData = useMemo(() => {
    const list: Array<{ name: string; avgTAT: number; avgWT: number }> = [];
    ALGORITHMS.forEach((a) => {
      if (selectedCompAlgos.includes(a)) {
        const r = runSimulation(processes, a, { rr: 2, q0: 2, q1: 4 }, settings);
        list.push({ name: a, avgTAT: +r.avgTurnaroundTime.toFixed(2), avgWT: +r.avgWaitingTime.toFixed(2) });
      }
    });
    if (selectedCompAlgos.includes("Custom")) {
      list.push({
        name: "Custom",
        avgTAT: +labResult.avgTurnaroundTime.toFixed(2),
        avgWT: +labResult.avgWaitingTime.toFixed(2),
      });
    }
    return list;
  }, [processes, labResult, settings, selectedCompAlgos]);

  const pColors = useMemo(() => {
    const m: Record<string, string> = {};
    processes.forEach((p, i) => (m[p.id] = COLORS[i % COLORS.length]));
    m["IDLE"] = "transparent";
    m["SWITCH"] = "transparent";
    return m;
  }, [processes]);

  const totalTime = labResult.executionLog.length > 0 ? labResult.executionLog[labResult.executionLog.length - 1].endTime : 0;

  const addRule = (type: RuleType) => {
    setRules([...rules, { id: generateRuleId(), type, preemptive: false, quantum: type === "round-robin" ? 2 : undefined }]);
    setShowAddRule(false);
  };

  const removeRule = (id: string) => {
    if (rules.length > 1) setRules(rules.filter((r) => r.id !== id));
  };

  const moveRule = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= rules.length) return;
    const copy = [...rules];
    [copy[index], copy[newIdx]] = [copy[newIdx], copy[index]];
    setRules(copy);
  };

  const updateRule = (id: string, updates: Partial<LabRule>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const addProcess = (e: React.FormEvent) => {
    e.preventDefault();
    setProcesses([...processes, { id: `P${processes.length + 1}`, arrivalTime: newArr, burstTime: newBur, priority: newPri }]);
    setNewArr(newArr + 1);
  };

  const addRandomProcess = () => {
    const nextId = `P${processes.length + 1}`;
    const randProc = {
      id: nextId,
      arrivalTime: Math.max(0, newArr),
      burstTime: Math.floor(Math.random() * 12) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
    };
    setProcesses([...processes, randProc]);
    setNewArr((prev) => prev + 1);
  };

  const randomize = () => {
    const n = Math.floor(Math.random() * 5) + 3;
    const procs: ProcessInput[] = Array.from({ length: n }, (_, i) => ({
      id: `P${i + 1}`,
      arrivalTime: Math.floor(Math.random() * n),
      burstTime: Math.floor(Math.random() * 14) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
    })).sort((a, b) => a.arrivalTime - b.arrivalTime);
    setProcesses(procs);
  };

  const handleSave = () => {
    onSaveAlgorithm(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen w-screen bg-[#f0f2f5] p-0 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* LAB HEADER */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-bold text-[#94a3b8] hover:text-[#1e293b] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#d97706]" />
            <span className="text-sm font-black text-[#1e293b]">Algorithm Lab</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={algoName}
            onChange={(e) => setAlgoName(e.target.value)}
            className="text-sm font-bold text-[#1e293b] bg-slate-50 border border-slate-200 px-3 py-1.5 w-64 outline-none focus:border-[#d97706] transition-colors"
          />
          <button onClick={randomize} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-slate-100 text-[#475569] hover:bg-slate-200 transition-colors border border-slate-200">
            <Shuffle className="w-3.5 h-3.5" /> Randomize
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-[#00875a] text-white hover:bg-[#005c3d] transition-colors">
            {savedSuccess ? "✓ Saved" : "Save Algorithm"}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — RULE BUILDER */}
        <div className="w-[340px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          {/* Rule Builder Header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#94a3b8]">Rule Pipeline</h2>
              <span className="text-[10px] font-bold text-[#d97706] bg-amber-50 px-2 py-0.5">{rules.length} rule{rules.length !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-[10px] text-[#94a3b8]">Rules are evaluated top-to-bottom. First rule = primary strategy, rest = tie-breakers.</p>
          </div>

          {/* Rule Cards */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {rules.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 bg-slate-50 text-[#94a3b8]">
                <span className="text-[10px] font-black uppercase tracking-wider block mb-1">Pipeline Empty</span>
                <span className="text-[9px]">Add a rule below to start composing your scheduling strategy.</span>
              </div>
            ) : (
              rules.map((rule, idx) => (
                <div key={rule.id} className="lab-rule-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-[#d97706] w-5 h-5 flex items-center justify-center">{idx + 1}</span>
                    <span className="text-lg">{RULE_INFO[rule.type].icon}</span>
                    <span className="text-xs font-bold text-[#1e293b]">{RULE_INFO[rule.type].name}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveRule(idx, -1)} disabled={idx === 0} className="w-5 h-5 flex items-center justify-center text-[#94a3b8] hover:text-[#1e293b] disabled:opacity-20">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveRule(idx, 1)} disabled={idx === rules.length - 1} className="w-5 h-5 flex items-center justify-center text-[#94a3b8] hover:text-[#1e293b] disabled:opacity-20">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeRule(rule.id)} disabled={rules.length <= 1} className="w-5 h-5 flex items-center justify-center text-[#94a3b8] hover:text-red-500 disabled:opacity-20 ml-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-[#94a3b8] mb-2">{RULE_INFO[rule.type].desc}</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.preemptive}
                      onChange={(e) => updateRule(rule.id, { preemptive: e.target.checked })}
                      className="accent-[#d97706]"
                    />
                    <span className="text-[10px] font-bold text-[#475569]">Preemptive</span>
                  </label>
                  {rule.type === "round-robin" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#475569]">Quantum:</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={rule.quantum ?? 2}
                        onChange={(e) => updateRule(rule.id, { quantum: parseInt(e.target.value) || 2 })}
                        className="w-12 text-xs font-bold text-center bg-slate-50 border border-slate-200 py-0.5 outline-none focus:border-[#d97706]"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
            )}

            {/* Add Rule */}
            <div className="mt-2 pt-2 border-t border-slate-100 shrink-0">
              {showAddRule ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-bold uppercase text-[#94a3b8] mb-1">Select Rule Type</div>
                  {RULE_TYPES.map((rt) => (
                    <button key={rt} onClick={() => addRule(rt)} className="flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-[#475569] bg-slate-50 hover:bg-amber-50 hover:text-[#d97706] transition-colors border border-slate-100">
                      <span>{RULE_INFO[rt].icon}</span>
                      <span>{RULE_INFO[rt].name}</span>
                    </button>
                  ))}
                  <button onClick={() => setShowAddRule(false)} className="text-[10px] font-bold text-[#94a3b8] hover:text-[#1e293b] mt-1 text-center">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowAddRule(true)} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 border-2 border-dashed border-slate-200 text-[#94a3b8] hover:border-[#d97706] hover:text-[#d97706] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
              )}
            </div>
          </div>

          {/* Context Switch */}
          <div className="px-5 py-3 border-t border-slate-100 shrink-0">
            <label className="text-[10px] font-bold uppercase text-[#94a3b8]">Context Switch Overhead</label>
            <div className="flex items-center gap-2 mt-1 accent-amber">
              <input type="range" min={0} max={5} value={contextSwitchTime} onChange={(e) => setContextSwitchTime(parseInt(e.target.value))} className="flex-1" />
              <span className="text-xs font-bold text-[#d97706] w-4 text-right">{contextSwitchTime}</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — SIMULATION */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc]">
          {/* Process Input */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#94a3b8]">Process Workload</h2>
              <div className="flex items-center gap-2">
                {Object.entries(PRESETS).map(([k, v]) => (
                  <button key={k} onClick={() => setProcesses(v.processes)} className="text-[10px] font-bold text-[#94a3b8] hover:text-[#d97706] px-2 py-1 bg-white border border-slate-200 hover:border-[#d97706] transition-colors">
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200">
              {/* Header */}
              <div className="flex items-center gap-0 px-4 py-2 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-[#94a3b8]">
                <span className="w-14">ID</span>
                <span className="w-20">Arrival</span>
                <span className="w-20">Burst</span>
                <span className="w-20">Priority</span>
                <span className="flex-1"></span>
              </div>
              {/* Rows */}
              <div className="max-h-[145px] overflow-y-auto custom-scrollbar">
                {processes.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-0 px-4 py-1.5 border-b border-slate-50 text-xs">
                    <span className="w-14 font-bold" style={{ color: COLORS[i % COLORS.length] }}>{p.id}</span>
                    <span className="w-20 text-[#475569]">{p.arrivalTime}</span>
                    <span className="w-20 text-[#475569]">{p.burstTime}</span>
                    <span className="w-20 text-[#475569]">{p.priority}</span>
                    <span className="flex-1 text-right">
                      {processes.length > 1 && (
                        <button onClick={() => setProcesses(processes.filter((x) => x.id !== p.id))} className="text-[#94a3b8] hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {/* Add row */}
              <form onSubmit={addProcess} className="flex items-center gap-0 px-4 py-1.5 bg-slate-50">
                <span className="w-14 text-[10px] font-bold text-[#94a3b8]">NEW</span>
                <input type="number" min={0} value={newArr} onChange={(e) => setNewArr(+e.target.value)} className="w-20 text-xs bg-white border border-slate-200 px-2 py-1 outline-none focus:border-[#d97706] mr-1" />
                <input type="number" min={1} value={newBur} onChange={(e) => setNewBur(+e.target.value)} className="w-20 text-xs bg-white border border-slate-200 px-2 py-1 outline-none focus:border-[#d97706] mr-1" />
                <input type="number" min={1} value={newPri} onChange={(e) => setNewPri(+e.target.value)} className="w-20 text-xs bg-white border border-slate-200 px-2 py-1 outline-none focus:border-[#d97706] mr-1" />
                <button type="submit" className="text-[10px] font-bold text-[#d97706] hover:text-[#b45309] ml-2">+ ADD</button>
                <button type="button" onClick={addRandomProcess} className="text-[10px] font-bold text-[#475569] hover:text-black ml-3 uppercase border-l border-slate-300 pl-3">
                  + Random
                </button>
              </form>
            </div>
          </div>

          {/* Gantt Chart */}
          <div className="px-6 pb-3">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#94a3b8] mb-2">
              <Zap className="w-3.5 h-3.5 inline mr-1 text-[#d97706]" />
              Gantt Chart — {algoName}
            </h2>
            <div className="bg-white border border-slate-200 p-4 overflow-x-auto">
              {labResult.executionLog.length === 0 ? (
                <div className="text-xs text-[#94a3b8] text-center py-6">No simulation data — add processes and rules to begin.</div>
              ) : (
                <div className="flex items-end gap-0" style={{ minWidth: totalTime * 36 }}>
                  {labResult.executionLog.map((block, i) => {
                    const dur = block.endTime - block.startTime;
                    const isIdle = block.processId === "IDLE";
                    const isSwitch = block.processId === "SWITCH";
                    const color = isIdle ? "#e2e8f0" : isSwitch ? "#fde68a" : pColors[block.processId] || "#94a3b8";
                    return (
                      <div key={i} className="flex flex-col items-center" style={{ width: dur * 36 }}>
                        <div
                          className="w-full flex items-center justify-center text-[10px] font-bold text-white border-r border-white/30"
                          style={{ height: 40, backgroundColor: color, opacity: isIdle ? 0.4 : 1 }}
                        >
                          {isSwitch ? "CS" : isIdle ? "" : block.processId}
                        </div>
                        <span className="text-[9px] text-[#94a3b8] mt-0.5">{block.startTime}</span>
                      </div>
                    );
                  })}
                  <span className="text-[9px] text-[#94a3b8] ml-0.5 self-end">{totalTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics + Comparison */}
          <div className="px-6 pb-4 flex gap-4 flex-1 min-h-0">
            {/* Metrics */}
            <div className="w-[280px] shrink-0">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#94a3b8] mb-2">Metrics</h2>
              <div className="bg-white border border-slate-200 p-4 flex flex-col gap-3">
                {[
                  { label: "Avg Wait Time", value: labResult.avgWaitingTime.toFixed(2), color: "#475569" },
                  { label: "Avg Turnaround", value: labResult.avgTurnaroundTime.toFixed(2), color: "#475569" },
                  { label: "Avg Response", value: labResult.avgResponseTime.toFixed(2), color: "#475569" },
                  { label: "CPU Utilization", value: `${labResult.cpuUtilization.toFixed(0)}%`, color: "#d97706" },
                  { label: "Throughput", value: `${labResult.throughput.toFixed(3)}/ms`, color: "#d97706" },
                  { label: "Context Switches", value: `${labResult.contextSwitches}`, color: "#ef4444" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{m.label}</span>
                    <span className="text-sm font-black" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Chart */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-[#94a3b8]">Algorithm Comparison</h2>
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
                        className={`px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase transition-colors ${
                          active
                            ? "bg-[#d97706]/10 text-[#d97706] border border-[#d97706]/30"
                            : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      setSelectedCompAlgos((prev) =>
                        prev.includes("Custom") ? prev.filter((x) => x !== "Custom") : [...prev, "Custom"]
                      );
                    }}
                    className={`px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase transition-colors ${
                      selectedCompAlgos.includes("Custom")
                        ? "bg-[#d97706] text-white border border-[#d97706]"
                        : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-4 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={compData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <RTooltip contentStyle={{ fontSize: 11, borderRadius: 0, border: "1px solid #e2e8f0" }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="avgTAT" name="Avg TAT" stroke="#d97706" fill="#fef3c7" strokeWidth={2} />
                    <Area type="monotone" dataKey="avgWT" name="Avg WT" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="px-6 pb-6">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#94a3b8] mb-2">Quantitative Analysis</h2>
            <div className="bg-white border border-slate-200">
              <div className="flex items-center gap-0 px-4 py-2 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-[#94a3b8]">
                <span className="w-16">Process</span>
                <span className="w-16">Arrival</span>
                <span className="w-16">Burst</span>
                <span className="w-16">Finish</span>
                <span className="w-16">Wait</span>
                <span className="w-16">TAT</span>
                <span className="w-20">Response</span>
              </div>
              <div className="max-h-[116px] overflow-y-auto custom-scrollbar">
                {labResult.metrics.map((m) => {
                  const p = processes.find((x) => x.id === m.id);
                  const pi = processes.findIndex((x) => x.id === m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-0 px-4 py-1.5 border-b border-slate-50 text-xs">
                      <span className="w-16 font-bold" style={{ color: COLORS[pi % COLORS.length] }}>{m.id}</span>
                      <span className="w-16 text-[#475569]">{p?.arrivalTime}</span>
                      <span className="w-16 text-[#475569]">{p?.burstTime}</span>
                      <span className="w-16 text-[#475569]">{m.completionTime}</span>
                      <span className="w-16 text-[#475569]">{m.waitingTime}</span>
                      <span className="w-16 font-bold text-[#1e293b]">{m.turnaroundTime}</span>
                      <span className="w-20 font-bold text-[#3b82f6]">{m.responseTime}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
