import type { Algorithm, ProcessInput } from "./lib/scheduler";

export const ALGORITHMS: Algorithm[] = ["FCFS", "SJF", "SRTF", "Priority", "RR", "MLFQ"];
export const COLORS = ["#3B82F6","#10B981","#F59E0B","#6366F1","#8B5CF6","#EC4899","#14B8A6","#F97316","#06B6D4"];

export const ALGORITHM_INFO: Record<Algorithm, { name: string; desc: string; type: string }> = {
  FCFS: { name: "First Come First Served", type: "Non-Preemptive", desc: "Processes execute in arrival order. Simple but can cause the convoy effect where short processes wait behind long ones." },
  SJF: { name: "Shortest Job First", type: "Non-Preemptive", desc: "Selects the process with the smallest burst time. Optimal for minimizing average waiting time but requires advance knowledge of burst times." },
  SRTF: { name: "Shortest Remaining Time First", type: "Preemptive", desc: "Preemptive SJF — at each tick, the process with the shortest remaining burst runs. Lowest average wait time but high context-switch overhead." },
  Priority: { name: "Priority Scheduling", type: "Non-Preemptive", desc: "CPU is allocated to the highest-priority process (lowest number). Can suffer from starvation of low-priority processes." },
  RR: { name: "Round Robin", type: "Preemptive", desc: "Each process gets a fixed time quantum. After expiry, the process is preempted and re-queued. Provides fair CPU sharing and good response time." },
  MLFQ: { name: "Multi-Level Feedback Queue", type: "Preemptive", desc: "Multiple queues (Q0→Q1→Q2) with decreasing priority and increasing quantum. Processes that use their full quantum are demoted. Balances responsiveness and throughput." },
};

export const PRESETS: Record<string, { name: string; processes: ProcessInput[] }> = {
  default: { name: "Default", processes: [
    { id:"P1", arrivalTime:0, burstTime:8, priority:3 },
    { id:"P2", arrivalTime:1, burstTime:4, priority:1 },
    { id:"P3", arrivalTime:2, burstTime:9, priority:4 },
    { id:"P4", arrivalTime:3, burstTime:5, priority:2 },
  ]},
  cpuBound: { name: "CPU Bound", processes: [
    { id:"P1", arrivalTime:0, burstTime:15, priority:2 },
    { id:"P2", arrivalTime:2, burstTime:12, priority:3 },
    { id:"P3", arrivalTime:4, burstTime:18, priority:1 },
    { id:"P4", arrivalTime:6, burstTime:10, priority:4 },
    { id:"P5", arrivalTime:8, burstTime:14, priority:2 },
  ]},
  ioBound: { name: "I/O Bound Mix", processes: [
    { id:"P1", arrivalTime:0, burstTime:2, priority:1 },
    { id:"P2", arrivalTime:1, burstTime:3, priority:2 },
    { id:"P3", arrivalTime:2, burstTime:1, priority:3 },
    { id:"P4", arrivalTime:3, burstTime:4, priority:1 },
    { id:"P5", arrivalTime:4, burstTime:2, priority:2 },
    { id:"P6", arrivalTime:5, burstTime:3, priority:3 },
  ]},
  equalBurst: { name: "Equal Burst", processes: [
    { id:"P1", arrivalTime:0, burstTime:5, priority:1 },
    { id:"P2", arrivalTime:0, burstTime:5, priority:2 },
    { id:"P3", arrivalTime:0, burstTime:5, priority:3 },
    { id:"P4", arrivalTime:0, burstTime:5, priority:4 },
  ]},
  heavyLoad: { name: "Heavy Load", processes: [
    { id:"P1", arrivalTime:0, burstTime:10, priority:3 },
    { id:"P2", arrivalTime:0, burstTime:5, priority:1 },
    { id:"P3", arrivalTime:1, burstTime:8, priority:4 },
    { id:"P4", arrivalTime:1, burstTime:3, priority:2 },
    { id:"P5", arrivalTime:2, burstTime:7, priority:5 },
    { id:"P6", arrivalTime:3, burstTime:6, priority:1 },
    { id:"P7", arrivalTime:4, burstTime:4, priority:3 },
    { id:"P8", arrivalTime:5, burstTime:9, priority:2 },
  ]},
};

export function generateRandomProcesses(count: number): ProcessInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `P${i + 1}`,
    arrivalTime: Math.floor(Math.random() * Math.max(1, count)),
    burstTime: Math.floor(Math.random() * 14) + 1,
    priority: Math.floor(Math.random() * 5) + 1,
  })).sort((a, b) => a.arrivalTime - b.arrivalTime);
}

export function exportCSV(result: any, processes: ProcessInput[]) {
  const hdr = "Process,Arrival,Burst,Priority,Finish,Wait,Turnaround,Response\n";
  const rows = result.metrics.map((m: any) => {
    const p = processes.find((pr: any) => pr.id === m.id)!;
    return `${m.id},${p.arrivalTime},${p.burstTime},${p.priority},${m.completionTime},${m.waitingTime},${m.turnaroundTime},${m.responseTime}`;
  }).join("\n");
  const blob = new Blob([hdr + rows], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cpusim_results.csv";
  a.click();
}
