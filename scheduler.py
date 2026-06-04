"""
CPU Scheduling Algorithms - FCFS, SJF, SRTF, Priority, RR, MLFQ
With metrics: Response Time, CPU Utilization, Throughput, Context Switches
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from copy import deepcopy


@dataclass
class ProcessInput:
    id: str
    arrival_time: int
    burst_time: int
    priority: int = 1


@dataclass
class ExecBlock:
    process_id: str
    start_time: int
    end_time: int


@dataclass
class ProcessMetrics:
    id: str
    completion_time: int
    turnaround_time: int
    waiting_time: int
    response_time: int


@dataclass
class SimulationResult:
    execution_log: List[ExecBlock]
    metrics: List[ProcessMetrics]
    avg_turnaround_time: float
    avg_waiting_time: float
    avg_response_time: float
    cpu_utilization: float
    throughput: float
    context_switches: int


ALGORITHMS = ["FCFS", "SJF", "SRTF", "Priority", "RR", "MLFQ"]

ALGORITHM_INFO = {
    "FCFS": {
        "name": "First Come First Served",
        "type": "Non-Preemptive",
        "desc": "Processes execute in arrival order. Simple but can cause the convoy effect where short processes wait behind long ones.",
    },
    "SJF": {
        "name": "Shortest Job First",
        "type": "Non-Preemptive",
        "desc": "Selects the process with the smallest burst time. Optimal for minimizing average waiting time but requires advance knowledge of burst times.",
    },
    "SRTF": {
        "name": "Shortest Remaining Time First",
        "type": "Preemptive",
        "desc": "Preemptive SJF — at each tick, the process with the shortest remaining burst runs. Lowest average wait time but high context-switch overhead.",
    },
    "Priority": {
        "name": "Priority Scheduling",
        "type": "Non-Preemptive",
        "desc": "CPU is allocated to the highest-priority process (lowest number). Can suffer from starvation of low-priority processes.",
    },
    "RR": {
        "name": "Round Robin",
        "type": "Preemptive",
        "desc": "Each process gets a fixed time quantum. After expiry, the process is preempted and re-queued. Provides fair CPU sharing and good response time.",
    },
    "MLFQ": {
        "name": "Multi-Level Feedback Queue",
        "type": "Preemptive",
        "desc": "Multiple queues (Q0→Q1→Q2) with decreasing priority and increasing quantum. Processes that use their full quantum are demoted.",
    },
}

PRESETS = {
    "Default": [
        ProcessInput("P1", 0, 8, 3), ProcessInput("P2", 1, 4, 1),
        ProcessInput("P3", 2, 9, 4), ProcessInput("P4", 3, 5, 2),
    ],
    "CPU Bound": [
        ProcessInput("P1", 0, 15, 2), ProcessInput("P2", 2, 12, 3),
        ProcessInput("P3", 4, 18, 1), ProcessInput("P4", 6, 10, 4),
        ProcessInput("P5", 8, 14, 2),
    ],
    "I/O Bound": [
        ProcessInput("P1", 0, 2, 1), ProcessInput("P2", 1, 3, 2),
        ProcessInput("P3", 2, 1, 3), ProcessInput("P4", 3, 4, 1),
        ProcessInput("P5", 4, 2, 2), ProcessInput("P6", 5, 3, 3),
    ],
    "Equal Burst": [
        ProcessInput("P1", 0, 5, 1), ProcessInput("P2", 0, 5, 2),
        ProcessInput("P3", 0, 5, 3), ProcessInput("P4", 0, 5, 4),
    ],
    "Heavy Load": [
        ProcessInput("P1", 0, 10, 3), ProcessInput("P2", 0, 5, 1),
        ProcessInput("P3", 1, 8, 4), ProcessInput("P4", 1, 3, 2),
        ProcessInput("P5", 2, 7, 5), ProcessInput("P6", 3, 6, 1),
        ProcessInput("P7", 4, 4, 3), ProcessInput("P8", 5, 9, 2),
    ],
}


def _compute_metrics(processes: List[ProcessInput], execution_log: List[ExecBlock]) -> SimulationResult:
    completion_times: Dict[str, int] = {}
    first_exec_times: Dict[str, int] = {}

    for block in execution_log:
        if block.process_id != "IDLE":
            completion_times[block.process_id] = max(
                completion_times.get(block.process_id, 0), block.end_time
            )
            if block.process_id not in first_exec_times:
                first_exec_times[block.process_id] = block.start_time

    metrics = []
    for p in processes:
        ct = completion_times.get(p.id, 0)
        tat = ct - p.arrival_time
        wt = tat - p.burst_time
        rt = first_exec_times.get(p.id, p.arrival_time) - p.arrival_time
        metrics.append(ProcessMetrics(
            id=p.id, completion_time=ct,
            turnaround_time=max(0, tat), waiting_time=max(0, wt),
            response_time=max(0, rt),
        ))

    n = len(metrics) if metrics else 1
    avg_tat = sum(m.turnaround_time for m in metrics) / n
    avg_wt = sum(m.waiting_time for m in metrics) / n
    avg_rt = sum(m.response_time for m in metrics) / n

    # Compress consecutive blocks
    compressed: List[ExecBlock] = []
    for block in execution_log:
        if (compressed and compressed[-1].process_id == block.process_id
                and compressed[-1].end_time == block.start_time):
            compressed[-1].end_time = block.end_time
        else:
            if block.end_time > block.start_time:
                compressed.append(ExecBlock(block.process_id, block.start_time, block.end_time))

    # CPU Utilization
    total_time = compressed[-1].end_time if compressed else 0
    idle_time = sum(b.end_time - b.start_time for b in compressed if b.process_id == "IDLE")
    cpu_util = ((total_time - idle_time) / total_time * 100) if total_time > 0 else 0

    # Throughput
    throughput = len(processes) / total_time if total_time > 0 else 0

    # Context switches
    ctx = 0
    last_proc = None
    for b in compressed:
        if b.process_id != "IDLE":
            if last_proc is not None and last_proc != b.process_id:
                ctx += 1
            last_proc = b.process_id

    return SimulationResult(compressed, metrics, avg_tat, avg_wt, avg_rt, cpu_util, throughput, ctx)


def simulate_fcfs(processes):
    current_time = 0
    log = []
    sorted_p = sorted(processes, key=lambda p: (p.arrival_time, int(''.join(filter(str.isdigit, p.id)) or '0')))
    for p in sorted_p:
        if current_time < p.arrival_time:
            log.append(ExecBlock("IDLE", current_time, p.arrival_time))
            current_time = p.arrival_time
        log.append(ExecBlock(p.id, current_time, current_time + p.burst_time))
        current_time += p.burst_time
    return _compute_metrics(processes, log)


def simulate_sjf(processes):
    current_time = 0
    log = []
    remaining = deepcopy(processes)
    while remaining:
        arrived = [p for p in remaining if p.arrival_time <= current_time]
        if not arrived:
            na = min(p.arrival_time for p in remaining)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            continue
        arrived.sort(key=lambda p: (p.burst_time, p.arrival_time))
        p = arrived[0]
        log.append(ExecBlock(p.id, current_time, current_time + p.burst_time))
        current_time += p.burst_time
        remaining = [r for r in remaining if r.id != p.id]
    return _compute_metrics(processes, log)


def simulate_priority(processes):
    current_time = 0
    log = []
    remaining = deepcopy(processes)
    while remaining:
        arrived = [p for p in remaining if p.arrival_time <= current_time]
        if not arrived:
            na = min(p.arrival_time for p in remaining)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            continue
        arrived.sort(key=lambda p: (p.priority, p.arrival_time))
        p = arrived[0]
        log.append(ExecBlock(p.id, current_time, current_time + p.burst_time))
        current_time += p.burst_time
        remaining = [r for r in remaining if r.id != p.id]
    return _compute_metrics(processes, log)


def simulate_srtf(processes):
    current_time = 0
    log = []
    remaining = [{"id": p.id, "arrival_time": p.arrival_time, "burst_time": p.burst_time,
                  "priority": p.priority, "remaining_time": p.burst_time} for p in processes]
    while remaining:
        arrived = [p for p in remaining if p["arrival_time"] <= current_time]
        if not arrived:
            na = min(p["arrival_time"] for p in remaining)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            continue
        arrived.sort(key=lambda p: (p["remaining_time"], p["arrival_time"]))
        p = arrived[0]
        log.append(ExecBlock(p["id"], current_time, current_time + 1))
        p["remaining_time"] -= 1
        current_time += 1
        if p["remaining_time"] == 0:
            remaining = [r for r in remaining if r["id"] != p["id"]]
    return _compute_metrics(processes, log)


def simulate_rr(processes, time_quantum):
    current_time = 0
    log = []
    remaining = [{"id": p.id, "arrival_time": p.arrival_time, "burst_time": p.burst_time,
                  "priority": p.priority, "remaining_time": p.burst_time} for p in processes]
    remaining.sort(key=lambda p: p["arrival_time"])
    queue = []
    not_arrived = list(remaining)

    def enqueue_arrived(time):
        nonlocal not_arrived
        arrived = [p for p in not_arrived if p["arrival_time"] <= time]
        arrived.sort(key=lambda p: p["arrival_time"])
        for p in arrived:
            queue.append(p)
            not_arrived = [rp for rp in not_arrived if rp["id"] != p["id"]]

    enqueue_arrived(current_time)
    while queue or not_arrived:
        if not queue:
            na = not_arrived[0]["arrival_time"]
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            enqueue_arrived(current_time)
            continue
        p = queue.pop(0)
        exec_time = min(p["remaining_time"], time_quantum)
        log.append(ExecBlock(p["id"], current_time, current_time + exec_time))
        current_time += exec_time
        p["remaining_time"] -= exec_time
        enqueue_arrived(current_time)
        if p["remaining_time"] > 0:
            queue.append(p)
    return _compute_metrics(processes, log)


def simulate_mlfq(processes, q0_quantum=2, q1_quantum=4):
    current_time = 0
    log = []
    remaining = [{"id": p.id, "arrival_time": p.arrival_time, "burst_time": p.burst_time,
                  "priority": p.priority, "remaining_time": p.burst_time} for p in processes]
    remaining.sort(key=lambda p: p["arrival_time"])
    q0, q1, q2 = [], [], []
    not_arrived = list(remaining)

    def enqueue_arrived(time):
        nonlocal not_arrived
        arrived = [p for p in not_arrived if p["arrival_time"] <= time]
        arrived.sort(key=lambda p: p["arrival_time"])
        for p in arrived:
            q0.append(p)
            not_arrived = [rp for rp in not_arrived if rp["id"] != p["id"]]

    enqueue_arrived(current_time)
    while q0 or q1 or q2 or not_arrived:
        if not q0 and not q1 and not q2:
            na = min(p["arrival_time"] for p in not_arrived)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            enqueue_arrived(current_time)
            continue
        if q0:
            p = q0.pop(0)
            exec_time = min(p["remaining_time"], q0_quantum)
            log.append(ExecBlock(p["id"], current_time, current_time + exec_time))
            current_time += exec_time
            p["remaining_time"] -= exec_time
            enqueue_arrived(current_time)
            if p["remaining_time"] > 0:
                q1.append(p)
        elif q1:
            p = q1.pop(0)
            t = 0
            while t < q1_quantum and p["remaining_time"] > 0:
                log.append(ExecBlock(p["id"], current_time, current_time + 1))
                current_time += 1
                p["remaining_time"] -= 1
                t += 1
                enqueue_arrived(current_time)
                if q0:
                    break
            if p["remaining_time"] > 0:
                if t < q1_quantum:
                    q1.insert(0, p)
                else:
                    q2.append(p)
        elif q2:
            p = q2.pop(0)
            log.append(ExecBlock(p["id"], current_time, current_time + 1))
            current_time += 1
            p["remaining_time"] -= 1
            enqueue_arrived(current_time)
            if p["remaining_time"] > 0:
                q2.insert(0, p)
    return _compute_metrics(processes, log)


def run_simulation(processes, algo, rr_quantum=2, q0_quantum=2, q1_quantum=4):
    if not processes:
        return SimulationResult([], [], 0.0, 0.0, 0.0, 0.0, 0.0, 0)
    if algo == "FCFS":
        return simulate_fcfs(processes)
    elif algo == "SJF":
        return simulate_sjf(processes)
    elif algo == "SRTF":
        return simulate_srtf(processes)
    elif algo == "Priority":
        return simulate_priority(processes)
    elif algo == "RR":
        return simulate_rr(processes, rr_quantum)
    elif algo == "MLFQ":
        return simulate_mlfq(processes, q0_quantum, q1_quantum)
    return simulate_fcfs(processes)


def get_state_at_tick(tick, processes, execution_log):
    """Get running/ready/completed/pending process state at a given tick."""
    current_block = None
    for b in execution_log:
        if b.start_time <= tick < b.end_time:
            current_block = b
            break
    running = current_block.process_id if current_block and current_block.process_id != "IDLE" else None

    executed_time = {}
    for b in execution_log:
        if b.process_id == "IDLE":
            continue
        eff_end = min(b.end_time, tick)
        if eff_end > b.start_time:
            executed_time[b.process_id] = executed_time.get(b.process_id, 0) + (eff_end - b.start_time)

    completed, ready_queue, not_arrived = [], [], []
    for p in processes:
        ex = executed_time.get(p.id, 0)
        if ex >= p.burst_time:
            completed.append(p.id)
        elif p.arrival_time > tick:
            not_arrived.append(p.id)
        elif p.id != running:
            ready_queue.append(p.id)
    return {"running": running, "ready": ready_queue, "completed": completed, "pending": not_arrived}
