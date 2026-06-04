"""
CPU Scheduling Algorithms - FCFS, SJF, SRTF, Priority, RR, MLFQ
With metrics: Response Time, CPU Utilization, Throughput, Context Switches
Modified to include global settings (context switch overhead, tie-breaker strategy)
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
class SimulatorSettings:
    context_switch_time: int = 0
    tie_breaker: str = "PID"  # "PID", "FIFO", "LIFO"


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


def _get_pid_num(pid: str) -> int:
    return int(''.join(filter(str.isdigit, pid)) or '0')


def get_tie_breaker_sort_val(p, strategy: str):
    if strategy == "FIFO":
        return (p.arrival_time, _get_pid_num(p.id))
    elif strategy == "LIFO":
        return (-p.arrival_time, _get_pid_num(p.id))
    else:  # "PID"
        return _get_pid_num(p.id)


def _compute_metrics(processes: List[ProcessInput], execution_log: List[ExecBlock]) -> SimulationResult:
    completion_times: Dict[str, int] = {}
    first_exec_times: Dict[str, int] = {}

    for block in execution_log:
        if block.process_id != "IDLE" and block.process_id != "SWITCH":
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

    # CPU Utilization (SWITCH and IDLE both represent non-utilization)
    total_time = compressed[-1].end_time if compressed else 0
    active_time = sum(b.end_time - b.start_time for b in compressed if b.process_id != "IDLE" and b.process_id != "SWITCH")
    cpu_util = (active_time / total_time * 100) if total_time > 0 else 0

    # Throughput
    throughput = len(processes) / total_time if total_time > 0 else 0

    # Context switches
    ctx = 0
    last_proc = None
    for b in compressed:
        if b.process_id != "IDLE" and b.process_id != "SWITCH":
            if last_proc is not None and last_proc != b.process_id:
                ctx += 1
            last_proc = b.process_id

    return SimulationResult(compressed, metrics, avg_tat, avg_wt, avg_rt, cpu_util, throughput, ctx)


def simulate_fcfs(processes, settings):
    current_time = 0
    log = []

    def get_sort_key(p):
        return (p.arrival_time, get_tie_breaker_sort_val(p, settings.tie_breaker))

    sorted_p = sorted(processes, key=get_sort_key)
    last_active_id = None
    for p in sorted_p:
        if current_time < p.arrival_time:
            log.append(ExecBlock("IDLE", current_time, p.arrival_time))
            current_time = p.arrival_time
            last_active_id = None

        if last_active_id is not None and last_active_id != p.id and settings.context_switch_time > 0:
            log.append(ExecBlock("SWITCH", current_time, current_time + settings.context_switch_time))
            current_time += settings.context_switch_time

        log.append(ExecBlock(p.id, current_time, current_time + p.burst_time))
        current_time += p.burst_time
        last_active_id = p.id
    return _compute_metrics(processes, log)


def simulate_sjf(processes, settings):
    current_time = 0
    log = []
    remaining = deepcopy(processes)
    last_active_id = None
    while remaining:
        arrived = [p for p in remaining if p.arrival_time <= current_time]
        if not arrived:
            na = min(p.arrival_time for p in remaining)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            last_active_id = None
            continue

        arrived.sort(key=lambda p: (p.burst_time, p.arrival_time, get_tie_breaker_sort_val(p, settings.tie_breaker)))
        p = arrived[0]

        if last_active_id is not None and last_active_id != p.id and settings.context_switch_time > 0:
            log.append(ExecBlock("SWITCH", current_time, current_time + settings.context_switch_time))
            current_time += settings.context_switch_time

        log.append(ExecBlock(p.id, current_time, current_time + p.burst_time))
        current_time += p.burst_time
        last_active_id = p.id
        remaining = [r for r in remaining if r.id != p.id]
    return _compute_metrics(processes, log)


def simulate_priority(processes, settings):
    current_time = 0
    log = []
    remaining = deepcopy(processes)
    last_active_id = None
    while remaining:
        arrived = [p for p in remaining if p.arrival_time <= current_time]
        if not arrived:
            na = min(p.arrival_time for p in remaining)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            last_active_id = None
            continue

        arrived.sort(key=lambda p: (p.priority, p.arrival_time, get_tie_breaker_sort_val(p, settings.tie_breaker)))
        p = arrived[0]

        if last_active_id is not None and last_active_id != p.id and settings.context_switch_time > 0:
            log.append(ExecBlock("SWITCH", current_time, current_time + settings.context_switch_time))
            current_time += settings.context_switch_time

        log.append(ExecBlock(p.id, current_time, current_time + p.burst_time))
        current_time += p.burst_time
        last_active_id = p.id
        remaining = [r for r in remaining if r.id != p.id]
    return _compute_metrics(processes, log)


def simulate_srtf(processes, settings):
    current_time = 0
    log = []
    remaining = [{"id": p.id, "arrival_time": p.arrival_time, "burst_time": p.burst_time,
                  "priority": p.priority, "remaining_time": p.burst_time} for p in processes]

    class TempProcess:
        def __init__(self, d):
            self.id = d["id"]
            self.arrival_time = d["arrival_time"]

    last_executed_id = None
    cs_remaining = 0
    cs_target_id = None

    while remaining:
        arrived = [p for p in remaining if p["arrival_time"] <= current_time]
        if not arrived:
            na = min(p["arrival_time"] for p in remaining)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            last_executed_id = None
            cs_remaining = 0
            cs_target_id = None
            continue

        if cs_remaining > 0:
            log.append(ExecBlock("SWITCH", current_time, current_time + 1))
            current_time += 1
            cs_remaining -= 1
            if cs_remaining == 0:
                last_executed_id = cs_target_id
            continue

        arrived.sort(key=lambda p: (p["remaining_time"], p["arrival_time"], get_tie_breaker_sort_val(TempProcess(p), settings.tie_breaker)))
        best = arrived[0]

        if last_executed_id is not None and last_executed_id != best["id"] and settings.context_switch_time > 0:
            cs_remaining = settings.context_switch_time
            cs_target_id = best["id"]
            log.append(ExecBlock("SWITCH", current_time, current_time + 1))
            current_time += 1
            cs_remaining -= 1
            if cs_remaining == 0:
                last_executed_id = cs_target_id
            continue

        last_executed_id = best["id"]
        log.append(ExecBlock(best["id"], current_time, current_time + 1))
        best["remaining_time"] -= 1
        current_time += 1

        if best["remaining_time"] == 0:
            remaining = [r for r in remaining if r["id"] != best["id"]]

    return _compute_metrics(processes, log)


def simulate_rr(processes, time_quantum, settings):
    current_time = 0
    log = []
    remaining = [{"id": p.id, "arrival_time": p.arrival_time, "burst_time": p.burst_time,
                  "priority": p.priority, "remaining_time": p.burst_time} for p in processes]
    remaining.sort(key=lambda p: p["arrival_time"])
    queue = []
    not_arrived = list(remaining)

    class TempProcess:
        def __init__(self, d):
            self.id = d["id"]
            self.arrival_time = d["arrival_time"]

    def enqueue_arrived(time):
        nonlocal not_arrived
        arrived = [p for p in not_arrived if p["arrival_time"] <= time]
        arrived.sort(key=lambda p: (p["arrival_time"], get_tie_breaker_sort_val(TempProcess(p), settings.tie_breaker)))
        for p in arrived:
            queue.append(p)
        not_arrived = [rp for rp in not_arrived if rp["id"] not in [a["id"] for a in arrived]]

    enqueue_arrived(current_time)

    last_active_id = None
    cs_remaining = 0
    cs_target = None
    current_running = None
    current_quantum_left = 0

    while queue or not_arrived or current_running is not None or cs_target is not None:
        if not queue and not_arrived and current_running is None and cs_target is None:
            na = not_arrived[0]["arrival_time"]
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            enqueue_arrived(current_time)
            last_active_id = None
            continue

        if cs_remaining > 0:
            log.append(ExecBlock("SWITCH", current_time, current_time + 1))
            current_time += 1
            cs_remaining -= 1
            enqueue_arrived(current_time)
            if cs_remaining == 0:
                current_running = cs_target
                current_quantum_left = min(current_running["remaining_time"], time_quantum)
                last_active_id = current_running["id"]
                cs_target = None
            continue

        if current_running is None:
            if queue:
                next_p = queue.pop(0)
                if last_active_id is not None and last_active_id != next_p["id"] and settings.context_switch_time > 0:
                    cs_remaining = settings.context_switch_time
                    cs_target = next_p
                    log.append(ExecBlock("SWITCH", current_time, current_time + 1))
                    current_time += 1
                    cs_remaining -= 1
                    enqueue_arrived(current_time)
                    if cs_remaining == 0:
                        current_running = cs_target
                        current_quantum_left = min(current_running["remaining_time"], time_quantum)
                        last_active_id = current_running["id"]
                        cs_target = None
                else:
                    current_running = next_p
                    current_quantum_left = min(current_running["remaining_time"], time_quantum)
                    last_active_id = current_running["id"]
            continue

        log.append(ExecBlock(current_running["id"], current_time, current_time + 1))
        current_time += 1
        current_running["remaining_time"] -= 1
        current_quantum_left -= 1

        enqueue_arrived(current_time)

        if current_running["remaining_time"] == 0:
            current_running = None
        elif current_quantum_left == 0:
            queue.append(current_running)
            current_running = None

    return _compute_metrics(processes, log)


def simulate_mlfq(processes, q0_quantum, q1_quantum, settings):
    current_time = 0
    log = []
    remaining = [{"id": p.id, "arrival_time": p.arrival_time, "burst_time": p.burst_time,
                  "priority": p.priority, "remaining_time": p.burst_time} for p in processes]
    remaining.sort(key=lambda p: p["arrival_time"])
    q0, q1, q2 = [], [], []
    not_arrived = list(remaining)

    class TempProcess:
        def __init__(self, d):
            self.id = d["id"]
            self.arrival_time = d["arrival_time"]

    def enqueue_arrived(time):
        nonlocal not_arrived
        arrived = [p for p in not_arrived if p["arrival_time"] <= time]
        arrived.sort(key=lambda p: (p["arrival_time"], get_tie_breaker_sort_val(TempProcess(p), settings.tie_breaker)))
        for p in arrived:
            q0.append(p)
        not_arrived = [rp for rp in not_arrived if rp["id"] not in [a["id"] for a in arrived]]

    enqueue_arrived(current_time)

    last_active_id = None
    cs_remaining = 0
    cs_target = None
    current_running = None
    current_quantum_left = 0
    current_queue_index = 0

    while q0 or q1 or q2 or not_arrived or current_running is not None or cs_target is not None:
        if not q0 and not q1 and not q2 and not_arrived and current_running is None and cs_target is None:
            na = min(p["arrival_time"] for p in not_arrived)
            log.append(ExecBlock("IDLE", current_time, na))
            current_time = na
            enqueue_arrived(current_time)
            last_active_id = None
            continue

        if cs_remaining > 0:
            log.append(ExecBlock("SWITCH", current_time, current_time + 1))
            current_time += 1
            cs_remaining -= 1
            enqueue_arrived(current_time)
            if cs_remaining == 0:
                current_running = cs_target
                last_active_id = current_running["id"]
                cs_target = None
            continue

        if current_running is None:
            selected = None
            q_idx = -1

            if q0:
                selected = q0.pop(0)
                q_idx = 0
            elif q1:
                selected = q1.pop(0)
                q_idx = 1
            elif q2:
                selected = q2.pop(0)
                q_idx = 2

            if selected is not None:
                if last_active_id is not None and last_active_id != selected["id"] and settings.context_switch_time > 0:
                    cs_remaining = settings.context_switch_time
                    cs_target = selected
                    current_queue_index = q_idx
                    if q_idx == 0:
                        current_quantum_left = min(selected["remaining_time"], q0_quantum)
                    elif q_idx == 1:
                        current_quantum_left = min(selected["remaining_time"], q1_quantum)
                    else:
                        current_quantum_left = selected["remaining_time"]

                    log.append(ExecBlock("SWITCH", current_time, current_time + 1))
                    current_time += 1
                    cs_remaining -= 1
                    enqueue_arrived(current_time)
                    if cs_remaining == 0:
                        current_running = cs_target
                        last_active_id = current_running["id"]
                        cs_target = None
                else:
                    current_running = selected
                    current_queue_index = q_idx
                    if q_idx == 0:
                        current_quantum_left = min(selected["remaining_time"], q0_quantum)
                    elif q_idx == 1:
                        current_quantum_left = min(selected["remaining_time"], q1_quantum)
                    else:
                        current_quantum_left = selected["remaining_time"]
                    last_active_id = selected["id"]
            continue

        preempted = False
        if current_queue_index == 1 and q0:
            preempted = True
            q1.insert(0, current_running)
        elif current_queue_index == 2 and (q0 or q1):
            preempted = True
            q2.insert(0, current_running)

        if preempted:
            current_running = None
            continue

        log.append(ExecBlock(current_running["id"], current_time, current_time + 1))
        current_time += 1
        current_running["remaining_time"] -= 1
        if current_queue_index < 2:
            current_quantum_left -= 1

        enqueue_arrived(current_time)

        if current_running["remaining_time"] == 0:
            current_running = None
        elif current_queue_index < 2 and current_quantum_left == 0:
            if current_queue_index == 0:
                q1.append(current_running)
            elif current_queue_index == 1:
                q2.append(current_running)
            current_running = None

    return _compute_metrics(processes, log)


def run_simulation(processes, algo, rr_quantum=2, q0_quantum=2, q1_quantum=4, settings=None):
    if settings is None:
        settings = SimulatorSettings()
    if not processes:
        return SimulationResult([], [], 0.0, 0.0, 0.0, 0.0, 0.0, 0)
    if algo == "FCFS":
        return simulate_fcfs(processes, settings)
    elif algo == "SJF":
        return simulate_sjf(processes, settings)
    elif algo == "SRTF":
        return simulate_srtf(processes, settings)
    elif algo == "Priority":
        return simulate_priority(processes, settings)
    elif algo == "RR":
        return simulate_rr(processes, rr_quantum, settings)
    elif algo == "MLFQ":
        return simulate_mlfq(processes, q0_quantum, q1_quantum, settings)
    return simulate_fcfs(processes, settings)


def get_state_at_tick(tick, processes, execution_log):
    """Get running/ready/completed/pending process state at a given tick."""
    current_block = None
    for b in execution_log:
        if b.start_time <= tick < b.end_time:
            current_block = b
            break
    running = current_block.process_id if current_block and current_block.process_id != "IDLE" and current_block.process_id != "SWITCH" else None

    executed_time = {}
    for b in execution_log:
        if b.process_id == "IDLE" or b.process_id == "SWITCH":
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
