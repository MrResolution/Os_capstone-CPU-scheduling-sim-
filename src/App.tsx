import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, BarChart2, Play, Pause, SkipForward, SkipBack, RotateCcw, Download, Shuffle, ChevronDown, Info, Zap, Clock, Cpu, ArrowRightLeft } from "lucide-react";
import { type ProcessInput, type Algorithm, runSimulation, getStateAtTick } from "./lib/scheduler";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer } from "recharts";
import { ALGORITHMS, COLORS, ALGORITHM_INFO, PRESETS, generateRandomProcesses, exportCSV } from "./constants";
import logoUrl from "./assets/logo.png";

export default function App() {
  const [processes, setProcesses] = useState<ProcessInput[]>([]);
  const [algorithm, setAlgorithm] = useState<Algorithm>("FCFS");
  const [quantumRR, setQuantumRR] = useState(2);
  const [quantumQ0, setQuantumQ0] = useState(2);
  const [quantumQ1, setQuantumQ1] = useState(4);
  const [newArr, setNewArr] = useState(0);
  const [newBur, setNewBur] = useState(1);
  const [newPri, setNewPri] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const result = useMemo(() => runSimulation(processes, algorithm, { rr: quantumRR, q0: quantumQ0, q1: quantumQ1 }), [processes, algorithm, quantumRR, quantumQ0, quantumQ1]);
  const totalTime = result.executionLog.length > 0 ? result.executionLog[result.executionLog.length - 1].endTime : 0;
  const compData = useMemo(() => ALGORITHMS.map(a => { const r = runSimulation(processes, a, { rr: quantumRR, q0: quantumQ0, q1: quantumQ1 }); return { name: a, avgTAT: +r.avgTurnaroundTime.toFixed(2), avgWT: +r.avgWaitingTime.toFixed(2) }; }), [processes, quantumRR, quantumQ0, quantumQ1]);
  const pColors = useMemo(() => { const m: Record<string, string> = {}; processes.forEach((p, i) => m[p.id] = COLORS[i % COLORS.length]); m["IDLE"] = "transparent"; return m; }, [processes]);
  const state = useMemo(() => getStateAtTick(tick, processes, result.executionLog), [tick, processes, result]);
  const info = ALGORITHM_INFO[algorithm];
  const showPri = algorithm === "Priority" || algorithm === "MLFQ";

  useEffect(() => { setTick(0); setPlaying(false); }, [processes, algorithm, quantumRR, quantumQ0, quantumQ1]);
  useEffect(() => { if (!playing) return; const id = setInterval(() => setTick(t => { if (t >= totalTime) { setPlaying(false); return t; } return t + 1; }), 500 / speed); return () => clearInterval(id); }, [playing, speed, totalTime]);

  const addProcess = (e: React.FormEvent) => { e.preventDefault(); setProcesses([...processes, { id: `P${processes.length + 1}`, arrivalTime: newArr, burstTime: newBur, priority: newPri }]); setNewArr(newArr + 1); };
  const removeProcess = (id: string) => { setProcesses(processes.filter(p => p.id !== id)); };
  const loadPreset = (key: string) => { setProcesses(PRESETS[key].processes); setShowPresets(false); };

  return (
    <div className="h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <header className="h-14 border-b border-[#27272A] flex items-center justify-between px-5 bg-[#121214] shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <h1 className="text-xl font-black tracking-tighter text-white">CPU<span className="text-[#3B82F6]">Sim</span>.OS</h1>
          <div className="h-5 w-px bg-[#27272A]"/>
          <span className="px-2 py-0.5 bg-[#27272A] border border-[#3F3F46] rounded text-[9px] font-bold uppercase tracking-wider text-[#A1A1AA]">{algorithm}</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${info.type === "Preemptive" ? "bg-[#1a2e1a] border border-emerald-800 text-emerald-400" : "bg-[#2e2a1a] border border-yellow-800 text-yellow-400"}`}>{info.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setProcesses(generateRandomProcesses(Math.floor(Math.random()*5)+3))} className="flex items-center gap-1 px-3 py-1.5 bg-[#18181B] border border-[#3F3F46] rounded text-[10px] font-bold text-[#A1A1AA] hover:bg-[#27272A] transition-colors"><Shuffle className="w-3 h-3"/>Random</button>
          <div className="relative">
            <button onClick={() => setShowPresets(!showPresets)} className="flex items-center gap-1 px-3 py-1.5 bg-[#18181B] border border-[#3F3F46] rounded text-[10px] font-bold text-[#A1A1AA] hover:bg-[#27272A] transition-colors"><ChevronDown className="w-3 h-3"/>Presets</button>
            {showPresets && <div className="absolute right-0 top-full mt-1 bg-[#18181B] border border-[#3F3F46] rounded shadow-xl z-50 min-w-[140px]">{Object.entries(PRESETS).map(([k,v]) => <button key={k} onClick={() => loadPreset(k)} className="block w-full text-left px-3 py-2 text-[11px] text-[#A1A1AA] hover:bg-[#27272A] transition-colors">{v.name}</button>)}</div>}
          </div>
          <button onClick={() => exportCSV(result, processes)} className="flex items-center gap-1 px-3 py-1.5 bg-[#18181B] border border-[#3F3F46] rounded text-[10px] font-bold text-[#A1A1AA] hover:bg-[#27272A] transition-colors"><Download className="w-3 h-3"/>CSV</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* SIDEBAR */}
        <aside className="w-72 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar shrink-0">
          {/* Config */}
          <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#71717A]">Configuration</h2>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-[#52525B]">Algorithm</label>
              <select value={algorithm} onChange={e => setAlgorithm(e.target.value as Algorithm)} className="w-full bg-[#18181B] border border-[#3F3F46] rounded text-xs p-2 text-white outline-none focus:border-[#3B82F6] transition-colors">{ALGORITHMS.map(a => <option key={a} value={a}>{a} — {ALGORITHM_INFO[a].name}</option>)}</select>
            </div>
            {algorithm === "RR" && <div className="flex flex-col gap-1"><label className="text-[9px] font-bold uppercase text-[#52525B]">Time Quantum</label><input type="number" min="1" value={quantumRR} onChange={e => setQuantumRR(+e.target.value)} className="w-full bg-[#18181B] border border-[#3F3F46] rounded text-xs p-2 text-white outline-none focus:border-[#3B82F6]"/></div>}
            {algorithm === "MLFQ" && <div className="flex gap-2">{[["Q0",quantumQ0,setQuantumQ0],["Q1",quantumQ1,setQuantumQ1]].map(([l,v,s]: any) => <div key={l} className="flex-1 flex flex-col gap-1"><label className="text-[9px] font-bold uppercase text-[#52525B]">{l} Quantum</label><input type="number" min="1" value={v} onChange={e => s(+e.target.value)} className="w-full bg-[#18181B] border border-[#3F3F46] rounded text-xs p-2 text-white outline-none focus:border-[#3B82F6]"/></div>)}</div>}
          </div>

          {/* Process List */}
          <div className="glass-card rounded-xl p-4 flex flex-col gap-2">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#71717A]">Process Workload</h2>
            <div className={`grid ${showPri ? 'grid-cols-5' : 'grid-cols-4'} gap-1 text-[8px] uppercase font-bold text-[#52525B] px-1`}>
              <span>ID</span><span className="text-center">ARR</span><span className="text-center">BRST</span>{showPri && <span className="text-center">PRI</span>}<span/>
            </div>
            {processes.map((p) => (
              <div key={p.id} className={`p-1.5 bg-[#18181B] border border-[#27272A] rounded flex items-center group ${showPri ? 'grid grid-cols-5' : 'grid grid-cols-4'} gap-1 text-xs`}>
                <span className="font-bold font-mono" style={{ color: pColors[p.id] }}>{p.id}</span>
                <span className="text-center text-zinc-400 font-mono">{p.arrivalTime}</span>
                <span className="text-center text-zinc-400 font-mono">{p.burstTime}</span>
                {showPri && <span className="text-center text-zinc-400 font-mono">{p.priority}</span>}
                <button onClick={() => removeProcess(p.id)} disabled={processes.length<=1} className="ml-auto bg-[#3F3F46] hover:bg-[#EF4444] text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all disabled:hidden"><Trash2 className="w-3 h-3"/></button>
              </div>
            ))}
            <form onSubmit={addProcess} className="flex flex-col gap-1 mt-1">
              <div className={`p-1.5 bg-[#18181B] border border-[#27272A] rounded ${showPri ? 'grid grid-cols-5' : 'grid grid-cols-4'} gap-1 items-center`}>
                <span className="text-[#52525B] font-mono font-bold text-[10px]">NEW</span>
                <input type="number" min="0" value={newArr} onChange={e => setNewArr(+e.target.value)} className="w-full bg-black border border-[#3F3F46] rounded text-center text-xs p-1 text-white outline-none focus:border-[#3B82F6]" required/>
                <input type="number" min="1" value={newBur} onChange={e => setNewBur(+e.target.value)} className="w-full bg-black border border-[#3F3F46] rounded text-center text-xs p-1 text-white outline-none focus:border-[#3B82F6]" required/>
                {showPri && <input type="number" min="1" value={newPri} onChange={e => setNewPri(+e.target.value)} className="w-full bg-black border border-[#3F3F46] rounded text-center text-xs p-1 text-white outline-none focus:border-[#3B82F6]" required/>}
              </div>
              <button type="submit" className="w-full py-1.5 flex items-center justify-center gap-1 border-2 border-dashed border-[#27272A] rounded text-[10px] font-bold uppercase text-[#71717A] hover:bg-[#18181B] hover:text-[#A1A1AA] transition-colors"><Plus className="w-3 h-3"/>Add Process</button>
            </form>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-[#1E3A8A] to-[#1E1B4B] rounded-xl border border-[#3B82F6]/20 p-4 flex flex-col gap-3 mt-auto shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center"><div className="text-[8px] font-bold uppercase tracking-wider text-blue-300">Avg Wait</div><div className="text-2xl font-black text-white">{result.avgWaitingTime.toFixed(2)}</div></div>
              <div className="text-center"><div className="text-[8px] font-bold uppercase tracking-wider text-blue-300">Avg TAT</div><div className="text-2xl font-black text-white">{result.avgTurnaroundTime.toFixed(2)}</div></div>
              <div className="text-center"><div className="text-[8px] font-bold uppercase tracking-wider text-blue-300">Avg Response</div><div className="text-2xl font-black text-white">{result.avgResponseTime.toFixed(2)}</div></div>
              <div className="text-center"><div className="text-[8px] font-bold uppercase tracking-wider text-blue-300">CPU Util</div><div className="text-2xl font-black text-white">{result.cpuUtilization.toFixed(0)}%</div></div>
            </div>
            <div className="flex justify-between text-[9px] text-blue-300/70 font-mono border-t border-blue-500/20 pt-2">
              <span>Throughput: {result.throughput.toFixed(3)}/ms</span>
              <span>Ctx Switches: {result.contextSwitches}</span>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar min-w-0">
          {/* Algorithm Info */}
          {showInfo && (
            <div className="glass-card rounded-xl p-4 flex items-start gap-3 animate-slide-up">
              <Info className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-white">{info.name}</span><span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${info.type==="Preemptive"?"bg-emerald-900/40 text-emerald-400":"bg-yellow-900/40 text-yellow-400"}`}>{info.type}</span></div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{info.desc}</p>
              </div>
              <button onClick={() => setShowInfo(false)} className="text-[#52525B] hover:text-white text-xs">✕</button>
            </div>
          )}
          {!showInfo && <button onClick={() => setShowInfo(true)} className="text-[9px] text-[#52525B] hover:text-[#A1A1AA] self-start transition-colors">Show algorithm info ↓</button>}

          {/* Gantt */}
          <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#71717A]">Gantt Chart Timeline</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setTick(t => Math.max(0, t-1))} className="p-1 rounded hover:bg-[#27272A] text-[#71717A] transition-colors"><SkipBack className="w-3.5 h-3.5"/></button>
                <button onClick={() => { if (tick >= totalTime) setTick(0); setPlaying(!playing); }} className={`p-1.5 rounded transition-colors ${playing ? "bg-[#3B82F6] text-white" : "hover:bg-[#27272A] text-[#71717A]"}`}>{playing ? <Pause className="w-3.5 h-3.5"/> : <Play className="w-3.5 h-3.5"/>}</button>
                <button onClick={() => setTick(t => Math.min(totalTime, t+1))} className="p-1 rounded hover:bg-[#27272A] text-[#71717A] transition-colors"><SkipForward className="w-3.5 h-3.5"/></button>
                <button onClick={() => { setTick(0); setPlaying(false); }} className="p-1 rounded hover:bg-[#27272A] text-[#71717A] transition-colors"><RotateCcw className="w-3.5 h-3.5"/></button>
                <select value={speed} onChange={e => setSpeed(+e.target.value)} className="bg-[#18181B] border border-[#3F3F46] rounded text-[10px] px-1.5 py-0.5 text-[#A1A1AA] ml-1">{[1,2,4,8].map(s => <option key={s} value={s}>{s}x</option>)}</select>
                <span className="text-[10px] font-mono text-[#52525B] ml-2">t={tick}/{totalTime}</span>
              </div>
            </div>

            {result.executionLog.length > 0 ? (
              <div className="relative h-20 bg-black/40 border border-[#27272A] rounded-lg overflow-hidden flex">
                {totalTime > 0 && <div className="gantt-cursor" style={{ left: `${(tick / totalTime) * 100}%`, transition: playing ? "none" : "left 0.15s ease" }}/>}
                {result.executionLog.map((b, i) => {
                  const w = ((b.endTime - b.startTime) / totalTime) * 100;
                  const idle = b.processId === "IDLE";
                  const past = b.endTime <= tick;
                  const active = b.startTime <= tick && tick < b.endTime;
                  const future = b.startTime > tick;
                  return (
                    <div key={`${b.processId}-${b.startTime}-${i}`} style={{ width: `${w}%`, backgroundColor: idle ? "transparent" : pColors[b.processId], opacity: past ? 0.9 : active ? 1 : 0.15 }} className={`h-full border-r border-black/20 flex flex-col items-center justify-center transition-opacity duration-200 ${idle ? "border border-dashed border-[#27272A]" : ""} ${active && !idle ? "ring-1 ring-[#3B82F6] ring-inset" : ""}`} title={`${b.processId}: ${b.startTime}→${b.endTime}`}>
                      {!idle && w > 3 && <><span className="text-[9px] font-bold text-white drop-shadow-sm">{b.processId}</span><span className="text-[7px] text-white/70 font-mono">{b.startTime}-{b.endTime}</span></>}
                      {idle && w > 3 && <span className="text-[7px] font-bold text-[#52525B] uppercase">Idle</span>}
                    </div>
                  );
                })}
              </div>
            ) : <div className="h-20 bg-black/40 border border-dashed border-[#27272A] rounded-lg flex items-center justify-center"><span className="text-[10px] font-bold uppercase text-[#52525B]">No data</span></div>}

            {/* Playback slider */}
            <input type="range" min={0} max={totalTime} value={tick} onChange={e => { setTick(+e.target.value); setPlaying(false); }} className="w-full"/>

            {/* Ready Queue Viz */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#52525B]">State @t={tick}:</span>
              {state.running && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: pColors[state.running] + "CC" }}><span className="w-1.5 h-1.5 rounded-full bg-white dot-running inline-block"/>Running: {state.running}</span>}
              {state.readyQueue.length > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-900/30 border border-yellow-700/30 text-[9px] font-bold text-yellow-400"><Clock className="w-3 h-3"/>Ready: {state.readyQueue.join(", ")}</span>}
              {state.completed.length > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/30 border border-emerald-700/30 text-[9px] font-bold text-emerald-400">✓ Done: {state.completed.join(", ")}</span>}
              {state.notArrived.length > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#27272A] text-[9px] font-bold text-[#52525B]">Pending: {state.notArrived.join(", ")}</span>}
            </div>

            {/* Legend */}
            <div className="flex gap-3 text-[9px] font-mono text-[#52525B] flex-wrap">
              {processes.map(p => <span key={p.id} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: pColors[p.id] }}/>{p.id}</span>)}
            </div>
          </div>

          {/* Bottom: Table + Chart */}
          <div className="flex flex-col lg:flex-row gap-4 min-h-[280px]">
            {/* Table */}
            <div className="flex-[2] glass-card rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#27272A] bg-[#18181B]"><h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#71717A]">Quantitative Analysis</h2></div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="text-[9px] font-black uppercase text-[#52525B] border-b border-[#27272A]">
                    <th className="px-4 py-2">Process</th><th className="px-4 py-2">Arrival</th><th className="px-4 py-2">Burst</th>
                    {showPri && <th className="px-4 py-2">Priority</th>}
                    <th className="px-4 py-2">Finish</th><th className="px-4 py-2">Wait</th><th className="px-4 py-2">TAT</th><th className="px-4 py-2">Response</th>
                  </tr></thead>
                  <tbody className="text-xs font-mono divide-y divide-[#27272A]">
                    {result.metrics.map(m => { const p = processes.find(x => x.id === m.id)!; return (
                      <tr key={m.id} className="hover:bg-[#18181B] transition-colors">
                        <td className="px-4 py-2.5 font-bold" style={{ color: pColors[m.id] }}>{m.id}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{p.arrivalTime}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{p.burstTime}</td>
                        {showPri && <td className="px-4 py-2.5 text-zinc-400">{p.priority}</td>}
                        <td className="px-4 py-2.5 text-zinc-300">{m.completionTime}</td>
                        <td className="px-4 py-2.5 text-zinc-500">{m.waitingTime}</td>
                        <td className="px-4 py-2.5 text-white font-bold">{m.turnaroundTime}</td>
                        <td className="px-4 py-2.5 text-blue-400">{m.responseTime}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 glass-card rounded-xl p-4 flex flex-col gap-3 min-w-[280px]">
              <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[#71717A]"/><h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#71717A]">Algorithm Comparison</h2></div>
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compData} margin={{ top:10,right:10,left:-20,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:9,fill:'#71717A',fontWeight:'bold' }} dy={10}/>
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize:9,fill:'#71717A' }}/>
                    <RTooltip cursor={{ fill:'#18181B' }} contentStyle={{ backgroundColor:'#18181B',borderRadius:'4px',border:'1px solid #27272A',color:'#E4E4E7',fontSize:'10px',fontFamily:'monospace' }}/>
                    <Legend wrapperStyle={{ paddingTop:'10px',fontSize:'9px',fontWeight:'bold' }}/>
                    <Bar dataKey="avgTAT" name="Avg TAT" fill="#3B82F6" radius={[2,2,0,0]} barSize={14}/>
                    <Bar dataKey="avgWT" name="Avg WT" fill="#6366F1" radius={[2,2,0,0]} barSize={14}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="h-8 bg-[#0A0A0B] border-t border-[#27272A] px-5 flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-[#3F3F46] shrink-0">
        <div className="flex gap-4"><span>CPU Scheduling Simulator</span><span className="text-[#3B82F6]">{algorithm} — {info.name}</span></div>
        <div className="flex gap-4"><span>Ticks: {totalTime}</span><span>Processes: {processes.length}</span><span>CPU: {result.cpuUtilization.toFixed(0)}%</span></div>
      </footer>
    </div>
  );
}
