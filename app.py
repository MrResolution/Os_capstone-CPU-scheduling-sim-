"""CPUSim.OS - CPU Scheduling Simulator (Python Desktop App)"""
import customtkinter as ctk
import matplotlib
matplotlib.use("TkAgg")
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np
import random, csv, io
from tkinter import filedialog
from scheduler import (ProcessInput, run_simulation, ALGORITHMS, ALGORITHM_INFO, PRESETS, get_state_at_tick)
from ui_components import (make_header, make_sidebar, make_main_area, COLORS, BG_DARK, BG_CARD, BG_INPUT, BORDER, TEXT_DIM, TEXT_MID, BLUE)

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class CPUSimApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("CPUSim.OS - CPU Scheduling Simulator")
        self.geometry("1360x820")
        self.minsize(1100, 700)
        self.configure(fg_color=BG_DARK)

        self.processes = []
        self.algorithm = ctk.StringVar(value="FCFS")
        self.rr_quantum = ctk.IntVar(value=2)
        self.q0_quantum = ctk.IntVar(value=2)
        self.q1_quantum = ctk.IntVar(value=4)
        self.new_arrival = ctk.IntVar(value=4)
        self.new_burst = ctk.IntVar(value=1)
        self.new_priority = ctk.IntVar(value=1)

        # Playback state
        self.current_tick = 0
        self.is_playing = False
        self.play_job = None

        make_header(self, self)
        body = ctk.CTkFrame(self, fg_color=BG_DARK)
        body.pack(fill="both", expand=True, padx=8, pady=8)
        body.columnconfigure(1, weight=1)
        body.rowconfigure(0, weight=1)
        make_sidebar(body, self)
        make_main_area(body, self)

        self.algorithm.trace_add("write", lambda *_: self._on_config_change())
        self.rr_quantum.trace_add("write", lambda *_: self._on_config_change())
        self.q0_quantum.trace_add("write", lambda *_: self._on_config_change())
        self.q1_quantum.trace_add("write", lambda *_: self._on_config_change())
        self._on_config_change()

    def _on_config_change(self):
        self.current_tick = 0
        self.is_playing = False
        if self.play_job:
            self.after_cancel(self.play_job)
            self.play_job = None
        self._refresh()

    def _refresh(self):
        algo = self.algorithm.get()
        self.result = run_simulation(self.processes, algo, self.rr_quantum.get(), self.q0_quantum.get(), self.q1_quantum.get())
        self.total_time = self.result.execution_log[-1].end_time if self.result.execution_log else 0
        self._refresh_quantum_controls(algo)
        self._refresh_info(algo)
        self._refresh_process_list()
        self._refresh_add_form()
        self._refresh_stats()
        self._refresh_gantt()
        self._refresh_state_display()
        self._refresh_table()
        self._refresh_comparison()
        self._update_slider()

    def _show_priority(self):
        return self.algorithm.get() in ("Priority", "MLFQ")

    # --- Playback ---
    def _toggle_play(self):
        if self.is_playing:
            self.is_playing = False
            if self.play_job:
                self.after_cancel(self.play_job)
                self.play_job = None
            self.play_btn.configure(text="▶")
        else:
            if self.current_tick >= self.total_time:
                self.current_tick = 0
            self.is_playing = True
            self.play_btn.configure(text="⏸")
            self._play_step()

    def _play_step(self):
        if not self.is_playing or self.current_tick >= self.total_time:
            self.is_playing = False
            self.play_btn.configure(text="▶")
            return
        self.current_tick += 1
        self._refresh_gantt()
        self._refresh_state_display()
        self._update_slider()
        speed = int(self.speed_var.get().replace("x", ""))
        self.play_job = self.after(max(50, 500 // speed), self._play_step)

    def _step_fwd(self):
        if self.current_tick < self.total_time:
            self.current_tick += 1
            self._refresh_gantt()
            self._refresh_state_display()
            self._update_slider()

    def _step_back(self):
        if self.current_tick > 0:
            self.current_tick -= 1
            self._refresh_gantt()
            self._refresh_state_display()
            self._update_slider()

    def _reset_play(self):
        self.is_playing = False
        if self.play_job:
            self.after_cancel(self.play_job)
            self.play_job = None
        self.current_tick = 0
        self.play_btn.configure(text="▶")
        self._refresh_gantt()
        self._refresh_state_display()
        self._update_slider()

    def _on_slider(self, value):
        self.current_tick = int(value)
        self._refresh_gantt()
        self._refresh_state_display()

    def _update_slider(self):
        tt = max(1, self.total_time)
        self.gantt_slider.configure(to=tt, number_of_steps=tt)
        self.gantt_slider.set(self.current_tick)
        self.tick_label.configure(text=f"t={self.current_tick}/{self.total_time}")

    # --- Actions ---
    def _random_processes(self):
        n = random.randint(3, 8)
        self.processes = [ProcessInput(f"P{i+1}", random.randint(0, n), random.randint(1, 15), random.randint(1, 5)) for i in range(n)]
        self.processes.sort(key=lambda p: p.arrival_time)
        self._on_config_change()

    def _load_preset(self, name):
        if name in PRESETS:
            self.processes = list(PRESETS[name])
            self._on_config_change()

    def _export_csv(self):
        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV", "*.csv")])
        if not path:
            return
        with open(path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["Process", "Arrival", "Burst", "Priority", "Finish", "Wait", "TAT", "Response"])
            for m in self.result.metrics:
                p = next(p for p in self.processes if p.id == m.id)
                w.writerow([m.id, p.arrival_time, p.burst_time, p.priority, m.completion_time, m.waiting_time, m.turnaround_time, m.response_time])

    def _add_process(self):
        pid = f"P{len(self.processes) + 1}"
        self.processes.append(ProcessInput(pid, self.new_arrival.get(), self.new_burst.get(), self.new_priority.get()))
        self.new_arrival.set(self.new_arrival.get() + 1)
        self._on_config_change()

    def _remove_process(self, pid):
        self.processes = [p for p in self.processes if p.id != pid]
        self._on_config_change()

    # --- UI Refresh ---
    def _refresh_quantum_controls(self, algo):
        for w in self.quantum_frame.winfo_children():
            w.destroy()
        if algo == "RR":
            ctk.CTkLabel(self.quantum_frame, text="Time Quantum", font=ctk.CTkFont(size=10), text_color=TEXT_DIM).pack(anchor="w")
            ctk.CTkEntry(self.quantum_frame, textvariable=self.rr_quantum, width=255, fg_color=BG_INPUT, border_color=BORDER).pack(pady=4)
        elif algo == "MLFQ":
            row = ctk.CTkFrame(self.quantum_frame, fg_color="transparent")
            row.pack(fill="x")
            for label, var in [("Q0 Quantum", self.q0_quantum), ("Q1 Quantum", self.q1_quantum)]:
                col = ctk.CTkFrame(row, fg_color="transparent")
                col.pack(side="left", expand=True, fill="x", padx=(0, 4))
                ctk.CTkLabel(col, text=label, font=ctk.CTkFont(size=10), text_color=TEXT_DIM).pack(anchor="w")
                ctk.CTkEntry(col, textvariable=var, width=120, fg_color=BG_INPUT, border_color=BORDER).pack(pady=4)

    def _refresh_info(self, algo):
        info = ALGORITHM_INFO[algo]
        self.info_name_lbl.configure(text=info["name"])
        self.info_type_lbl.configure(text=info["type"])
        self.info_desc_lbl.configure(text=info["desc"])

    def _refresh_process_list(self):
        for w in self.process_list_frame.winfo_children():
            w.destroy()
        show_pri = self._show_priority()
        hdr = ctk.CTkFrame(self.process_list_frame, fg_color="transparent")
        hdr.pack(fill="x")
        for txt, w in [("ID", 40), ("ARR", 45), ("BRST", 45)]:
            ctk.CTkLabel(hdr, text=txt, font=ctk.CTkFont(size=8, weight="bold"), text_color=TEXT_DIM, width=w).pack(side="left")
        if show_pri:
            ctk.CTkLabel(hdr, text="PRI", font=ctk.CTkFont(size=8, weight="bold"), text_color=TEXT_DIM, width=45).pack(side="left")
        for i, p in enumerate(self.processes):
            row = ctk.CTkFrame(self.process_list_frame, fg_color=BG_INPUT, corner_radius=4, height=28)
            row.pack(fill="x", pady=1)
            row.pack_propagate(False)
            color = COLORS[i % len(COLORS)]
            ctk.CTkLabel(row, text=p.id, font=ctk.CTkFont(size=11, weight="bold"), text_color=color, width=40).pack(side="left", padx=2)
            ctk.CTkLabel(row, text=str(p.arrival_time), font=ctk.CTkFont(size=11), text_color=TEXT_MID, width=45).pack(side="left")
            ctk.CTkLabel(row, text=str(p.burst_time), font=ctk.CTkFont(size=11), text_color=TEXT_MID, width=45).pack(side="left")
            if show_pri:
                ctk.CTkLabel(row, text=str(p.priority), font=ctk.CTkFont(size=11), text_color=TEXT_MID, width=45).pack(side="left")
            if len(self.processes) > 1:
                ctk.CTkButton(row, text="✕", width=24, height=24, fg_color="#3F3F46", hover_color="#EF4444", font=ctk.CTkFont(size=10), command=lambda pid=p.id: self._remove_process(pid)).pack(side="right", padx=4)

    def _refresh_add_form(self):
        for w in self.add_form.winfo_children():
            w.destroy()
        show_pri = self._show_priority()
        row = ctk.CTkFrame(self.add_form, fg_color=BG_INPUT, corner_radius=4)
        row.pack(fill="x", pady=(4, 0))
        ctk.CTkLabel(row, text="NEW", font=ctk.CTkFont(size=8, weight="bold"), text_color=TEXT_DIM, width=40).pack(side="left", padx=2)
        ctk.CTkEntry(row, textvariable=self.new_arrival, width=42, fg_color="black", border_color=BORDER, font=ctk.CTkFont(size=11)).pack(side="left", padx=2)
        ctk.CTkEntry(row, textvariable=self.new_burst, width=42, fg_color="black", border_color=BORDER, font=ctk.CTkFont(size=11)).pack(side="left", padx=2)
        if show_pri:
            ctk.CTkEntry(row, textvariable=self.new_priority, width=42, fg_color="black", border_color=BORDER, font=ctk.CTkFont(size=11)).pack(side="left", padx=2)
        ctk.CTkButton(self.add_form, text="+ Add Process", fg_color="transparent", border_width=2, border_color=BORDER, text_color=TEXT_DIM, hover_color=BG_INPUT, height=28, command=self._add_process).pack(fill="x", pady=(4, 0))

    def _refresh_stats(self):
        r = self.result
        self.avg_wt_label.configure(text=f"{r.avg_waiting_time:.2f}")
        self.avg_tat_label.configure(text=f"{r.avg_turnaround_time:.2f}")
        self.avg_rt_label.configure(text=f"{r.avg_response_time:.2f}")
        self.cpu_util_label.configure(text=f"{r.cpu_utilization:.0f}%")
        self.throughput_lbl.configure(text=f"Throughput: {r.throughput:.3f}/ms")
        self.ctx_lbl.configure(text=f"Ctx Switches: {r.context_switches}")

    def _refresh_gantt(self):
        ax = self.gantt_ax
        ax.clear()
        ax.set_facecolor("#000000")
        if not self.result.execution_log:
            ax.text(0.5, 0.5, "No execution data", ha="center", va="center", color=TEXT_DIM, fontsize=10)
            self.gantt_canvas.draw()
            return
        colors_map = {p.id: COLORS[i % len(COLORS)] for i, p in enumerate(self.processes)}
        colors_map["IDLE"] = "#222222"
        for block in self.result.execution_log:
            dur = block.end_time - block.start_time
            c = colors_map.get(block.process_id, "#555")
            past = block.end_time <= self.current_tick
            active = block.start_time <= self.current_tick < block.end_time
            future = block.start_time > self.current_tick
            alpha = 0.9 if past else (1.0 if active else 0.15)
            if block.process_id == "IDLE":
                alpha = 0.2 if not future else 0.05
            ec = BLUE if active and block.process_id != "IDLE" else "#000"
            lw = 2 if active and block.process_id != "IDLE" else 0.5
            ax.barh(0, dur, left=block.start_time, height=0.6, color=c, alpha=alpha, edgecolor=ec, linewidth=lw)
            if block.process_id != "IDLE" and dur >= 1 and not future:
                ax.text(block.start_time + dur / 2, 0, f"{block.process_id}\n{block.start_time}-{block.end_time}", ha="center", va="center", fontsize=7, color="white", fontweight="bold", alpha=alpha)
        # Cursor line
        if self.total_time > 0:
            ax.axvline(x=self.current_tick, color=BLUE, linewidth=2, alpha=0.8)
        ax.set_yticks([])
        ax.set_xlabel("Time (ms)", fontsize=7, color=TEXT_DIM)
        ax.tick_params(axis="x", colors=TEXT_DIM, labelsize=7)
        ax.spines[:].set_visible(False)
        self.gantt_fig.tight_layout(pad=0.5)
        self.gantt_canvas.draw()

    def _refresh_state_display(self):
        for w in self.state_frame.winfo_children():
            w.destroy()
        for w in self.ready_queue_frame.winfo_children():
            w.destroy()
        if not self.result.execution_log:
            return
        st = get_state_at_tick(self.current_tick, self.processes, self.result.execution_log)
        colors_map = {p.id: COLORS[i % len(COLORS)] for i, p in enumerate(self.processes)}
        # State indicators in gantt card
        sf = self.state_frame
        ctk.CTkLabel(sf, text=f"State @t={self.current_tick}:", font=ctk.CTkFont(size=9, weight="bold"), text_color=TEXT_DIM).pack(side="left", padx=(0, 6))
        if st["running"]:
            f = ctk.CTkFrame(sf, fg_color=colors_map.get(st["running"], BLUE), corner_radius=10)
            f.pack(side="left", padx=2)
            ctk.CTkLabel(f, text=f" ● Running: {st['running']} ", font=ctk.CTkFont(size=9, weight="bold"), text_color="white").pack(padx=4, pady=1)
        if st["ready"]:
            f = ctk.CTkFrame(sf, fg_color="#2A2000", corner_radius=10)
            f.pack(side="left", padx=2)
            ctk.CTkLabel(f, text=f" ⏳ Ready: {', '.join(st['ready'])} ", font=ctk.CTkFont(size=9, weight="bold"), text_color="#FBBF24").pack(padx=4, pady=1)
        if st["completed"]:
            f = ctk.CTkFrame(sf, fg_color="#0A2A0A", corner_radius=10)
            f.pack(side="left", padx=2)
            ctk.CTkLabel(f, text=f" ✓ Done: {', '.join(st['completed'])} ", font=ctk.CTkFont(size=9, weight="bold"), text_color="#34D399").pack(padx=4, pady=1)
        # Ready queue visualization
        rq = self.ready_queue_frame
        ctk.CTkLabel(rq, text="READY QUEUE:", font=ctk.CTkFont(size=8, weight="bold"), text_color=TEXT_DIM).pack(side="left", padx=(4, 8))
        if st["ready"]:
            for pid in st["ready"]:
                c = colors_map.get(pid, "#555")
                chip = ctk.CTkFrame(rq, fg_color=c, corner_radius=6, width=40, height=24)
                chip.pack(side="left", padx=2)
                chip.pack_propagate(False)
                ctk.CTkLabel(chip, text=pid, font=ctk.CTkFont(size=10, weight="bold"), text_color="white").pack(expand=True)
                ctk.CTkLabel(rq, text="→", font=ctk.CTkFont(size=10), text_color=TEXT_DIM).pack(side="left")
            # Remove last arrow
            children = rq.winfo_children()
            if children and isinstance(children[-1], ctk.CTkLabel):
                children[-1].destroy()
        else:
            ctk.CTkLabel(rq, text="(empty)", font=ctk.CTkFont(size=9), text_color="#3F3F46").pack(side="left")

    def _refresh_table(self):
        for w in self.table_frame.winfo_children():
            w.destroy()
        show_pri = self._show_priority()
        colors_map = {p.id: COLORS[i % len(COLORS)] for i, p in enumerate(self.processes)}
        headers = ["Process", "Arrival", "Burst"]
        if show_pri:
            headers.append("Priority")
        headers += ["Finish", "Wait", "TAT", "Response"]
        hdr = ctk.CTkFrame(self.table_frame, fg_color=BG_INPUT, corner_radius=4, height=26)
        hdr.pack(fill="x", pady=(0, 2))
        hdr.pack_propagate(False)
        for h in headers:
            ctk.CTkLabel(hdr, text=h, font=ctk.CTkFont(size=8, weight="bold"), text_color=TEXT_DIM, width=70).pack(side="left", padx=2)
        for m in self.result.metrics:
            p = next((p for p in self.processes if p.id == m.id), None)
            if not p:
                continue
            row = ctk.CTkFrame(self.table_frame, fg_color="transparent", height=26)
            row.pack(fill="x", pady=1)
            row.pack_propagate(False)
            vals = [(m.id, colors_map.get(m.id, "white")), (str(p.arrival_time), TEXT_MID), (str(p.burst_time), TEXT_MID)]
            if show_pri:
                vals.append((str(p.priority), TEXT_MID))
            vals += [(str(m.completion_time), TEXT_MID), (str(m.waiting_time), TEXT_DIM), (str(m.turnaround_time), "white"), (str(m.response_time), "#60A5FA")]
            for txt, color in vals:
                wt = "bold" if color in ("white", "#60A5FA") or color in COLORS else "normal"
                ctk.CTkLabel(row, text=txt, font=ctk.CTkFont(size=11, weight=wt), text_color=color, width=70).pack(side="left", padx=2)

    def _refresh_comparison(self):
        ax = self.comp_ax
        ax.clear()
        ax.set_facecolor(BG_CARD)
        data = []
        for algo in ALGORITHMS:
            res = run_simulation(self.processes, algo, self.rr_quantum.get(), self.q0_quantum.get(), self.q1_quantum.get())
            data.append({"name": algo, "tat": round(res.avg_turnaround_time, 2), "wt": round(res.avg_waiting_time, 2)})
        x = np.arange(len(data))
        w = 0.35
        ax.bar(x - w/2, [d["tat"] for d in data], w, label="Avg TAT", color="#3B82F6", alpha=0.85)
        ax.bar(x + w/2, [d["wt"] for d in data], w, label="Avg WT", color="#6366F1", alpha=0.85)
        ax.set_xticks(x)
        ax.set_xticklabels([d["name"] for d in data], fontsize=7, color=TEXT_DIM)
        ax.tick_params(axis="y", colors=TEXT_DIM, labelsize=7)
        ax.legend(fontsize=7, loc="upper right", facecolor=BG_INPUT, edgecolor=BORDER, labelcolor=TEXT_MID)
        ax.spines[:].set_visible(False)
        ax.grid(axis="y", color=BORDER, alpha=0.3)
        self.comp_fig.tight_layout(pad=0.5)
        self.comp_canvas.draw()


if __name__ == "__main__":
    app = CPUSimApp()
    app.mainloop()
