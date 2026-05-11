import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Play, Settings2, BarChart2 } from "lucide-react";
import { cn } from "./lib/utils";
import {
  type ProcessInput,
  type Algorithm,
  runSimulation,
  type SimulationResult,
} from "./lib/scheduler";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ALGORITHMS: Algorithm[] = ["FCFS", "SJF", "SRTF", "Priority", "RR", "MLFQ"];
const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#6366F1", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#06B6D4"
];

function generateId(index: number) {
  return `P${index + 1}`;
}

export default function App() {
  const [processes, setProcesses] = useState<ProcessInput[]>([
    { id: "P1", arrivalTime: 0, burstTime: 8, priority: 3 },
    { id: "P2", arrivalTime: 1, burstTime: 4, priority: 1 },
    { id: "P3", arrivalTime: 2, burstTime: 9, priority: 4 },
    { id: "P4", arrivalTime: 3, burstTime: 5, priority: 2 },
  ]);

  const [algorithm, setAlgorithm] = useState<Algorithm>("FCFS");
  const [quantumRR, setQuantumRR] = useState<number>(2);
  const [quantumQ0, setQuantumQ0] = useState<number>(2);
  const [quantumQ1, setQuantumQ1] = useState<number>(4);

  const [newArrival, setNewArrival] = useState(0);
  const [newBurst, setNewBurst] = useState(1);
  const [newPriority, setNewPriority] = useState(1);

  const result: SimulationResult = useMemo(() => {
    return runSimulation(processes, algorithm, { rr: quantumRR, q0: quantumQ0, q1: quantumQ1 });
  }, [processes, algorithm, quantumRR, quantumQ0, quantumQ1]);

  const comparisonData = useMemo(() => {
    return ALGORITHMS.map((algo) => {
      const res = runSimulation(processes, algo, { rr: quantumRR, q0: quantumQ0, q1: quantumQ1 });
      return {
        name: algo,
        avgTAT: Number(res.avgTurnaroundTime.toFixed(2)),
        avgWT: Number(res.avgWaitingTime.toFixed(2)),
      };
    });
  }, [processes, quantumRR, quantumQ0, quantumQ1]);

  const processColors = useMemo(() => {
    const map: Record<string, string> = {};
    processes.forEach((p, i) => {
      map[p.id] = COLORS[i % COLORS.length];
    });
    map["IDLE"] = "transparent";
    return map;
  }, [processes]);

  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const id = generateId(processes.length);
    setProcesses([...processes, { id, arrivalTime: newArrival, burstTime: newBurst, priority: newPriority }]);
    setNewArrival(newArrival + 1);
  };

  const removeProcess = (id: string) => {
    if (processes.length <= 1) return;
    setProcesses(processes.filter((p) => p.id !== id));
  };

  const totalSimulationTime = result.executionLog.length > 0 
    ? result.executionLog[result.executionLog.length - 1].endTime 
    : 0;

  return (
    <div className="h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans flex flex-col overflow-hidden">
      <header className="h-16 border-b border-[#27272A] flex items-center justify-between px-6 bg-[#121214] shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase">
            CPU<span className="text-[#3B82F6]">Sim</span>.OS
          </h1>
          <div className="h-6 w-[1px] bg-[#27272A]"></div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-[#27272A] border border-[#3F3F46] rounded text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
              {algorithm}
            </span>
            {algorithm === "RR" && (
               <span className="px-3 py-1 bg-[#1D283A] border border-[#3B82F6] rounded text-[10px] font-bold uppercase tracking-wider text-[#60A5FA]">
                 Quantum: {quantumRR}ms
               </span>
            )}
            {algorithm === "MLFQ" && (
               <span className="px-3 py-1 bg-[#1D283A] border border-[#3B82F6] rounded text-[10px] font-bold uppercase tracking-wider text-[#60A5FA]">
                 Q0: {quantumQ0}ms | Q1: {quantumQ1}ms
               </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <aside className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex flex-col gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#71717A]">Configuration</h2>
            
            <div className="flex flex-col gap-2 relative z-50">
              <label className="text-[9px] font-bold uppercase text-[#52525B]">Algorithm</label>
              <select 
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                className="w-full bg-[#18181B] border border-[#3F3F46] rounded text-xs p-2 text-white outline-none focus:border-[#3B82F6] transition-colors appearance-none"
              >
                {ALGORITHMS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {algorithm === "RR" && (
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase text-[#52525B]">Time Quantum</label>
                <input type="number" min="1" value={quantumRR} onChange={e => setQuantumRR(Number(e.target.value))} className="w-full bg-[#18181B] border border-[#3F3F46] rounded text-xs p-2 text-white outline-none focus:border-[#3B82F6] transition-colors" />
              </div>
            )}

            {algorithm === "MLFQ" && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[9px] font-bold uppercase text-[#52525B]">Q0 Quantum</label>
                  <input type="number" min="1" value={quantumQ0} onChange={e => setQuantumQ0(Number(e.target.value))} className="w-full bg-[#18181B] border border-[#3F3F46] rounded text-xs p-2 text-white outline-none focus:border-[#3B82F6] transition-colors" />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[9px] font-bold uppercase text-[#52525B]">Q1 Quantum</label>
                  <input type="number" min="1" value={quantumQ1} onChange={e => setQuantumQ1(Number(e.target.value))} className="w-full bg-[#18181B] border border-[#3F3F46] rounded text-xs p-2 text-white outline-none focus:border-[#3B82F6] transition-colors" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#71717A]">Process Workload</h2>
            
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1 text-[9px] uppercase font-bold text-[#52525B] px-2 mb-1 text-center">
                <span className="text-left">ID</span><span>ARR</span><span>BRST</span><span>PRI</span>
              </div>
              
              {processes.map((p) => (
                <div key={p.id} className="p-2 bg-[#18181B] border border-[#27272A] rounded flex justify-between items-center group relative">
                  <span className="font-mono font-bold text-xs w-8" style={{ color: processColors[p.id] }}>{p.id}</span>
                  <div className="w-10 text-center text-xs text-zinc-300 font-mono">{p.arrivalTime}</div>
                  <div className="w-10 text-center text-xs text-zinc-300 font-mono">{p.burstTime}</div>
                  <div className="w-10 text-center text-xs text-zinc-300 font-mono">{p.priority}</div>
                  <button
                    onClick={() => removeProcess(p.id)}
                    disabled={processes.length <= 1}
                    className="absolute -right-2 -top-2 bg-[#3F3F46] hover:bg-[#EF4444] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:hidden"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddProcess} className="mt-2 flex flex-col gap-2">
              <div className="p-2 bg-[#18181B] border border-[#27272A] rounded flex justify-between items-center">
                <span className="text-[#52525B] font-mono font-bold text-xs w-8">NEW</span>
                <input type="number" min="0" value={newArrival} onChange={e => setNewArrival(Number(e.target.value))} className="w-10 bg-black border border-[#3F3F46] rounded text-center text-xs p-1 text-white outline-none focus:border-[#3B82F6]" required />
                <input type="number" min="1" value={newBurst} onChange={e => setNewBurst(Number(e.target.value))} className="w-10 bg-black border border-[#3F3F46] rounded text-center text-xs p-1 text-white outline-none focus:border-[#3B82F6]" required />
                <input type="number" min="1" value={newPriority} onChange={e => setNewPriority(Number(e.target.value))} className="w-10 bg-black border border-[#3F3F46] rounded text-center text-xs p-1 text-white outline-none focus:border-[#3B82F6]" required />
              </div>
              <button type="submit" className="w-full py-2 flex items-center justify-center gap-1 border-2 border-dashed border-[#27272A] rounded text-[10px] font-bold uppercase text-[#71717A] hover:bg-[#18181B] hover:text-[#A1A1AA] hover:border-[#3F3F46] transition-colors">
                <Plus className="w-3 h-3" /> Add Process
              </button>
            </form>
          </div>

          <div className="bg-gradient-to-br from-[#1E3A8A] to-[#1E1B4B] rounded-xl border border-[#3B82F6]/30 p-5 flex flex-col justify-center items-center gap-2 mt-auto shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Avg Waiting Time</span>
            <span className="text-6xl font-black text-white leading-none">{result.avgWaitingTime.toFixed(2)}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300 mt-4">Avg Turnaround</span>
            <span className="text-4xl font-black text-white leading-none">{result.avgTurnaroundTime.toFixed(2)}</span>
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#71717A]">Timeline: Gantt Chart Visualization</h2>
              <div className="flex gap-4 text-[10px] font-mono text-[#52525B] flex-wrap">
                {processes.map(p => (
                  <span key={p.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: processColors[p.id] }}></div> 
                    {p.id}
                  </span>
                ))}
              </div>
            </div>

            {result.executionLog.length > 0 ? (
              <div className="relative h-24 bg-black/40 border border-[#27272A] rounded-lg overflow-hidden flex w-full">
                {result.executionLog.map((block, idx) => {
                  const duration = block.endTime - block.startTime;
                  const widthPct = (duration / totalSimulationTime) * 100;
                  const isIdle = block.processId === "IDLE";
                  return (
                    <div
                      key={`${block.processId}-${block.startTime}-${idx}`}
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: isIdle ? "transparent" : processColors[block.processId],
                        opacity: isIdle ? 1 : 0.8
                      }}
                      className={cn(
                        "h-full border-r border-black/20 flex flex-col items-center justify-center transition-opacity hover:opacity-100",
                        isIdle && "border border-dashed border-[#27272A]"
                      )}
                      title={`${block.processId}: ${block.startTime} to ${block.endTime}`}
                    >
                      {!isIdle && (
                        <>
                          <span className="text-[10px] font-bold text-white shadow-black/50 drop-shadow-sm">{block.processId}</span>
                          <span className="text-[8px] text-white/80 font-mono drop-shadow-sm">
                            {block.startTime}-{block.endTime}
                          </span>
                        </>
                      )}
                      {isIdle && (
                        <span className="text-[8px] font-bold text-[#52525B] tracking-widest uppercase">IDLE</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
               <div className="h-24 bg-black/40 border border-dashed border-[#27272A] rounded-lg flex items-center justify-center">
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#52525B]">No execution data</span>
               </div>
            )}
             <div className="flex justify-between items-center text-[10px] font-mono text-[#52525B] -mt-2 px-1">
               <span>0ms</span>
               <span>Total: {totalSimulationTime}ms</span>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[300px]">
            <div className="flex-[2] bg-[#121214] border border-[#27272A] rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#27272A] bg-[#18181B]">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#71717A]">Quantitative Analysis Table</h2>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-[#52525B] border-b border-[#27272A]">
                      <th className="px-6 py-3 font-bold">Process ID</th>
                      <th className="px-6 py-3 font-bold">Arrival</th>
                      <th className="px-6 py-3 font-bold">Burst</th>
                      <th className="px-6 py-3 font-bold">Priority</th>
                      <th className="px-6 py-3 font-bold">Finish</th>
                      <th className="px-6 py-3 font-bold text-zinc-400">Wait Time</th>
                      <th className="px-6 py-3 font-bold text-white">Turnaround</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono divide-y divide-[#27272A]">
                    {result.metrics.map(m => {
                      const p = processes.find(p => p.id === m.id)!;
                      const c = processColors[p.id];
                      return (
                        <tr key={m.id} className="hover:bg-[#18181B] transition-colors">
                          <td className="px-6 py-4 font-bold" style={{ color: c }}>{m.id}</td>
                          <td className="px-6 py-4 text-zinc-300">{p.arrivalTime}</td>
                          <td className="px-6 py-4 text-zinc-300">{p.burstTime}</td>
                          <td className="px-6 py-4 text-zinc-300">{p.priority}</td>
                          <td className="px-6 py-4 text-zinc-300">{m.completionTime}</td>
                          <td className="px-6 py-4 text-zinc-500">{m.waitingTime}</td>
                          <td className="px-6 py-4 text-white font-bold">{m.turnaroundTime}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex-[1] bg-[#121214] border border-[#27272A] rounded-xl p-4 flex flex-col gap-4 min-w-[300px]">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#71717A]" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#71717A]">Algorithm Comparison</h2>
              </div>
              <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717A', fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717A', fontWeight: 'bold' }} />
                    <RechartsTooltip 
                      cursor={{ fill: '#18181B' }}
                      contentStyle={{ backgroundColor: '#18181B', borderRadius: '4px', border: '1px solid #27272A', color: '#E4E4E7', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#E4E4E7' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px', fontWeight: 'bold', color: '#A1A1AA' }} />
                    <Bar dataKey="avgTAT" name="Avg Turnaround" fill="#3B82F6" radius={[2, 2, 0, 0]} barSize={16} />
                    <Bar dataKey="avgWT" name="Avg Waiting" fill="#6366F1" radius={[2, 2, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="h-10 bg-[#0A0A0B] border-t border-[#27272A] px-6 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-[#3F3F46] shrink-0">
        <div>SYSTEM READY // PREEMPTIVE DISPATCH ACTIVE</div>
        <div className="flex gap-6">
          <span>TICKS: {totalSimulationTime}</span>
          <span className="text-[#3B82F6]">ALGORITHM: {algorithm}</span>
        </div>
      </footer>
    </div>
  );
}
