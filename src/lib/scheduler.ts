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
}

export interface SimulationResult {
  executionLog: ExecBlock[];
  metrics: ProcessMetrics[];
  avgTurnaroundTime: number;
  avgWaitingTime: number;
}

export type Algorithm = 
  | "FCFS"
  | "SJF"
  | "SRTF"
  | "Priority"
  | "RR"
  | "MLFQ";

const computeMetrics = (
  processes: ProcessInput[],
  executionLog: ExecBlock[]
): SimulationResult => {
  const completionTimes: Record<string, number> = {};
  
  for (const block of executionLog) {
    if (block.processId !== "IDLE") {
      completionTimes[block.processId] = Math.max(
        completionTimes[block.processId] || 0,
        block.endTime
      );
    }
  }

  const metrics: ProcessMetrics[] = processes.map((p) => {
    const ct = completionTimes[p.id] || 0;
    const tat = ct - p.arrivalTime;
    const wt = tat - p.burstTime;
    return {
      id: p.id,
      completionTime: ct,
      turnaroundTime: Math.max(0, tat),
      waitingTime: Math.max(0, wt),
    };
  });

  const avgTurnaroundTime =
    metrics.reduce((acc, curr) => acc + curr.turnaroundTime, 0) / (metrics.length || 1);
  const avgWaitingTime =
    metrics.reduce((acc, curr) => acc + curr.waitingTime, 0) / (metrics.length || 1);

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

  return {
    executionLog: compressedLog,
    metrics,
    avgTurnaroundTime,
    avgWaitingTime,
  };
};

export const simulateFCFS = (processes: ProcessInput[]): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime || parseInt(String(a.id).replace(/\D/g, '') || "0") - parseInt(String(b.id).replace(/\D/g, '') || "0"));

  for (const p of sorted) {
    if (currentTime < p.arrivalTime) {
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: p.arrivalTime });
      currentTime = p.arrivalTime;
    }
    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + p.burstTime });
    currentTime += p.burstTime;
  }

  return computeMetrics(processes, executionLog);
};

export const simulateSJF = (processes: ProcessInput[]): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = [...processes].map((p) => ({ ...p }));
  
  while (remaining.length > 0) {
    const arrived = remaining.filter((p) => p.arrivalTime <= currentTime);
    
    if (arrived.length === 0) {
      const nextArrival = Math.min(...remaining.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      continue;
    }
    
    arrived.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime);
    const p = arrived[0];
    
    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + p.burstTime });
    currentTime += p.burstTime;
    
    remaining.splice(remaining.findIndex(r => r.id === p.id), 1);
  }

  return computeMetrics(processes, executionLog);
};

export const simulatePriority = (processes: ProcessInput[]): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = [...processes].map((p) => ({ ...p }));
  
  while (remaining.length > 0) {
    const arrived = remaining.filter((p) => p.arrivalTime <= currentTime);
    
    if (arrived.length === 0) {
      const nextArrival = Math.min(...remaining.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      continue;
    }
    
    arrived.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
    const p = arrived[0];
    
    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + p.burstTime });
    currentTime += p.burstTime;
    
    remaining.splice(remaining.findIndex(r => r.id === p.id), 1);
  }

  return computeMetrics(processes, executionLog);
};

export const simulateSRTF = (processes: ProcessInput[]): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = processes.map(p => ({ ...p, remainingTime: p.burstTime }));
  
  while (remaining.length > 0) {
    const arrived = remaining.filter((p) => p.arrivalTime <= currentTime);
    
    if (arrived.length === 0) {
      const nextArrival = Math.min(...remaining.map((p) => p.arrivalTime));
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      continue;
    }
    
    arrived.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime);
    const p = arrived[0];
    
    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + 1 });
    p.remainingTime -= 1;
    currentTime += 1;
    
    if (p.remainingTime === 0) {
      remaining.splice(remaining.findIndex(r => r.id === p.id), 1);
    }
  }

  return computeMetrics(processes, executionLog);
};

export const simulateRR = (processes: ProcessInput[], timeQuantum: number): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  const remaining = processes.map(p => ({ ...p, remainingTime: p.burstTime })).sort((a,b) => a.arrivalTime - b.arrivalTime);
  
  const queue: typeof remaining = [];
  let remainingProcesses = [...remaining];
  
  const enqueueArrived = (time: number) => {
    const arrived = remainingProcesses.filter(p => p.arrivalTime <= time);
    // Sort by arrival time just in case multiple processes hit exactly at this time
    arrived.sort((a,b) => a.arrivalTime - b.arrivalTime);
    for (const p of arrived) {
      queue.push(p);
      remainingProcesses = remainingProcesses.filter(rp => rp.id !== p.id);
    }
  };

  enqueueArrived(currentTime);

  while (queue.length > 0 || remainingProcesses.length > 0) {
    if (queue.length === 0) {
      const nextArrival = remainingProcesses[0].arrivalTime;
      executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
      currentTime = nextArrival;
      enqueueArrived(currentTime);
      continue;
    }
    
    const p = queue.shift()!;
    const execTime = Math.min(p.remainingTime, timeQuantum);
    
    executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + execTime });
    currentTime += execTime;
    p.remainingTime -= execTime;
    
    enqueueArrived(currentTime);
    
    if (p.remainingTime > 0) {
      queue.push(p);
    }
  }

  return computeMetrics(processes, executionLog);
};

export const simulateMLFQ = (processes: ProcessInput[], q0Quantum: number = 2, q1Quantum: number = 4): SimulationResult => {
  let currentTime = 0;
  const executionLog: ExecBlock[] = [];
  
  const remainingProcesses = processes.map(p => ({ ...p, remainingTime: p.burstTime })).sort((a, b) => a.arrivalTime - b.arrivalTime);
  
  const q0: typeof remainingProcesses = [];
  const q1: typeof remainingProcesses = [];
  const q2: typeof remainingProcesses = []; 
  let notYetArrived = [...remainingProcesses];

  const enqueueArrived = (time: number) => {
    const arrived = notYetArrived.filter(p => p.arrivalTime <= time);
    arrived.sort((a,b) => a.arrivalTime - b.arrivalTime);
    for (const p of arrived) {
      q0.push(p);
      notYetArrived = notYetArrived.filter(rp => rp.id !== p.id);
    }
  };

  enqueueArrived(currentTime);

  while (q0.length > 0 || q1.length > 0 || q2.length > 0 || notYetArrived.length > 0) {
    if (q0.length === 0 && q1.length === 0 && q2.length === 0) {
       const nextArrival = Math.min(...notYetArrived.map((p) => p.arrivalTime));
       executionLog.push({ processId: "IDLE", startTime: currentTime, endTime: nextArrival });
       currentTime = nextArrival;
       enqueueArrived(currentTime);
       continue;
    }

    if (q0.length > 0) {
       const p = q0.shift()!;
       const execTime = Math.min(p.remainingTime, q0Quantum);
       
       executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + execTime });
       currentTime += execTime;
       p.remainingTime -= execTime;
       
       enqueueArrived(currentTime);
       
       if (p.remainingTime > 0) {
         q1.push(p);
       }
    } else if (q1.length > 0) {
       const p = q1.shift()!;
       let t = 0;
       while (t < q1Quantum && p.remainingTime > 0) {
         executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + 1 });
         currentTime += 1;
         p.remainingTime -= 1;
         t += 1;
         
         enqueueArrived(currentTime);
         if (q0.length > 0) break;
       }
       if (p.remainingTime > 0) {
         if (t < q1Quantum) {
           q1.unshift(p); // Preempted by Q0 before finishing quantum, resume in Q1
         } else {
           q2.push(p); // Finished quantum, demote to Q2
         }
       }
    } else if (q2.length > 0) {
       const p = q2.shift()!;
       executionLog.push({ processId: p.id, startTime: currentTime, endTime: currentTime + 1 });
       currentTime += 1;
       p.remainingTime -= 1;
       
       enqueueArrived(currentTime);
       if (p.remainingTime > 0) {
         q2.unshift(p); // Preempted or just continuing FCFS tick-by-tick
       }
    }
  }

  return computeMetrics(processes, executionLog);
};

export const runSimulation = (
  processes: ProcessInput[],
  algo: Algorithm,
  quantumMap: { rr: number; q0: number; q1: number } 
): SimulationResult => {
  if (processes.length === 0) {
    return { executionLog: [], metrics: [], avgTurnaroundTime: 0, avgWaitingTime: 0 };
  }
  
  switch (algo) {
    case "FCFS": return simulateFCFS(processes);
    case "SJF": return simulateSJF(processes);
    case "SRTF": return simulateSRTF(processes);
    case "Priority": return simulatePriority(processes);
    case "RR": return simulateRR(processes, quantumMap.rr);
    case "MLFQ": return simulateMLFQ(processes, quantumMap.q0, quantumMap.q1);
    default: return simulateFCFS(processes);
  }
};
