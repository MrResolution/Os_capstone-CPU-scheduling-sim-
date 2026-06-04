/**
 * Lab Scheduler — Custom Hybrid Algorithm Engine
 * 
 * Allows users to compose scheduling rules into a pipeline.
 * Rules are evaluated top-to-bottom as primary strategy + tie-breakers.
 */

import type { ProcessInput, ExecBlock, SimulationResult, ProcessMetrics } from "./scheduler";

// ─── Rule Types ───
export type RuleType =
  | "shortest-burst"
  | "longest-burst"
  | "highest-priority"
  | "round-robin"
  | "fcfs"
  | "random";

export interface LabRule {
  id: string;
  type: RuleType;
  quantum?: number;       // only for round-robin
  preemptive: boolean;    // re-evaluate every tick?
}

export interface LabConfig {
  name: string;
  rules: LabRule[];
  contextSwitchTime: number;
}

export const RULE_INFO: Record<RuleType, { name: string; desc: string; icon: string }> = {
  "shortest-burst":   { name: "Shortest Burst",   desc: "Pick process with shortest remaining burst time",       icon: "⚡" },
  "longest-burst":    { name: "Longest Burst",     desc: "Pick process with longest remaining burst time",        icon: "🔋" },
  "highest-priority": { name: "Highest Priority",  desc: "Pick process with highest priority (lowest number)",    icon: "🏆" },
  "round-robin":      { name: "Round Robin",       desc: "Cycle through processes with a fixed time quantum",     icon: "🔄" },
  "fcfs":             { name: "First Come First Served", desc: "Pick the process that arrived earliest",          icon: "📋" },
  "random":           { name: "Random Select",     desc: "Randomly select from the ready queue",                  icon: "🎲" },
};

// ─── Internal Process State ───
interface ProcState {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  remainingTime: number;
}

// ─── Metrics Computation (reused logic from scheduler.ts) ───
function computeMetrics(processes: ProcessInput[], executionLog: ExecBlock[]): SimulationResult {
  const completionTimes: Record<string, number> = {};
  const firstExecTimes: Record<string, number> = {};

  for (const block of executionLog) {
    if (block.processId !== "IDLE" && block.processId !== "SWITCH") {
      completionTimes[block.processId] = Math.max(completionTimes[block.processId] || 0, block.endTime);
      if (!(block.processId in firstExecTimes)) {
        firstExecTimes[block.processId] = block.startTime;
      }
    }
  }

  const metrics: ProcessMetrics[] = processes.map((p) => {
    const ct = completionTimes[p.id] || 0;
    const tat = ct - p.arrivalTime;
    const wt = tat - p.burstTime;
    const rt = (firstExecTimes[p.id] ?? p.arrivalTime) - p.arrivalTime;
    return {
      id: p.id,
      completionTime: ct,
      turnaroundTime: Math.max(0, tat),
      waitingTime: Math.max(0, wt),
      responseTime: Math.max(0, rt),
    };
  });

  const n = metrics.length || 1;
  const avgTurnaroundTime = metrics.reduce((a, m) => a + m.turnaroundTime, 0) / n;
  const avgWaitingTime = metrics.reduce((a, m) => a + m.waitingTime, 0) / n;
  const avgResponseTime = metrics.reduce((a, m) => a + m.responseTime, 0) / n;

  // Compress consecutive blocks
  const compressedLog: ExecBlock[] = [];
  for (const block of executionLog) {
    if (
      compressedLog.length > 0 &&
      compressedLog[compressedLog.length - 1].processId === block.processId &&
      compressedLog[compressedLog.length - 1].endTime === block.startTime
    ) {
      compressedLog[compressedLog.length - 1].endTime = block.endTime;
    } else {
      if (block.endTime > block.startTime) {
        compressedLog.push({ ...block });
      }
    }
  }

  const totalTime = compressedLog.length > 0 ? compressedLog[compressedLog.length - 1].endTime : 0;
  const activeTime = compressedLog
    .filter((b) => b.processId !== "IDLE" && b.processId !== "SWITCH")
    .reduce((a, b) => a + (b.endTime - b.startTime), 0);
  const cpuUtilization = totalTime > 0 ? (activeTime / totalTime) * 100 : 0;
  const throughput = totalTime > 0 ? processes.length / totalTime : 0;

  let contextSwitches = 0;
  let lastProcess: string | null = null;
  for (const block of compressedLog) {
    if (block.processId !== "IDLE" && block.processId !== "SWITCH") {
      if (lastProcess !== null && lastProcess !== block.processId) {
        contextSwitches++;
      }
      lastProcess = block.processId;
    }
  }

  return {
    executionLog: compressedLog,
    metrics,
    avgTurnaroundTime,
    avgWaitingTime,
    avgResponseTime,
    cpuUtilization,
    throughput,
    contextSwitches,
  };
}

// ─── Process Selection by Rule Pipeline ───
function selectProcess(
  ready: ProcState[],
  rules: LabRule[],
  _currentTime: number
): ProcState | null {
  if (ready.length === 0) return null;
  if (ready.length === 1) return ready[0];

  // Build a comparator from the rule pipeline
  let candidates = [...ready];

  for (const rule of rules) {
    if (candidates.length <= 1) break;

    switch (rule.type) {
      case "shortest-burst": {
        const minBurst = Math.min(...candidates.map((p) => p.remainingTime));
        candidates = candidates.filter((p) => p.remainingTime === minBurst);
        break;
      }
      case "longest-burst": {
        const maxBurst = Math.max(...candidates.map((p) => p.remainingTime));
        candidates = candidates.filter((p) => p.remainingTime === maxBurst);
        break;
      }
      case "highest-priority": {
        const minPri = Math.min(...candidates.map((p) => p.priority));
        candidates = candidates.filter((p) => p.priority === minPri);
        break;
      }
      case "fcfs": {
        const minArr = Math.min(...candidates.map((p) => p.arrivalTime));
        candidates = candidates.filter((p) => p.arrivalTime === minArr);
        break;
      }
      case "random": {
        candidates = [candidates[Math.floor(Math.random() * candidates.length)]];
        break;
      }
      case "round-robin": {
        // Round-robin as a selection rule just picks FCFS order for selection
        // The quantum enforcement is handled in the main loop
        const minArr = Math.min(...candidates.map((p) => p.arrivalTime));
        candidates = candidates.filter((p) => p.arrivalTime === minArr);
        break;
      }
    }
  }

  return candidates[0];
}

// ─── Main Lab Simulation ───
export function runLabSimulation(
  processes: ProcessInput[],
  config: LabConfig
): SimulationResult {
  if (processes.length === 0 || config.rules.length === 0) {
    return {
      executionLog: [],
      metrics: [],
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      contextSwitches: 0,
    };
  }

  const executionLog: ExecBlock[] = [];
  const remaining: ProcState[] = processes.map((p) => ({
    ...p,
    remainingTime: p.burstTime,
  }));

  // Determine if the pipeline is preemptive (any rule is preemptive)
  const isPreemptive = config.rules.some((r) => r.preemptive);

  // Find quantum if any round-robin rule exists
  const rrRule = config.rules.find((r) => r.type === "round-robin");
  const quantum = rrRule?.quantum ?? Infinity;

  let currentTime = 0;
  let lastActiveId: string | null = null;
  let csRemaining = 0;
  let csTargetId: string | null = null;
  let currentRunning: ProcState | null = null;
  let currentQuantumLeft = 0;

  // RR queue tracking
  const rrQueue: string[] = [];
  const inQueue = new Set<string>();

  const enqueueArrived = (time: number) => {
    for (const p of remaining) {
      if (p.arrivalTime <= time && p.remainingTime > 0 && !inQueue.has(p.id)) {
        rrQueue.push(p.id);
        inQueue.add(p.id);
      }
    }
  };

  const getReady = (time: number): ProcState[] => {
    return remaining.filter((p) => p.arrivalTime <= time && p.remainingTime > 0);
  };

  const MAX_TICKS = 10000; // Safety limit
  let ticks = 0;

  enqueueArrived(currentTime);

  while (ticks < MAX_TICKS) {
    ticks++;
    const allDone = remaining.every((p) => p.remainingTime <= 0);
    if (allDone) break;

    const ready = getReady(currentTime);

    // No processes ready — advance to next arrival
    if (ready.length === 0 && currentRunning === null && csRemaining === 0) {
      const futureArrivals = remaining.filter((p) => p.remainingTime > 0 && p.arrivalTime > currentTime);
      if (futureArrivals.length === 0) break;
      const nextArrival = Math.min(...futureArrivals.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      lastActiveId = null;
      enqueueArrived(currentTime);
      continue;
    }

    // Handle context switch
    if (csRemaining > 0) {
      executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
      currentTime += 1;
      csRemaining -= 1;
      enqueueArrived(currentTime);
      if (csRemaining === 0) {
        lastActiveId = csTargetId;
        // Find and set the target as current running
        const target = remaining.find((p) => p.id === csTargetId);
        if (target && target.remainingTime > 0) {
          currentRunning = target;
          currentQuantumLeft = Math.min(target.remainingTime, quantum);
        }
      }
      continue;
    }

    // Check preemption
    if (isPreemptive && currentRunning !== null && ready.length > 0) {
      const best = selectProcess(ready, config.rules, currentTime);
      if (best && best.id !== currentRunning.id) {
        // Preempt: re-queue current
        if (rrRule) {
          rrQueue.push(currentRunning.id);
          inQueue.add(currentRunning.id);
        }
        currentRunning = null;
      }
    }

    // Select a process if none running
    if (currentRunning === null) {
      let selected: ProcState | null = null;

      if (rrRule && rrQueue.length > 0) {
        // Use RR queue order
        let nextId: string | undefined;
        while (rrQueue.length > 0) {
          nextId = rrQueue.shift();
          if (nextId) inQueue.delete(nextId);
          const proc = remaining.find((p) => p.id === nextId && p.remainingTime > 0);
          if (proc) {
            selected = proc;
            break;
          }
        }
        if (!selected) {
          selected = selectProcess(ready, config.rules, currentTime);
        }
      } else {
        selected = selectProcess(ready, config.rules, currentTime);
      }

      if (selected === null) {
        // Idle for 1 tick
        executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: currentTime + 1 });
        currentTime += 1;
        enqueueArrived(currentTime);
        continue;
      }

      // Context switch needed?
      if (lastActiveId !== null && lastActiveId !== selected.id && config.contextSwitchTime > 0) {
        csRemaining = config.contextSwitchTime;
        csTargetId = selected.id;
        executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
        currentTime += 1;
        csRemaining -= 1;
        enqueueArrived(currentTime);
        if (csRemaining === 0) {
          lastActiveId = csTargetId;
          currentRunning = selected;
          currentQuantumLeft = Math.min(selected.remainingTime, quantum);
        }
        continue;
      }

      currentRunning = selected;
      currentQuantumLeft = Math.min(selected.remainingTime, quantum);
      lastActiveId = selected.id;
    }

    // Execute 1 tick
    executionLog.push({ processId: currentRunning.id, startTime: currentTime, endTime: currentTime + 1 });
    currentTime += 1;
    currentRunning.remainingTime -= 1;
    currentQuantumLeft -= 1;
    enqueueArrived(currentTime);

    // Check completion
    if (currentRunning.remainingTime <= 0) {
      inQueue.delete(currentRunning.id);
      currentRunning = null;
    } else if (currentQuantumLeft <= 0) {
      // Quantum expired — re-queue
      if (rrRule) {
        rrQueue.push(currentRunning.id);
        inQueue.add(currentRunning.id);
      }
      currentRunning = null;
    }
  }

  return computeMetrics(processes, executionLog);
}

// ─── Helper: Generate a unique rule ID ───
let _ruleIdCounter = 0;
export function generateRuleId(): string {
  _ruleIdCounter++;
  return `rule_${Date.now()}_${_ruleIdCounter}`;
}
