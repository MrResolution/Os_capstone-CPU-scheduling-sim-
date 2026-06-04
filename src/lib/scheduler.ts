export interface ProcessInput {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
}

export interface ExecBlock {
  processId: string;
  startTime: number;
  endTime: number;
}

export interface ProcessMetrics {
  id: string;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
}

export interface SimulatorSettings {
  contextSwitchTime: number;
  tieBreaker: "PID" | "FIFO" | "LIFO";
}

export interface SimulationResult {
  executionLog: ExecBlock[];
  metrics: ProcessMetrics[];
  avgTurnaroundTime: number;
  avgWaitingTime: number;
  avgResponseTime: number;
  cpuUtilization: number;
  throughput: number;
  contextSwitches: number;
}

export type Algorithm =
  | "FCFS"
  | "SJF"
  | "SRTF"
  | "Priority"
  | "RR"
  | "MLFQ";

const getPidNum = (id: string): number => {
  return parseInt(String(id).replace(/\D/g, "") || "0");
};

const getTieBreakerSorter = (strategy: "PID" | "FIFO" | "LIFO") => {
  return (a: { id: string; arrivalTime: number }, b: { id: string; arrivalTime: number }) => {
    if (strategy === "FIFO") {
      return a.arrivalTime - b.arrivalTime || getPidNum(a.id) - getPidNum(b.id);
    }
    if (strategy === "LIFO") {
      return b.arrivalTime - a.arrivalTime || getPidNum(a.id) - getPidNum(b.id);
    }
    return getPidNum(a.id) - getPidNum(b.id);
  };
};

const computeMetrics = (
  processes: ProcessInput[],
  executionLog: ExecBlock[]
): SimulationResult => {
  const completionTimes: Record<string, number> = {};
  const firstExecTimes: Record<string, number> = {};

  for (const block of executionLog) {
    if (block.processId !== "IDLE" && block.processId !== "SWITCH") {
      completionTimes[block.processId] = Math.max(
        completionTimes[block.processId] || 0,
        block.endTime
      );
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

  // Compress consecutive blocks of the same process
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

  // CPU Utilization
  const totalTime = compressedLog.length > 0 ? compressedLog[compressedLog.length - 1].endTime : 0;
  const activeTime = compressedLog
    .filter((b) => b.processId !== "IDLE" && b.processId !== "SWITCH")
    .reduce((a, b) => a + (b.endTime - b.startTime), 0);
  const cpuUtilization = totalTime > 0 ? (activeTime / totalTime) * 100 : 0;

  // Throughput
  const throughput = totalTime > 0 ? processes.length / totalTime : 0;

  // Context switches (count process transitions, ignoring IDLE and SWITCH)
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
};

export const simulateFCFS = (
  processes: ProcessInput[],
  settings: SimulatorSettings
): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];

  const sorted = [...processes].sort(
    (a, b) =>
      a.arrivalTime - b.arrivalTime ||
      getTieBreakerSorter(settings.tieBreaker)(a, b)
  );

  let lastActiveId: string | null = null;
  for (const p of sorted) {
    if (currentTime < p.arrivalTime) {
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: p.arrivalTime });
      currentTime = p.arrivalTime;
      lastActiveId = null;
    }

    if (lastActiveId !== null && lastActiveId !== p.id && settings.contextSwitchTime > 0) {
      executionLog.push({
        processId: "SWITCH",
        startTime: currentTime,
        endTime: currentTime + settings.contextSwitchTime,
      });
      currentTime += settings.contextSwitchTime;
    }

    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + p.burstTime });
    currentTime += p.burstTime;
    lastActiveId = p.id;
  }

  return computeMetrics(processes, executionLog);
};

export const simulateSJF = (
  processes: ProcessInput[],
  settings: SimulatorSettings
): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = [...processes].map((p) => ({ ...p }));

  let lastActiveId: string | null = null;
  while (remaining.length > 0) {
    const arrived = remaining.filter((p) => p.arrivalTime <= currentTime);

    if (arrived.length === 0) {
      const nextArrival = Math.min(...remaining.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      lastActiveId = null;
      continue;
    }

    arrived.sort((a, b) => {
      if (a.burstTime !== b.burstTime) return a.burstTime - b.burstTime;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return getTieBreakerSorter(settings.tieBreaker)(a, b);
    });
    const p = arrived[0];

    if (lastActiveId !== null && lastActiveId !== p.id && settings.contextSwitchTime > 0) {
      executionLog.push({
        processId: "SWITCH",
        startTime: currentTime,
        endTime: currentTime + settings.contextSwitchTime,
      });
      currentTime += settings.contextSwitchTime;
    }

    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + p.burstTime });
    currentTime += p.burstTime;
    lastActiveId = p.id;

    remaining.splice(
      remaining.findIndex((r) => r.id === p.id),
      1
    );
  }

  return computeMetrics(processes, executionLog);
};

export const simulatePriority = (
  processes: ProcessInput[],
  settings: SimulatorSettings
): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = [...processes].map((p) => ({ ...p }));

  let lastActiveId: string | null = null;
  while (remaining.length > 0) {
    const arrived = remaining.filter((p) => p.arrivalTime <= currentTime);

    if (arrived.length === 0) {
      const nextArrival = Math.min(...remaining.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      lastActiveId = null;
      continue;
    }

    arrived.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return getTieBreakerSorter(settings.tieBreaker)(a, b);
    });
    const p = arrived[0];

    if (lastActiveId !== null && lastActiveId !== p.id && settings.contextSwitchTime > 0) {
      executionLog.push({
        processId: "SWITCH",
        startTime: currentTime,
        endTime: currentTime + settings.contextSwitchTime,
      });
      currentTime += settings.contextSwitchTime;
    }

    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + p.burstTime });
    currentTime += p.burstTime;
    lastActiveId = p.id;

    remaining.splice(
      remaining.findIndex((r) => r.id === p.id),
      1
    );
  }

  return computeMetrics(processes, executionLog);
};

export const simulateSRTF = (
  processes: ProcessInput[],
  settings: SimulatorSettings
): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = processes.map((p) => ({ ...p, remainingTime: p.burstTime }));

  let lastExecutedId: string | null = null;
  let csRemaining = 0;
  let csTargetId: string | null = null;

  while (remaining.length > 0) {
    const arrived = remaining.filter((p) => p.arrivalTime <= currentTime);

    if (arrived.length === 0) {
      const nextArrival = Math.min(...remaining.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      lastExecutedId = null;
      csRemaining = 0;
      csTargetId = null;
      continue;
    }

    if (csRemaining > 0) {
      executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
      currentTime += 1;
      csRemaining -= 1;
      if (csRemaining === 0) {
        lastExecutedId = csTargetId;
      }
      continue;
    }

    arrived.sort((a, b) => {
      if (a.remainingTime !== b.remainingTime) return a.remainingTime - b.remainingTime;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return getTieBreakerSorter(settings.tieBreaker)(a, b);
    });
    const best = arrived[0];

    if (lastExecutedId !== null && lastExecutedId !== best.id && settings.contextSwitchTime > 0) {
      csRemaining = settings.contextSwitchTime;
      csTargetId = best.id;
      executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
      currentTime += 1;
      csRemaining -= 1;
      if (csRemaining === 0) {
        lastExecutedId = csTargetId;
      }
      continue;
    }

    lastExecutedId = best.id;
    executionLog.push({ processId: best.id, startTime: currentTime, endTime: currentTime + 1 });
    best.remainingTime -= 1;
    currentTime += 1;

    if (best.remainingTime === 0) {
      remaining.splice(
        remaining.findIndex((r) => r.id === best.id),
        1
      );
    }
  }

  return computeMetrics(processes, executionLog);
};

export const simulateRR = (
  processes: ProcessInput[],
  timeQuantum: number,
  settings: SimulatorSettings
): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = processes
    .map((p) => ({ ...p, remainingTime: p.burstTime }))
    .sort((a, b) => a.arrivalTime - b.arrivalTime);

  const queue: typeof remaining = [];
  let remainingProcesses = [...remaining];

  const enqueueArrived = (time: number) => {
    const arrived = remainingProcesses.filter((p) => p.arrivalTime <= time);
    arrived.sort((a, b) => a.arrivalTime - b.arrivalTime || getTieBreakerSorter(settings.tieBreaker)(a, b));
    for (const p of arrived) {
      queue.push(p);
      remainingProcesses = remainingProcesses.filter((rp) => rp.id !== p.id);
    }
  };

  enqueueArrived(currentTime);

  let lastActiveId: string | null = null;
  let csRemaining = 0;
  let csTarget: typeof remaining[0] | null = null;
  let currentRunning: typeof remaining[0] | null = null;
  let currentQuantumLeft = 0;

  while (queue.length > 0 || remainingProcesses.length > 0 || currentRunning !== null || csTarget !== null) {
    if (queue.length === 0 && remainingProcesses.length > 0 && currentRunning === null && csTarget === null) {
      const nextArrival = remainingProcesses[0].arrivalTime;
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      enqueueArrived(currentTime);
      lastActiveId = null;
      continue;
    }

    if (csRemaining > 0) {
      executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
      currentTime += 1;
      csRemaining -= 1;
      enqueueArrived(currentTime);
      if (csRemaining === 0) {
        currentRunning = csTarget;
        currentQuantumLeft = Math.min(currentRunning!.remainingTime, timeQuantum);
        lastActiveId = currentRunning!.id;
        csTarget = null;
      }
      continue;
    }

    if (currentRunning === null) {
      if (queue.length > 0) {
        const next = queue.shift()!;
        if (lastActiveId !== null && lastActiveId !== next.id && settings.contextSwitchTime > 0) {
          csRemaining = settings.contextSwitchTime;
          csTarget = next;
          executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
          currentTime += 1;
          csRemaining -= 1;
          enqueueArrived(currentTime);
          if (csRemaining === 0) {
            currentRunning = csTarget;
            currentQuantumLeft = Math.min(currentRunning!.remainingTime, timeQuantum);
            lastActiveId = currentRunning!.id;
            csTarget = null;
          }
        } else {
          currentRunning = next;
          currentQuantumLeft = Math.min(currentRunning.remainingTime, timeQuantum);
          lastActiveId = currentRunning.id;
        }
      }
      continue;
    }

    executionLog.push({ processId: currentRunning.id, startTime: currentTime, endTime: currentTime + 1 });
    currentTime += 1;
    currentRunning.remainingTime -= 1;
    currentQuantumLeft -= 1;

    enqueueArrived(currentTime);

    if (currentRunning.remainingTime === 0) {
      currentRunning = null;
    } else if (currentQuantumLeft === 0) {
      queue.push(currentRunning);
      currentRunning = null;
    }
  }

  return computeMetrics(processes, executionLog);
};

export const simulateMLFQ = (
  processes: ProcessInput[],
  q0Quantum: number = 2,
  q1Quantum: number = 4,
  settings: SimulatorSettings
): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];

  const remainingProcesses = processes
    .map((p) => ({ ...p, remainingTime: p.burstTime }))
    .sort((a, b) => a.arrivalTime - b.arrivalTime);

  const q0: typeof remainingProcesses = [];
  const q1: typeof remainingProcesses = [];
  const q2: typeof remainingProcesses = [];
  let notYetArrived = [...remainingProcesses];

  const enqueueArrived = (time: number) => {
    const arrived = notYetArrived.filter((p) => p.arrivalTime <= time);
    arrived.sort((a, b) => a.arrivalTime - b.arrivalTime || getTieBreakerSorter(settings.tieBreaker)(a, b));
    for (const p of arrived) {
      q0.push(p);
      notYetArrived = notYetArrived.filter((rp) => rp.id !== p.id);
    }
  };

  enqueueArrived(currentTime);

  let lastActiveId: string | null = null;
  let csRemaining = 0;
  let csTarget: typeof remainingProcesses[0] | null = null;
  let currentRunning: typeof remainingProcesses[0] | null = null;
  let currentQuantumLeft = 0;
  let currentQueueIndex = 0; // 0 for Q0, 1 for Q1, 2 for Q2

  while (q0.length > 0 || q1.length > 0 || q2.length > 0 || notYetArrived.length > 0 || currentRunning !== null || csTarget !== null) {
    if (q0.length === 0 && q1.length === 0 && q2.length === 0 && notYetArrived.length > 0 && currentRunning === null && csTarget === null) {
      const nextArrival = Math.min(...notYetArrived.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      enqueueArrived(currentTime);
      lastActiveId = null;
      continue;
    }

    if (csRemaining > 0) {
      executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
      currentTime += 1;
      csRemaining -= 1;
      enqueueArrived(currentTime);
      if (csRemaining === 0) {
        currentRunning = csTarget;
        lastActiveId = currentRunning!.id;
        csTarget = null;
      }
      continue;
    }

    if (currentRunning === null) {
      let selected: typeof remainingProcesses[0] | null = null;
      let qIdx = -1;

      if (q0.length > 0) {
        selected = q0.shift()!;
        qIdx = 0;
      } else if (q1.length > 0) {
        selected = q1.shift()!;
        qIdx = 1;
      } else if (q2.length > 0) {
        selected = q2.shift()!;
        qIdx = 2;
      }

      if (selected !== null) {
        if (lastActiveId !== null && lastActiveId !== selected.id && settings.contextSwitchTime > 0) {
          csRemaining = settings.contextSwitchTime;
          csTarget = selected;
          currentQueueIndex = qIdx;
          if (qIdx === 0) currentQuantumLeft = Math.min(selected.remainingTime, q0Quantum);
          else if (qIdx === 1) currentQuantumLeft = Math.min(selected.remainingTime, q1Quantum);
          else currentQuantumLeft = selected.remainingTime;

          executionLog.push({ processId: "SWITCH", startTime: currentTime, endTime: currentTime + 1 });
          currentTime += 1;
          csRemaining -= 1;
          enqueueArrived(currentTime);
          if (csRemaining === 0) {
            currentRunning = csTarget;
            lastActiveId = currentRunning!.id;
            csTarget = null;
          }
        } else {
          currentRunning = selected;
          currentQueueIndex = qIdx;
          if (qIdx === 0) currentQuantumLeft = Math.min(selected.remainingTime, q0Quantum);
          else if (qIdx === 1) currentQuantumLeft = Math.min(selected.remainingTime, q1Quantum);
          else currentQuantumLeft = selected.remainingTime;
          lastActiveId = selected.id;
        }
      }
      continue;
    }

    let preempted = false;
    if (currentQueueIndex === 1 && q0.length > 0) {
      preempted = true;
      q1.unshift(currentRunning);
    } else if (currentQueueIndex === 2 && (q0.length > 0 || q1.length > 0)) {
      preempted = true;
      q2.unshift(currentRunning);
    }

    if (preempted) {
      currentRunning = null;
      continue;
    }

    executionLog.push({ processId: currentRunning.id, startTime: currentTime, endTime: currentTime + 1 });
    currentTime += 1;
    currentRunning.remainingTime -= 1;
    if (currentQueueIndex < 2) {
      currentQuantumLeft -= 1;
    }

    enqueueArrived(currentTime);

    if (currentRunning.remainingTime === 0) {
      currentRunning = null;
    } else if (currentQueueIndex < 2 && currentQuantumLeft === 0) {
      if (currentQueueIndex === 0) {
        q1.push(currentRunning);
      } else if (currentQueueIndex === 1) {
        q2.push(currentRunning);
      }
      currentRunning = null;
    }
  }

  return computeMetrics(processes, executionLog);
};

export const runSimulation = (
  processes: ProcessInput[],
  algo: Algorithm,
  quantumMap: { rr: number; q0: number; q1: number },
  settings: SimulatorSettings = { contextSwitchTime: 0, tieBreaker: "PID" }
): SimulationResult => {
  if (processes.length === 0) {
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

  switch (algo) {
    case "FCFS":
      return simulateFCFS(processes, settings);
    case "SJF":
      return simulateSJF(processes, settings);
    case "SRTF":
      return simulateSRTF(processes, settings);
    case "Priority":
      return simulatePriority(processes, settings);
    case "RR":
      return simulateRR(processes, quantumMap.rr, settings);
    case "MLFQ":
      return simulateMLFQ(processes, quantumMap.q0, quantumMap.q1, settings);
    default:
      return simulateFCFS(processes, settings);
  }
};

export function getStateAtTick(
  tick: number,
  processes: ProcessInput[],
  executionLog: ExecBlock[]
): {
  running: string | null;
  readyQueue: string[];
  completed: string[];
  notArrived: string[];
} {
  const currentBlock = executionLog.find((b) => b.startTime <= tick && tick < b.endTime);
  const running =
    currentBlock && currentBlock.processId !== "IDLE" && currentBlock.processId !== "SWITCH"
      ? currentBlock.processId
      : null;

  const executedTime: Record<string, number> = {};
  for (const block of executionLog) {
    if (block.processId === "IDLE" || block.processId === "SWITCH") continue;
    const effectiveEnd = Math.min(block.endTime, tick);
    if (effectiveEnd > block.startTime) {
      executedTime[block.processId] =
        (executedTime[block.processId] || 0) + (effectiveEnd - block.startTime);
    }
  }

  const completed: string[] = [];
  const readyQueue: string[] = [];
  const notArrived: string[] = [];

  for (const p of processes) {
    const executed = executedTime[p.id] || 0;
    if (executed >= p.burstTime) {
      completed.push(p.id);
    } else if (p.arrivalTime > tick) {
      notArrived.push(p.id);
    } else if (p.id !== running) {
      readyQueue.push(p.id);
    }
  }

  return { running, readyQueue, completed, notArrived };
}
